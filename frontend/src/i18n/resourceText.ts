import { zhCN, type ResourceUiGroup } from "./zh-CN";
import type { AiosResource, McpServerRecord, ValidatorSummary } from "../types/inventory";

export interface ResourceDisplay {
  zhName: string;
  technicalName: string;
  zhDescription: string;
  zhCategory: string;
  zhStatus: string;
  zhRisk: string;
  zhRiskDescription: string;
  zhCapability: string;
  zhToolType: string;
  uiGroup: ResourceUiGroup;
  moduleSummary: string;
  pathPreview: string;
}

export function getResourceUiGroup(resource: AiosResource): ResourceUiGroup {
  if (resource.toolType === "legacy") return "legacy";
  if (resource.capabilityType === "mcp-server" || resource.capabilityType === "mcp-client") return "mcp";
  if (resource.capabilityType === "skill" || resource.capabilityType === "runtime-view" || resource.capabilityType === "registry") return "skills";
  if (resource.capabilityType === "script") return "scripts";
  if (resource.capabilityType === "validator") return "validators";
  if (resource.capabilityType === "report") return "reports";
  if (resource.capabilityType === "project-pack") return "project-packs";
  if (resource.capabilityType === "policy") return "policies";
  if (resource.capabilityType === "usage-prompt") return "legacy";
  return "dashboard";
}

export function getPathPreview(resource: AiosResource): string {
  const path = resource.path ?? resource.paths[0];
  return path ?? zhCN.app.noPath;
}

export function getResourceDisplay(resource: AiosResource): ResourceDisplay {
  const uiGroup = getResourceUiGroup(resource);
  const zhToolType = zhCN.toolTypes[resource.toolType];
  const zhCapability = zhCN.capabilityTypes[resource.capabilityType];
  const zhName = resource.zhName ?? zhCN.skillNames[resource.name] ?? getFallbackResourceName(resource);

  return {
    zhName,
    technicalName: resource.name,
    zhDescription: resource.zhDescription ?? getResourceDescription(resource),
    zhCategory: resource.zhCategory ?? `${zhToolType} / ${zhCapability}`,
    zhStatus: resource.zhStatus ?? zhCN.statuses[resource.status],
    zhRisk: resource.zhRisk ?? zhCN.risks[resource.risk],
    zhRiskDescription: zhCN.riskDescriptions[resource.risk],
    zhCapability: resource.zhCapability ?? zhCapability,
    zhToolType: resource.zhToolType ?? zhToolType,
    uiGroup: (resource.uiGroup as ResourceUiGroup | undefined) ?? uiGroup,
    moduleSummary: resource.moduleSummary ?? zhCN.moduleSummaries[uiGroup],
    pathPreview: getPathPreview(resource)
  };
}

export function getFallbackResourceName(resource: AiosResource): string {
  if (resource.capabilityType === "policy") return "策略守卫";
  if (resource.capabilityType === "mcp-server") return "MCP 服务";
  if (resource.capabilityType === "mcp-client") return "MCP 客户端";
  if (resource.capabilityType === "report") return "本地报告";
  if (resource.capabilityType === "script") return "本地脚本";
  if (resource.capabilityType === "validator") return "观察验证器";
  if (resource.capabilityType === "project-pack") return "项目资源包";
  if (resource.capabilityType === "usage-prompt") return "执行提示";
  return zhCN.capabilityTypes[resource.capabilityType];
}

export function getResourceDescription(resource: AiosResource): string {
  const curated = zhCN.skillDescriptions[resource.name];
  if (curated) return curated;

  const description = resource.description.toLowerCase();
  if (description.includes("agents active skill entrypoint metadata")) {
    return "Agents 活跃技能入口元数据；入口扫描器不读取技能正文。";
  }
  if (description.includes("codex active skill entrypoint metadata")) {
    return "Codex 活跃技能入口元数据；入口扫描器不读取技能正文。";
  }
  if (description.includes("canonical skill metadata")) {
    return "来自 SKILLS_INDEX.json 的规范技能元数据。";
  }
  if (description.includes("policy") && description.includes("guard")) {
    return "策略文件哈希作为守卫记录，应用不得修改策略内容。";
  }
  if (description.includes("mcp metadata")) {
    return "MCP 元数据仅用于清单展示，扫描器不会启动或连接该服务。";
  }
  if (description.includes("project-local pack")) {
    return "项目本地资源包检测结果，边界限制在当前仓库。";
  }
  if (description.includes("report")) {
    return "本地报告摘要，仅用于状态推断和时间线展示。";
  }
  if (description.includes("script")) {
    return "脚本仅被清单化；执行需要单独的显式验证步骤。";
  }
  if (description.includes("prompt")) {
    return "执行提示词资源；复制后由用户显式使用，不在页面中自动执行。";
  }

  return `本地只读${zhCN.capabilityTypes[resource.capabilityType]}资源，归档于${zhCN.toolTypes[resource.toolType]}模块。`;
}

