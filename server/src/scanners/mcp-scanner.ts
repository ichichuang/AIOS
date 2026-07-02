import path from "node:path";
import { CODEX_CONFIG_PATH } from "../domain/path-policy.js";
import { buildUsagePrompts } from "../domain/prompt-templates.js";
import { riskFromMcpFlags } from "../domain/resource-classifier.js";
import { mcpMetadataSafety } from "../domain/safety-policy.js";
import { tokenPressureForText } from "../domain/token-estimator.js";
import type { AiosResource, McpServerRecord } from "../domain/types.js";
import { readTextIfExists } from "../utils/fs-safe.js";

interface MutableMcpRecord {
  name: string;
  command: string;
  remoteHost?: string;
  args: string[];
  envVarNames: Set<string>;
  transport: "stdio" | "http" | "sse" | "unknown";
}

function stripInlineComment(line: string): string {
  let quote: string | null = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "\"" || char === "'") && line[index - 1] !== "\\") {
      quote = quote === char ? null : quote ?? char;
    }
    if (char === "#" && !quote) return line.slice(0, index);
  }
  return line;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseArray(value: string): string[] {
  const body = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  const matches = body.match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|[^,\s]+/g) ?? [];
  return matches.map((item) => unquote(item.replace(/,$/, ""))).filter(Boolean);
}

function parseInlineTableKeys(value: string): string[] {
  const body = value.trim().replace(/^\{/, "").replace(/\}$/, "");
  return body
    .split(",")
    .map((part) => part.split("=")[0]?.trim())
    .filter((key): key is string => Boolean(key))
    .map(unquote);
}

function redactArg(arg: string): string {
  const lower = arg.toLowerCase();
  const sensitiveWords = ["token", "secret", "password", "credential", "cookie", "apikey", "api-key", "auth", "bearer"];
  if (sensitiveWords.some((word) => lower.includes(word))) {
    const [flag] = arg.split("=", 1);
    return arg.includes("=") ? `${flag}=[redacted]` : "[redacted]";
  }
  return arg;
}

function normalizeCommand(command: string): string {
  if (!command) return "unknown";
  return command.includes("/") ? path.basename(command) : command;
}

function hostnameFromUrl(value: string): string | undefined {
  try {
    return new URL(unquote(value)).hostname || undefined;
  } catch {
    return undefined;
  }
}

function detectTransport(record: MutableMcpRecord, rawArgs: string[]): "stdio" | "http" | "sse" | "unknown" {
  if (record.transport !== "unknown") return record.transport;
  if (record.remoteHost) return "http";
  const joined = [record.command, ...rawArgs].join(" ").toLowerCase();
  if (joined.includes("sse")) return "sse";
  if (joined.includes("http://") || joined.includes("https://")) return "http";
  if (record.command) return "stdio";
  return "unknown";
}

function localRemoteRisk(command: string, args: string[], usesNpx: boolean, remoteHost?: string): McpServerRecord["localRemoteRisk"] {
  if (remoteHost) return "remote";
  const joined = [command, ...args].join(" ").toLowerCase();
  if (joined.includes("https://") || joined.includes("http://")) return "remote";
  if (usesNpx) return "possible-npx-fetch";
  if (command.startsWith("/") || ["node", "serena", "python", "python3"].includes(command)) return "local";
  return command ? "unknown" : "unknown";
}

export async function scanMcpServers(): Promise<{ mcpServers: McpServerRecord[]; resources: AiosResource[] }> {
  const text = await readTextIfExists(CODEX_CONFIG_PATH, 512 * 1024);
  if (!text) return { mcpServers: [], resources: [] };

  const records = new Map<string, MutableMcpRecord>();
  let currentServer: string | null = null;
  let currentEnvServer: string | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripInlineComment(rawLine).trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[mcp_servers\.("?[^".\]]+"?)(?:\.(env))?\]$/);
    if (sectionMatch) {
      const name = unquote(sectionMatch[1] ?? "");
      if (!records.has(name)) {
        records.set(name, { name, command: "", args: [], envVarNames: new Set(), transport: "unknown" });
      }
      currentServer = sectionMatch[2] ? null : name;
      currentEnvServer = sectionMatch[2] ? name : null;
      continue;
    }

    const keyValue = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!keyValue) continue;
    const [, key, rawValue] = keyValue;

    if (currentEnvServer) {
      records.get(currentEnvServer)?.envVarNames.add(key);
      continue;
    }

    if (!currentServer) continue;
    const record = records.get(currentServer);
    if (!record) continue;

    if (key === "command") record.command = unquote(rawValue);
    if (key === "url" || key === "endpoint") record.remoteHost = hostnameFromUrl(rawValue);
    if (key === "args") record.args = parseArray(rawValue).map(redactArg);
    if (key === "transport" || key === "type") {
      const value = unquote(rawValue).toLowerCase();
      record.transport = value === "http" || value === "sse" || value === "stdio" ? value : "unknown";
    }
    if (key === "env" && rawValue.trim().startsWith("{")) {
      for (const envKey of parseInlineTableKeys(rawValue)) record.envVarNames.add(envKey);
    }
  }

  const mcpServers: McpServerRecord[] = [...records.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((record) => {
      const commandName = record.command ? normalizeCommand(record.command) : record.remoteHost ?? "unknown";
      const usesNpx = commandName === "npx" || record.args.some((arg) => arg === "npx");
      const usesAtLatest = record.command.includes("@latest") || record.args.some((arg) => arg.includes("@latest"));
      const envVarNames = [...record.envVarNames].sort((a, b) => a.localeCompare(b));
      const risk = riskFromMcpFlags(usesAtLatest, usesNpx, envVarNames.length > 0);
      return {
        name: record.name,
        command: commandName,
        args: record.args,
        envVarNames,
        transport: detectTransport(record, record.args),
        usesNpx,
        usesAtLatest,
        credentialRequired: envVarNames.length > 0,
        localRemoteRisk: localRemoteRisk(record.command, record.args, usesNpx, record.remoteHost),
        risk,
        sourcePath: CODEX_CONFIG_PATH
      };
    });

  const resources = mcpServers.map((server) => {
    const description = `Codex MCP metadata for ${server.name}. Command=${server.command}; transport=${server.transport}; env names=${server.envVarNames.length}.`;
    const base: AiosResource = {
      id: `mcp:server:${server.name}`,
      name: server.name,
      toolType: "mcp",
      capabilityType: "mcp-server",
      status: "available",
      risk: server.risk,
      path: CODEX_CONFIG_PATH,
      paths: [CODEX_CONFIG_PATH],
      description,
      safetyProfile: mcpMetadataSafety(server.usesAtLatest ? ["Uses @latest; pin/cache policy should be decided separately."] : []),
      tokenPressure: tokenPressureForText(description, "MCP metadata summary."),
      prompts: [],
      metadata: { server }
    };
    return { ...base, prompts: buildUsagePrompts(base) };
  });

  return { mcpServers, resources };
}
