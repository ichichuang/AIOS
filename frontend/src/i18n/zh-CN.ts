import type { AiosResource, BaselineSummary, CapabilityType, McpServerRecord, ResourceStatus, RiskLevel, ToolType } from "../types/inventory";

export const zhCN = {
  app: {
    title: "AIOS 控制中心",
    subtitle: "本地只读清单",
    readOnly: "只读",
    localOnly: "本地模式",
    loadingTitle: "正在读取本地快照",
    loadingBody: "仅从仓库内置清单加载，不连接外部服务。",
    errorTitle: "清单加载失败",
    generatedAt: "快照时间",
    aiosRoot: "AIOS 根目录",
    appSource: "应用源码",
    commandPlaceholder: "搜索资源、路径、风险或中文说明",
    commandLabel: "资源搜索",
    activeModule: "当前模块",
    selected: "已选择",
    shown: "项可见",
    total: "总计",
    noPath: "未记录路径",
    emptyTitle: "没有匹配资源",
    emptyBody: "调整模块或搜索条件后再查看。",
    inspectorEmptyTitle: "选择资源查看详情",
    inspectorEmpty: "此面板仅展示本地清单元数据、路径、安全画像和可复制提示词。",
    sourceSnapshot: "来源快照",
    preservedName: "原始技术名",
    pathPreview: "路径预览",
    moduleOverview: "模块概览",
    resourceList: "资源清单",
    detailPanel: "资源检查器",
    reportsTimeline: "报告时间线",
    copyPrompt: "复制提示词",
    copied: "已复制",
    copy: "复制",
    promptBodyEnglish: "执行提示词保留英文以保证可靠性。",
    countUnit: "项",
    approxTokens: "约 {count} tokens",
    notAvailable: "不适用",
    safetyState: "只读边界正常",
    viewAction: "查看",
    copyCodexCall: "复制 Codex 调用",
    copyClaudeCall: "复制 Claude 调用"
  },
  views: {
    dashboard: "总览",
    skills: "技能",
    mcp: "MCP",
    scripts: "脚本",
    reports: "报告",
    "project-packs": "项目包",
    policies: "策略",
    validators: "验证器",
    legacy: "旧入口"
  },
  moduleSummaries: {
    dashboard: "汇总本地 AIOS 资源、基线守卫、只读边界与风险分布。",
    skills: "查看 Codex、Agents、Claude 与共享技能入口，保持原始技能名不变。",
    mcp: "按本地、远程、npx 拉取和凭据需求检查 MCP 元数据。",
    scripts: "仅展示脚本与验证器元数据；执行需要显式命令。",
    reports: "按时间线查看本地报告摘要，不写入全局状态。",
    "project-packs": "展示项目本地技能包与资源包，避免复制到全局入口。",
    policies: "展示策略守卫和哈希信息，不读取或修改策略内容。",
    validators: "展示观察型验证器状态与已知 WARN 解释。",
    legacy: "保留旧提示入口的可见性，但不恢复旧全局基线。"
  },
  toolTypes: {
    "aios-root": "AIOS 根",
    codex: "Codex",
    agents: "Agents",
    claude: "Claude",
    hermes: "Hermes",
    mcp: "MCP",
    plugin: "插件",
    script: "脚本",
    validator: "验证器",
    "project-local": "项目本地",
    report: "报告",
    automation: "自动化",
    legacy: "旧入口"
  } satisfies Record<ToolType, string>,
  capabilityTypes: {
    skill: "技能",
    "mcp-server": "MCP 服务",
    "mcp-client": "MCP 客户端",
    plugin: "插件",
    script: "脚本",
    validator: "验证器",
    report: "报告",
    "usage-prompt": "使用提示",
    "project-pack": "项目包",
    "runtime-view": "运行时视图",
    registry: "注册表",
    policy: "策略",
    provider: "供应商"
  } satisfies Record<CapabilityType, string>,
  statuses: {
    active: "启用",
    available: "可用",
    disabled: "停用",
    missing: "缺失",
    ok: "正常",
    warn: "警告",
    unknown: "未知"
  } satisfies Record<ResourceStatus, string>,
  risks: {
    low: "低风险",
    medium: "中风险",
    high: "高风险"
  } satisfies Record<RiskLevel, string>,
  riskDescriptions: {
    low: "只读元数据或低影响资源。",
    medium: "需要人工确认边界、执行方式或凭据占位。",
    high: "存在高影响执行、写入或敏感暴露风险。"
  } satisfies Record<RiskLevel, string>,
  booleans: {
    yes: "是",
    no: "否"
  },
  safetyFields: {
    readOnly: "只读",
    writesGlobalState: "写入全局状态",
    secretExposureRisk: "秘密暴露风险",
    executionRisk: "执行风险",
    notes: "安全说明"
  },
  tokenFields: {
    title: "Token 压力",
    estimatedTokens: "估算 token",
    level: "压力等级",
    reason: "原因"
  },
  mcp: {
    title: "MCP 清单",
    configured: "已配置",
    command: "命令",
    transport: "传输",
    source: "来源",
    groups: {
      local: "本地服务",
      remote: "远程连接",
      npx: "npx 拉取风险",
      credential: "需要凭据",
      unknown: "未判定"
    },
    groupSummaries: {
      local: "命令来自本地路径或已安装运行时。",
      remote: "连接形态可能依赖远程端点。",
      npx: "启动时可能拉取包，需后续固定版本或缓存策略。",
      credential: "仅保留环境变量名，不展示变量值。",
      unknown: "元数据不足，需要人工复核。"
    },
    flags: {
      usesNpx: "使用 npx",
      usesAtLatest: "包含 @latest",
      credentialRequired: "需要凭据变量"
    },
    localRemoteRisk: {
      local: "本地",
      "possible-npx-fetch": "可能拉取",
      remote: "远程",
      unknown: "未知"
    } satisfies Record<McpServerRecord["localRemoteRisk"], string>
  },
  dashboardMetrics: {
    policyHash: "策略哈希",
    canonicalSkills: "规范技能",
    codexActive: "Codex 活跃",
    agentsActive: "Agents 活跃",
    claudeSkills: "Claude 技能",
    router: "路由器",
    codexAutomations: "Codex 自动化",
    guardTarget: "守卫目标未变",
    policyMissing: "策略文件缺失",
    topLevelReserved: "顶层含保留项",
    globalEntrypoints: "全局入口",
    safeEntrypointMetadata: "安全入口元数据",
    customSkillRouter: "custom-skill-router",
    mustNotRecreate: "应用不得重建"
  },
  skillPressure: {
    title: "技能压力",
    summary: "按技能和运行时视图的 token 压力分布。",
    low: "低",
    medium: "中",
    high: "高"
  },
  safetyBoundaries: {
    title: "安全边界",
    knownWarnings: "已知 WARN",
    items: [
      "/Users/cc/.ai 在 Phase 1 中作为只读数据源，只有本应用仓库可写。",
      "不得修改 active-global-skills-policy.json。",
      "不得修改全局技能入口。",
      "不得恢复旧的 68/69 全局技能基线。",
      "不得启用 full-global skills mode。",
      "不得重建 Codex 自动化。",
      "wxmp 属于领域示例，不是 AIOS 根治理。"
    ]
  },
  validators: {
    title: "观察型验证器",
    validateSkills: "validate-skills.mjs：仅当原因是已删除 Codex 自动化 TOML 扫描目标缺失时，按已知 WARN 处理。",
    doctor: "ai-local-doctor.mjs：本地 AIOS 体检，仅观察并报告状态。"
  },
  warnings: {
    deletedAutomationTargets: "validate-skills.mjs 若仅因已删除的 Codex 自动化 TOML 扫描目标缺失而退出 1，按已知 WARN 处理，不在本应用中修复。",
    codexSystemReserved: "Codex .system 是客户端保留内容，不视为共享 AIOS 技能漂移。",
    wxmpDomainSpecific: "微信小程序/wxmp 是领域包示例，不是 AIOS 根治理。"
  },
  skillNames: {
    "aios-tool-router": "AIOS 工具路由",
    "architecture-browser-master": "架构浏览",
    "aspnet-core": "ASP.NET Core",
    "chatgpt-apps": "ChatGPT Apps",
    "cli-creator": "CLI 创建",
    "cloudflare-deploy": "Cloudflare 部署",
    "codex-ast-grep-codemod": "结构化代码改写",
    "codex-context7-docs-first": "Context7 文档优先",
    "codex-figma-to-code": "Figma 转代码",
    "codex-frontend-ui-debug": "前端 UI 调试",
    "codex-large-repo-understanding": "大型仓库理解",
    "codex-repo-health-scan": "仓库健康扫描",
    "codex-serena-symbolic-navigation": "Serena 符号导航",
    "codex-visual-regression-playwright": "视觉回归验证",
    "chrome-devtools": "Chrome 调试工具",
    context7: "Context7 文档查询",
    "custom-skill-registry.json": "自定义技能注册表",
    "custom-skill-router": "自定义技能路由",
    "design-taste-frontend": "前端设计品味",
    "desktop-tauri-guard": "桌面 Tauri 守卫",
    "develop-web-game": "网页游戏开发",
    doc: "文档处理",
    figma: "Figma",
    "figma-code-connect-components": "Figma Code Connect 组件",
    "figma-create-design-system-rules": "Figma 设计系统规则",
    "figma-create-new-file": "Figma 新文件",
    "figma-generate-design": "Figma 设计生成",
    "figma-generate-library": "Figma 组件库生成",
    "figma-implement-design": "Figma 设计实现",
    "figma-use": "Figma 使用",
    "find-skills": "技能查找",
    "frontend-skill": "前端体验构建",
    "gh-address-comments": "GitHub 评论处理",
    "gh-fix-ci": "GitHub CI 修复",
    "github-ops": "GitHub 操作",
    "huashu-nuwa": "华数女娲技能蒸馏",
    "interface-design": "界面设计",
    "jupyter-notebook": "Jupyter Notebook",
    linear: "Linear",
    "local-ai-approved-apply": "本地 AI 批准执行",
    "local-ai-governance-audit": "本地 AI 治理审计",
    "local-ai-upgrade-proposal": "本地 AI 升级提案",
    "netlify-deploy": "Netlify 部署",
    "notion-knowledge-capture": "Notion 知识采集",
    "notion-meeting-intelligence": "Notion 会议智能",
    "notion-research-documentation": "Notion 研究文档",
    "notion-spec-to-implementation": "Notion 规格实现",
    pdf: "PDF",
    playwright: "Playwright",
    node_repl: "Node 运行时桥接",
    openaiDeveloperDocs: "OpenAI 开发者文档",
    "playwright-interactive": "交互式 Playwright",
    "render-deploy": "Render 部署",
    repomix: "仓库打包",
    screenshot: "截图",
    "security-best-practices": "安全最佳实践",
    "security-ownership-map": "安全所有权地图",
    "security-threat-model": "安全威胁建模",
    sentry: "Sentry",
    slides: "幻灯片",
    sora: "Sora",
    speech: "语音",
    spreadsheet: "电子表格",
    summarize: "摘要",
    "task-orchestrator": "任务编排",
    serena: "Serena 符号导航",
    stitch: "Stitch 设计工具",
    "tavily-research": "Tavily 研究",
    "top-ui-frontend-framework": "顶级 UI 前端框架",
    transcribe: "转录",
    unocss: "UnoCSS",
    "vercel-deploy": "Vercel 部署",
    vite: "Vite",
    vue: "Vue",
    "vueuse-functions": "VueUse 函数",
    "web-design-guidelines": "Web 设计指南",
    "wechat-miniprogram-native-ui-frontend-framework": "微信小程序原生 UI 框架",
    "winui-app": "WinUI 应用",
    yeet: "发布本地变更"
  } as Record<string, string>,
  skillDescriptions: {
    "aios-tool-router": "为本地 AIOS 工具选择合适入口，避免跨边界调用。",
    "codex-context7-docs-first": "在涉及库、框架或 SDK 时优先查询官方或 Context7 文档。",
    "codex-frontend-ui-debug": "用浏览器证据定位前端布局、交互和视觉问题。",
    "codex-large-repo-understanding": "快速梳理大型仓库结构、边界和高信号文件。",
    "codex-repo-health-scan": "扫描依赖、脚本、配置和风险关键词形成仓库健康视图。",
    "codex-serena-symbolic-navigation": "通过 Serena 的符号能力定位代码声明和引用。",
    "custom-skill-router": "按需解析低频、归档、实验或项目本地技能，避免恢复完整全局基线。",
    "find-skills": "查找、解析或安装本地共享技能入口。",
    "frontend-skill": "用于构建有层次、克制、可浏览器验证的前端体验。",
    "local-ai-approved-apply": "执行已经明确批准的本地 AI 治理变更。",
    "local-ai-governance-audit": "只读审计本地 AI 治理状态并输出证据。",
    "local-ai-upgrade-proposal": "把治理审计结果转成可审批的升级提案。",
    playwright: "自动化浏览器以验证页面、交互和截图证据。",
    "playwright-interactive": "使用持久浏览器会话进行交互式前端验证。",
    repomix: "把仓库打包成可审阅上下文，便于大规模理解。",
    screenshot: "捕获桌面、应用或浏览器截图用于视觉检查。",
    "security-best-practices": "审查实际安全风险、边界和修复方案。",
    "task-orchestrator": "按复杂度、风险和技能适配度路由编码工作。",
    "top-ui-frontend-framework": "把公开设计系统、可访问性、性能和浏览器验证准则转成 UI 执行框架。",
    "github-ops": "处理 GitHub 仓库、Issue、PR 和相关操作。",
    vite: "Vite 前端开发与构建工具指导。",
    vue: "Vue 项目开发、组合式 API 和组件实践。",
    unocss: "UnoCSS 原子化样式配置与使用。",
    figma: "读取或生成 Figma 相关设计资产和协作内容。",
    pdf: "读取、生成或检查 PDF 文档。",
    spreadsheet: "处理电子表格数据和工作簿。",
    slides: "创建或编辑演示文稿。"
  } as Record<string, string>
};

export type ResourceUiGroup = "dashboard" | "skills" | "mcp" | "scripts" | "reports" | "project-packs" | "policies" | "validators" | "legacy";

export function formatSnapshotDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false
  }).format(new Date(value));
}

export function shortHash(hash: string | null): string {
  return hash ? `${hash.slice(0, 12)}...${hash.slice(-8)}` : "未记录";
}

export function formatAutomationState(state: BaselineSummary["codexAutomationDirectoryState"]): string {
  if (!state.exists) return "目录缺失";
  if (!state.isDirectory) return "非目录";
  return `${state.entryCount} 个条目`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export type ZhCopy = typeof zhCN;
