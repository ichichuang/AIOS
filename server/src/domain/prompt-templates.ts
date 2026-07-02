import type { AiosResource, UsagePrompt } from "./types.js";

function pathLine(resource: AiosResource): string {
  const paths = resource.paths.length > 0 ? resource.paths.join(", ") : resource.path ?? "n/a";
  return `Relevant local path(s): ${paths}`;
}

export function buildUsagePrompts(resource: AiosResource): UsagePrompt[] {
  if (resource.capabilityType === "mcp-server") {
    return [
      {
        target: "codex",
        title: "Codex MCP safe-use prompt",
        prompt: `Inspect this MCP configuration as metadata only. Do not start the MCP server, do not run MCP tools, do not print env values, and preserve local AIOS safety boundaries. ${pathLine(resource)}`
      },
      {
        target: "claude",
        title: "Claude MCP safe-use prompt",
        prompt: `Review this MCP server entry as read-only metadata. Use env var names only, never values, and do not execute the configured command. ${pathLine(resource)}`
      }
    ];
  }

  if (resource.toolType === "project-local") {
    return [
      {
        target: "codex",
        title: "Codex project-local skill prompt",
        prompt: `Use this project-local skill pack only for the target project. Read the SKILL.md for this task, do not copy it into global skill entrypoints, and inspect git state before any project write. ${pathLine(resource)}`
      },
      {
        target: "claude",
        title: "Claude project-local skill prompt",
        prompt: `Use this project-local skill pack only in its owning project. Do not promote it to global skills and do not modify shared AIOS skill sources. ${pathLine(resource)}`
      }
    ];
  }

  if (resource.name.includes("custom-skill-router")) {
    return [
      {
        target: "codex",
        title: "Codex custom-skill-router prompt",
        prompt: `Use $custom-skill-router to find a low-frequency or project-specific skill for this task. Read only the selected SKILL.md and do not restore the full 68/69 global baseline. ${pathLine(resource)}`
      },
      {
        target: "claude",
        title: "Claude custom-skill-router prompt",
        prompt: `Use the custom skill registry as a read-only routing aid. Select one relevant skill, read it for this task, and keep global entrypoints unchanged. ${pathLine(resource)}`
      }
    ];
  }

  if (resource.capabilityType === "validator") {
    return [
      {
        target: "codex",
        title: "Codex read-only validator prompt",
        prompt: `Run this validator for observation only. If it reports only missing deleted Codex automation TOML scan targets, classify that as a known WARN and do not remediate. ${pathLine(resource)}`
      },
      {
        target: "claude",
        title: "Claude validator review prompt",
        prompt: `Interpret this local AIOS validator output without changing global skill entrypoints or policy files. ${pathLine(resource)}`
      }
    ];
  }

  return [
    {
      target: "codex",
      title: "Codex read-only audit prompt",
      prompt: `Inspect this AIOS resource read-only. Summarize purpose, risk, and when to use it. Do not modify global AIOS, Codex, Claude, Agents, MCP, auth, provider, or env configuration. ${pathLine(resource)}`
    },
    {
      target: "claude",
      title: "Claude read-only audit prompt",
      prompt: `Review this AIOS resource as local read-only evidence. Summarize usage and risk without changing global entrypoints or reading secrets. ${pathLine(resource)}`
    }
  ];
}