export function translateSafetyNote(note: string): string {
  const normalized = note.toLowerCase();
  if (normalized.includes("/users/cc/.ai is read-only")) return "/Users/cc/.ai 在 Phase 1 中作为只读数据源。";
  if (normalized.includes("canonical skill metadata")) return "规范技能元数据来自 SKILLS_INDEX.json。";
  if (normalized.includes("do not copy project-local")) return "不得把项目本地或归档技能复制到全局入口。";
  if (normalized.includes("do not modify codex")) return "不得修改 Codex、Claude、Agents、MCP、认证、供应商或环境配置。";
  if (normalized.includes("do not recreate codex automations")) return "不得重建 Codex 自动化。";
  if (normalized.includes("old 68/69")) return "不得恢复旧的 68/69 全局技能基线。";
  if (normalized.includes("entrypoint metadata only")) return "仅展示入口元数据。";
  if (normalized.includes("hash-only guard")) return "仅记录哈希守卫，不修改策略内容。";
  if (normalized.includes("mcp metadata only")) return "仅展示 MCP 元数据，扫描器不会启动或连接服务。";
  if (normalized.includes("only /users/cc/.ai/aios")) return "仅 /Users/cc/.ai/AIOS 是可写应用源码。";
  if (normalized.includes("only env var names")) return "仅保留环境变量名，不存储变量值。";
  if (normalized.includes("project-local pack")) return "项目本地包检测已限制边界。";
  if (normalized.includes("prompt only")) return "仅提示词文本，不自动执行。";
  if (normalized.includes("registry is read")) return "注册表仅作为元数据读取。";
  if (normalized.includes("report snippet")) return "报告片段仅用于状态推断。";
  if (normalized.includes("script is inventoried")) return "脚本仅清单化，执行需要单独显式验证。";
  if (normalized.includes("does not modify or copy")) return "扫描器不会修改或复制该技能包。";
  if (normalized.includes("does not modify shared skill")) return "扫描器不会修改共享技能源文件。";
  if (normalized.includes("uses @latest")) return "包含 @latest，后续需要单独决定固定版本或缓存策略。";
  if (normalized.includes("wxmp")) return "wxmp 属于领域示例，不作为 AIOS 根治理。";
  return "已记录一条只读安全说明，详情以本地清单元数据为准。";
}

export function translateTokenReason(reason: string): string {
  const normalized = reason.toLowerCase();
  if (normalized.includes("metadata")) return "元数据体量较小，适合直接查看。";
  if (normalized.includes("prompt")) return "提示词内容可能较长，复制前请确认目标上下文。";
  if (normalized.includes("skill")) return "技能说明可能增加上下文体量，建议按需打开。";
  if (normalized.includes("report")) return "报告摘要可能较长，建议在详情面板中按需查看。";
  return "根据资源类型和估算 token 量判定。";
}

export function translateKnownWarning(warning: string): string {
  const normalized = warning.toLowerCase();
  if (normalized.includes("validate-skills") && normalized.includes("automation")) return zhCN.warnings.deletedAutomationTargets;
  if (normalized.includes("codex .system")) return zhCN.warnings.codexSystemReserved;
  if (normalized.includes("wechat") || normalized.includes("wxmp")) return zhCN.warnings.wxmpDomainSpecific;
  return "已知警告：仅记录状态，不在本界面自动修复。";
}

export function translateValidatorSummary(validator: ValidatorSummary): string {
  if (validator.name.includes("validate-skills")) return zhCN.validators.validateSkills;
  if (validator.name.includes("ai-local-doctor")) return zhCN.validators.doctor;
  return "观察型验证器，仅在用户显式运行时输出结果。";
}

export function getMcpGroup(server: McpServerRecord): keyof typeof zhCN.mcp.groups {
  if (server.credentialRequired) return "credential";
  if (server.usesNpx || server.usesAtLatest || server.localRemoteRisk === "possible-npx-fetch") return "npx";
  if (server.localRemoteRisk === "remote" || server.transport === "http" || server.transport === "sse") return "remote";
  if (server.localRemoteRisk === "local") return "local";
  return "unknown";
}

export function getMcpRiskLabels(server: McpServerRecord): string[] {
  const labels: string[] = [zhCN.mcp.localRemoteRisk[server.localRemoteRisk]];
  if (server.usesNpx) labels.push(zhCN.mcp.flags.usesNpx);
  if (server.usesAtLatest) labels.push(zhCN.mcp.flags.usesAtLatest);
  if (server.credentialRequired) labels.push(zhCN.mcp.flags.credentialRequired);
  return labels;
}
