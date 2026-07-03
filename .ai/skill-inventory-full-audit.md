# AIOS Skill Inventory Full Audit

Generated: 2026-07-02T10:19:49.269Z
Scope: read-only metadata audit for /Users/cc/.ai/AIOS.

No full `SKILL.md` bodies, raw prompt bodies, secrets, credential material, env values, auth/session values, or provider configs are included. Safe metadata only. Global files were read-only.
Secret-like text redactions in safe metadata fields: 0.

## Executive Summary

- Total uppercase filesystem `SKILL.md` files found under /Users/cc/.ai: 114.
- Huashu family manifest count: 21; direct distilled examples: 20.
- Distilled/persona/perspective canonical manifest count: 20.
- The 20 direct examples are present in generated inventory as independent resources (20/20).
- Duplicate display group count in Skills view resources: 74.
- Most likely duplicate cause: runtime/source records are modeled as rows beside canonical identity records; dedupe happens in server skill resources, not in the frontend identity presentation model.
- Most likely `nvwa` gap: alias variants are generated from resource name/aliases only, while child examples rely on `huashu-nuwa` path segments and do not inherit parent `nvwa` aliases.

## Files Inspected Before Scanning

| Path | Purpose |
| --- | --- |
| `server/src/scanners/skill-discovery-scanner.ts` |filesystem discovery, registry expansion, dedupe, alias variant logic |
| `server/src/scanners/skill-scanner.ts` |index/registry/filesystem merge and active entrypoint resource model |
| `server/src/scanners/project-pack-scanner.ts` |project-local `.agents/skills` detection |
| `server/src/scanners/aios-root-scanner.ts` |generated inventory assembly |
| `server/src/domain/path-policy.ts` |roots, write boundary, skipped directory policy |
| `server/src/domain/types.ts` |resource schema and capability/status fields |
| `server/src/domain/prompt-templates.ts` |prompt metadata generation; raw prompts excluded from report |
| `server/src/utils/fs-safe.ts` |read helpers and symlink-following behavior for entrypoint listing |
| `frontend/src/lib/filtering.ts` |Skills view inclusion and search haystack |
| `frontend/src/lib/skillDiscoveryMetadata.ts` |source badges, metadata search terms, nuwa/nvwa variants |
| `frontend/src/lib/skillCapabilityClassifier.ts` |capability grouping/search text |
| `frontend/src/components/modules/SkillsModule.tsx` |Skills grouping behavior |
| `frontend/src/components/resources/CompactSkillRow.tsx` |row display/source badge behavior |
| `frontend/src/components/inspector/ResourceInspector.tsx` |inspector source metadata display |
| `frontend/public/aios-inventory.snapshot.json` |generated inventory data |
| `.ai/skill-coverage-audit.md` |prior audit evidence |

## Part A: Filesystem Manifest Discovery Audit

### Scan Limits And Counters

| Field | Value |
| --- | --- |
| root |/Users/cc/.ai |
| maxDirs |20000 |
| maxDepth |18 |
| maxManifestBytes |65536 |
| followSymlinks |false |
| visitedDirectoryCount |908 |
| skippedSymlinkCount |1658 |
| skippedDirectoryCount |13 |
| limitsHit |no |

### Exact Match Counts

| File pattern | Count | Canonical use |
| --- | --- | --- |
| `SKILL.md` |114 |canonical scanner evidence |
| `skill.md` |0 |diagnostic only |
| `*.skill.md` |0 |diagnostic only |
| `README.md` with skill-like parent |69 |diagnostic only |
| JSON/TOML/YAML skill metadata file |79 |diagnostic only |

### Explicit Root Counts

| Root | Exists as non-symlink dir | SKILL.md | skill.md | *.skill.md | Nested .agents/skills root |
| --- | --- | --- | --- | --- | --- |
| /Users/cc/.ai/skills |yes |0 |0 |0 |no |
| /Users/cc/.ai/skill-modules |yes |89 |0 |0 |no |
| /Users/cc/.ai/distilled-skills |no |0 |0 |0 |no |
| /Users/cc/.ai/generated-skills |no |0 |0 |0 |no |
| /Users/cc/.ai/skill-packs |no |0 |0 |0 |no |
| /Users/cc/.ai/archive |no |0 |0 |0 |no |
| /Users/cc/.ai/archives |no |0 |0 |0 |no |
| /Users/cc/.ai/90-archive |no |0 |0 |0 |no |
| /Users/cc/.ai/AIOS/.agents/skills |yes |2 |0 |0 |yes |

### Top-Level Category Counts For Canonical Manifests

| Top-level category | SKILL.md count |
| --- | --- |
| 07-knowledge-research |27 |
| backups |19 |
| 01-orchestration-meta |14 |
| 02-design-figma |9 |
| 03-ui-browser-automation |9 |
| 04-frameworks-platforms |9 |
| 05-github-deploy-ops |9 |
| 06-documents-media-data |9 |
| skills-backup |4 |
| 08-security |3 |
| AIOS |2 |

### Nested `.agents/skills` Roots

- `/Users/cc/.ai/AIOS/.agents/skills`

## Part B: `huashu-nuwa` / `huashu-nvwa` Family Audit

### Family Counts

| Metric | Count / Result |
| --- | --- |
| huashu family canonical manifest count |21 |
| direct child examples under `huashu-nuwa/examples/*/SKILL.md` |20 |
| direct examples present in generated inventory |20 / 20 |
| direct examples with own family aliases (`huashu`, `nuwa`, `nvwa`, `女娲`) |0 / 20 |
| `nuwa` search matches in Skills view |22 |
| `nvwa` search matches in Skills view |2 |
| `huashu` search matches in Skills view |22 |
| `persona` search matches in Skills view |1 |
| `perspective` search matches in Skills view |19 |

### Search Behavior

- `nuwa` matches 22 skill-view resources because manifest paths under `huashu-nuwa` are included in the haystack.
- `nvwa` matches 2 skill-view resources because variants are generated only from each resource name and own aliases, not from manifest path segments or parent family aliases.
- Child/example alias inheritance: missing or partial for direct examples.
- Missing-example diagnosis: The 20 direct example manifests are present in generated inventory as independent resources. They are not lost before inventory; the observed `nvwa` gap is search-alias inheritance, not inventory absence.

### Huashu Family Source Matrix

| Skill name | Dir basename | Category | Aliases | Tags | Capabilities | Relative path | Filesystem | SKILLS_INDEX | Registry | Codex | Agents | Claude | Inventory | Search `nuwa` | Search `nvwa` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| andrej-karpathy-perspective |andrej-karpathy-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/andrej-karpathy-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| anthony-fu-perspective |anthony-fu-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/anthony-fu-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| elon-musk-perspective |elon-musk-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/elon-musk-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| evan-you-perspective |evan-you-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/evan-you-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| feynman-perspective |feynman-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/feynman-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| ilya-sutskever-perspective |ilya-sutskever-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/ilya-sutskever-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| mrbeast-perspective |mrbeast-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/mrbeast-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| munger-perspective |munger-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/munger-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| naval-perspective |naval-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/naval-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| paul-graham-perspective |paul-graham-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/paul-graham-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| rich-harris-perspective |rich-harris-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/rich-harris-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| simon-willison-perspective |simon-willison-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/simon-willison-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| steve-jobs-perspective |steve-jobs-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/steve-jobs-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| sun-yuchen-perspective |sun-yuchen-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/sun-yuchen-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| taleb-perspective |taleb-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/taleb-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| teknium-perspective |teknium-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/teknium-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| trump-perspective |trump-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/trump-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| x-mastery-mentor |x-mastery-mentor | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/x-mastery-mentor/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| zhang-yiming-perspective |zhang-yiming-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/zhang-yiming-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| zhangxuefeng-perspective |zhangxuefeng-perspective | | | | |skill-modules/07-knowledge-research/huashu-nuwa/examples/zhangxuefeng-perspective/SKILL.md |yes |no |yes |no |no |no |yes |yes |no |
| huashu-nuwa |huashu-nuwa | | | | |skill-modules/07-knowledge-research/huashu-nuwa/SKILL.md |yes |yes |yes |no |no |yes |yes |yes |yes |

## Part C: Index And Registry Audit

### Registry Summary

| Metric | Value |
| --- | --- |
| registry generatedAt |2026-06-30T07:53:15.180Z |
| registryVersion | |
| skills[] entries |92 |
| unique names |92 |
| unique canonicalPath values |89 |
| unique skillMdPath values |92 |
| alias values total |94 |

### Registry `sourceTypes` Counts

| sourceType | Count |
| --- | --- |
| active-claude |72 |
| active-runtime |69 |
| canonical |69 |
| canonical-skill-md |69 |
| archived-agents |50 |
| archived-codex |50 |
| embedded-skill-md |20 |
| active-agents |19 |
| active-codex |19 |

### Registry Data Quality

| Issue | Count | Sample |
| --- | --- | --- |
| missingSkillMdPath |0 | |
| missingCanonicalPath |3 |design-taste-frontend -> ~/.claude/skills/design-taste-frontend/SKILL.md, interface-design -> ~/.claude/skills/interface-design/SKILL.md, web-design-guidelines -> ~/.claude/skills/web-design-guidelines/SKILL.md |
| missingAliases |77 |andrej-karpathy-perspective -> skill-modules/07-knowledge-research/huashu-nuwa/examples/andrej-karpathy-perspective/SKILL.md, anthony-fu-perspective -> skill-modules/07-knowledge-research/huashu-nuwa/examples/anthony-fu-perspective/SKILL.md, architecture-browser-master -> skill-modules/03-ui-browser-automation/architecture-browser-master/SKILL.md, aspnet-core -> skill-modules/04-frameworks-platforms/aspnet-core/SKILL.md, chatgpt-apps -> skill-modules/04-frameworks-platforms/chatgpt-apps/SKILL.md, cli-creator -> skill-modules/01-orchestration-meta/cli-creator/SKILL.md, cloudflare-deploy -> skill-modules/05-github-deploy-ops/cloudflare-deploy/SKILL.md, design-taste-frontend -> ~/.claude/skills/design-taste-frontend/SKILL.md, desktop-tauri-guard -> skill-modules/04-frameworks-platforms/desktop-tauri-guard/SKILL.md, develop-web-game -> skill-modules/03-ui-browser-automation/develop-web-game/SKILL.md, doc -> skill-modules/06-documents-media-data/doc/SKILL.md, elon-musk-perspective -> skill-modules/07-knowledge-research/huashu-nuwa/examples/elon-musk-perspective/SKILL.md, evan-you-perspective -> skill-modules/07-knowledge-research/huashu-nuwa/examples/evan-you-perspective/SKILL.md, feynman-perspective -> skill-modules/07-knowledge-research/huashu-nuwa/examples/feynman-perspective/SKILL.md, figma -> skill-modules/02-design-figma/figma/SKILL.md, figma-code-connect-components -> skill-modules/02-design-figma/figma-code-connect-components/SKILL.md, figma-create-design-system-rules -> skill-modules/02-design-figma/figma-create-design-system-rules/SKILL.md, figma-create-new-file -> skill-modules/02-design-figma/figma-create-new-file/SKILL.md, figma-generate-design -> skill-modules/02-design-figma/figma-generate-design/SKILL.md, figma-generate-library -> skill-modules/02-design-figma/figma-generate-library/SKILL.md |
| duplicateName |0 | |
| duplicateCanonicalPath |0 | |
| duplicateSkillMdPath |0 | |
| pathDoesNotExist |0 | |
| directoryWithoutSkill |0 | |

### SKILLS_INDEX Summary

| Metric | Value |
| --- | --- |
| entries |69 |
| unique names |69 |
| unique physicalPath values |69 |
| unique entry values |1 |
| alias values total |94 |

### SKILLS_INDEX Data Quality

| Issue | Count | Sample |
| --- | --- | --- |
| missingAliases |54 |cli-creator -> skill-modules/01-orchestration-meta/cli-creator, find-skills -> skill-modules/01-orchestration-meta/find-skills, task-orchestrator -> skill-modules/01-orchestration-meta/task-orchestrator, figma -> skill-modules/02-design-figma/figma, figma-code-connect-components -> skill-modules/02-design-figma/figma-code-connect-components, figma-create-design-system-rules -> skill-modules/02-design-figma/figma-create-design-system-rules, figma-create-new-file -> skill-modules/02-design-figma/figma-create-new-file, figma-generate-design -> skill-modules/02-design-figma/figma-generate-design, figma-generate-library -> skill-modules/02-design-figma/figma-generate-library, figma-implement-design -> skill-modules/02-design-figma/figma-implement-design, figma-use -> skill-modules/02-design-figma/figma-use, architecture-browser-master -> skill-modules/03-ui-browser-automation/architecture-browser-master, develop-web-game -> skill-modules/03-ui-browser-automation/develop-web-game, frontend-skill -> skill-modules/03-ui-browser-automation/frontend-skill, playwright -> skill-modules/03-ui-browser-automation/playwright, playwright-interactive -> skill-modules/03-ui-browser-automation/playwright-interactive, screenshot -> skill-modules/03-ui-browser-automation/screenshot, top-ui-frontend-framework -> skill-modules/03-ui-browser-automation/top-ui-frontend-framework, aspnet-core -> skill-modules/04-frameworks-platforms/aspnet-core, chatgpt-apps -> skill-modules/04-frameworks-platforms/chatgpt-apps |
| duplicateName |0 | |
| duplicateCanonicalPath |0 | |
| duplicateSkillMdPath |0 | |
| pathDoesNotExist |0 | |
| directoryWithoutSkill |0 | |
| missingPhysicalPath |0 | |
| missingEntry |0 | |

### Cross-Source Name Comparison

| Comparison | Count | Sample |
| --- | --- | --- |
| index only |0 | |
| registry only |23 |andrej-karpathy-perspective, anthony-fu-perspective, design-taste-frontend, elon-musk-perspective, evan-you-perspective, feynman-perspective, ilya-sutskever-perspective, interface-design, mrbeast-perspective, munger-perspective, naval-perspective, paul-graham-perspective, rich-harris-perspective, simon-willison-perspective, steve-jobs-perspective, sun-yuchen-perspective, taleb-perspective, teknium-perspective, trump-perspective, web-design-guidelines, x-mastery-mentor, zhang-yiming-perspective, zhangxuefeng-perspective |
| in both |69 |aios-tool-router, architecture-browser-master, aspnet-core, chatgpt-apps, cli-creator, cloudflare-deploy, codex-ast-grep-codemod, codex-context7-docs-first, codex-figma-to-code, codex-frontend-ui-debug, codex-large-repo-understanding, codex-repo-health-scan, codex-serena-symbolic-navigation, codex-visual-regression-playwright, custom-skill-router, desktop-tauri-guard, develop-web-game, doc, figma, figma-code-connect-components, figma-create-design-system-rules, figma-create-new-file, figma-generate-design, figma-generate-library, figma-implement-design |
| filesystem only |6 |aios-google-material-style, aios-ui-polish-react-gsap, imagegen, openai-docs, skill-creator, skill-installer |
| active entrypoint only |0 | |

### Distilled / Persona / Perspective Registry Records

| Name | Manifest path | Alias count | sourceTypes | Path exists |
| --- | --- | --- | --- | --- |
| andrej-karpathy-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/andrej-karpathy-perspective/SKILL.md |0 |embedded-skill-md |yes |
| anthony-fu-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/anthony-fu-perspective/SKILL.md |0 |embedded-skill-md |yes |
| elon-musk-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/elon-musk-perspective/SKILL.md |0 |embedded-skill-md |yes |
| evan-you-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/evan-you-perspective/SKILL.md |0 |embedded-skill-md |yes |
| feynman-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/feynman-perspective/SKILL.md |0 |embedded-skill-md |yes |
| huashu-nuwa |skill-modules/07-knowledge-research/huashu-nuwa/SKILL.md |10 |active-claude, active-runtime, archived-agents, archived-codex, canonical, canonical-skill-md |yes |
| ilya-sutskever-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/ilya-sutskever-perspective/SKILL.md |0 |embedded-skill-md |yes |
| mrbeast-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/mrbeast-perspective/SKILL.md |0 |embedded-skill-md |yes |
| munger-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/munger-perspective/SKILL.md |0 |embedded-skill-md |yes |
| naval-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/naval-perspective/SKILL.md |0 |embedded-skill-md |yes |
| paul-graham-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/paul-graham-perspective/SKILL.md |0 |embedded-skill-md |yes |
| rich-harris-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/rich-harris-perspective/SKILL.md |0 |embedded-skill-md |yes |
| simon-willison-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/simon-willison-perspective/SKILL.md |0 |embedded-skill-md |yes |
| steve-jobs-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/steve-jobs-perspective/SKILL.md |0 |embedded-skill-md |yes |
| sun-yuchen-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/sun-yuchen-perspective/SKILL.md |0 |embedded-skill-md |yes |
| taleb-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/taleb-perspective/SKILL.md |0 |embedded-skill-md |yes |
| teknium-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/teknium-perspective/SKILL.md |0 |embedded-skill-md |yes |
| trump-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/trump-perspective/SKILL.md |0 |embedded-skill-md |yes |
| x-mastery-mentor |skill-modules/07-knowledge-research/huashu-nuwa/examples/x-mastery-mentor/SKILL.md |0 |embedded-skill-md |yes |
| zhang-yiming-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/zhang-yiming-perspective/SKILL.md |0 |embedded-skill-md |yes |
| zhangxuefeng-perspective |skill-modules/07-knowledge-research/huashu-nuwa/examples/zhangxuefeng-perspective/SKILL.md |0 |embedded-skill-md |yes |

## Part D: Generated Inventory Audit

### Resource Counts

| capabilityType | Count |
| --- | --- |
| runtime-view |110 |
| skill |92 |
| report |30 |
| project-pack |25 |
| script |14 |
| mcp-server |7 |
| policy |2 |
| usage-prompt |2 |
| validator |2 |
| registry |1 |

| toolType | Count |
| --- | --- |
| aios-root |95 |
| claude |72 |
| report |30 |
| project-local |25 |
| codex |20 |
| agents |19 |
| script |14 |
| mcp |7 |
| validator |2 |
| legacy |1 |

| status | Count |
| --- | --- |
| available |167 |
| active |110 |
| warn |7 |
| ok |1 |

| risk | Count |
| --- | --- |
| medium |189 |
| low |93 |
| high |3 |

| metadata.sourceKind | Count |
| --- | --- |
| active-entrypoint |110 |
| (none) |80 |
| skills-index |69 |
| custom-registry |24 |
| filesystem |2 |

| metadata.sourceKinds item | Count |
| --- | --- |
| active-entrypoint |182 |
| custom-registry |93 |
| filesystem |91 |
| (none) |80 |
| skills-index |69 |

### Metadata Flag Counts

| Flag | true | false | undefined |
| --- | --- | --- | --- |
| indexed |69 |135 |81 |
| registryListed |92 |112 |81 |
| activeEntrypoint |182 |22 |81 |
| discoveredOnly |2 |202 |81 |
| archived |0 |94 |191 |
| distillationRelated |21 |73 |191 |

### Skills View Inclusion

| Metric | Count |
| --- | --- |
| skill-like resources included by `frontend/src/lib/filtering.ts` |228 |
| huashu family resources in generated inventory |22 |
| direct huashu example resources in generated inventory |20 |
| duplicate display groups by normalized identity |74 |
| duplicate groups containing `top-ui-frontend-framework` or `frontend-skill` |2 |

### Duplicate Display Groups

| # | Shared normalized keys | Classification | Resources: id \| name \| capabilityType \| toolType \| sourceKinds \| active \| indexed \| registry \| discoveredOnly \| path |
| --- | --- | --- | --- |
| 1 |active-name:aios-tool-router; name:aios-tool-router |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:aios-tool-router \| aios-tool-router \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/aios-tool-router<br>aios-root:skill:aios-tool-router \| aios-tool-router \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/aios-tool-router<br>claude:entrypoint:aios-tool-router \| aios-tool-router \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/aios-tool-router<br>codex:entrypoint:aios-tool-router \| aios-tool-router \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/aios-tool-router |
| 2 |active-name:architecture-browser-master; name:architecture-browser-master |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:architecture-browser-master \| architecture-browser-master \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/architecture-browser-master<br>claude:entrypoint:architecture-browser-master \| architecture-browser-master \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/architecture-browser-master |
| 3 |active-name:aspnet-core; name:aspnet-core |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:aspnet-core \| aspnet-core \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/aspnet-core<br>claude:entrypoint:aspnet-core \| aspnet-core \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/aspnet-core |
| 4 |active-name:chatgpt-apps; name:chatgpt-apps |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:chatgpt-apps \| chatgpt-apps \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/chatgpt-apps<br>claude:entrypoint:chatgpt-apps \| chatgpt-apps \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/chatgpt-apps |
| 5 |active-name:cli-creator; name:cli-creator |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:cli-creator \| cli-creator \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/cli-creator<br>claude:entrypoint:cli-creator \| cli-creator \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/cli-creator |
| 6 |active-name:cloudflare-deploy; name:cloudflare-deploy |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:cloudflare-deploy \| cloudflare-deploy \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/cloudflare-deploy<br>claude:entrypoint:cloudflare-deploy \| cloudflare-deploy \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/cloudflare-deploy |
| 7 |active-name:codex-ast-grep-codemod; name:codex-ast-grep-codemod |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:codex-ast-grep-codemod \| codex-ast-grep-codemod \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/codex-ast-grep-codemod<br>aios-root:skill:codex-ast-grep-codemod \| codex-ast-grep-codemod \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/codex-ast-grep-codemod<br>claude:entrypoint:codex-ast-grep-codemod \| codex-ast-grep-codemod \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/codex-ast-grep-codemod<br>codex:entrypoint:codex-ast-grep-codemod \| codex-ast-grep-codemod \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/codex-ast-grep-codemod |
| 8 |active-name:codex-context7-docs-first; name:codex-context7-docs-first |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:codex-context7-docs-first \| codex-context7-docs-first \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/codex-context7-docs-first<br>aios-root:skill:codex-context7-docs-first \| codex-context7-docs-first \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/codex-context7-docs-first<br>claude:entrypoint:codex-context7-docs-first \| codex-context7-docs-first \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/codex-context7-docs-first<br>codex:entrypoint:codex-context7-docs-first \| codex-context7-docs-first \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/codex-context7-docs-first |
| 9 |active-name:codex-figma-to-code; name:codex-figma-to-code |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:codex-figma-to-code \| codex-figma-to-code \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/codex-figma-to-code<br>claude:entrypoint:codex-figma-to-code \| codex-figma-to-code \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/codex-figma-to-code |
| 10 |active-name:codex-frontend-ui-debug; name:codex-frontend-ui-debug |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:codex-frontend-ui-debug \| codex-frontend-ui-debug \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/codex-frontend-ui-debug<br>aios-root:skill:codex-frontend-ui-debug \| codex-frontend-ui-debug \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/codex-frontend-ui-debug<br>claude:entrypoint:codex-frontend-ui-debug \| codex-frontend-ui-debug \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/codex-frontend-ui-debug<br>codex:entrypoint:codex-frontend-ui-debug \| codex-frontend-ui-debug \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/codex-frontend-ui-debug |
| 11 |active-name:codex-large-repo-understanding; name:codex-large-repo-understanding |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:codex-large-repo-understanding \| codex-large-repo-understanding \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/codex-large-repo-understanding<br>aios-root:skill:codex-large-repo-understanding \| codex-large-repo-understanding \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/codex-large-repo-understanding<br>claude:entrypoint:codex-large-repo-understanding \| codex-large-repo-understanding \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/codex-large-repo-understanding<br>codex:entrypoint:codex-large-repo-understanding \| codex-large-repo-understanding \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/codex-large-repo-understanding |
| 12 |active-name:codex-repo-health-scan; name:codex-repo-health-scan |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:codex-repo-health-scan \| codex-repo-health-scan \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/codex-repo-health-scan<br>aios-root:skill:codex-repo-health-scan \| codex-repo-health-scan \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/codex-repo-health-scan<br>claude:entrypoint:codex-repo-health-scan \| codex-repo-health-scan \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/codex-repo-health-scan<br>codex:entrypoint:codex-repo-health-scan \| codex-repo-health-scan \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/codex-repo-health-scan |
| 13 |active-name:codex-serena-symbolic-navigation; name:codex-serena-symbolic-navigation |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:codex-serena-symbolic-navigation \| codex-serena-symbolic-navigation \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/codex-serena-symbolic-navigation<br>aios-root:skill:codex-serena-symbolic-navigation \| codex-serena-symbolic-navigation \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/codex-serena-symbolic-navigation<br>claude:entrypoint:codex-serena-symbolic-navigation \| codex-serena-symbolic-navigation \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/codex-serena-symbolic-navigation<br>codex:entrypoint:codex-serena-symbolic-navigation \| codex-serena-symbolic-navigation \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/codex-serena-symbolic-navigation |
| 14 |active-name:codex-visual-regression-playwright; name:codex-visual-regression-playwright |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:codex-visual-regression-playwright \| codex-visual-regression-playwright \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/codex-visual-regression-playwright<br>claude:entrypoint:codex-visual-regression-playwright \| codex-visual-regression-playwright \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/codex-visual-regression-playwright |
| 15 |active-name:custom-skill-router; name:custom-skill-router |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:custom-skill-router \| custom-skill-router \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/custom-skill-router<br>aios-root:skill:custom-skill-router \| custom-skill-router \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/custom-skill-router<br>claude:entrypoint:custom-skill-router \| custom-skill-router \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/custom-skill-router<br>codex:entrypoint:custom-skill-router \| custom-skill-router \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/custom-skill-router |
| 16 |active-name:design-taste-frontend; name:design-taste-frontend |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill-registry:design-taste-frontend \| design-taste-frontend \| skill \| aios-root \| custom-registry,active-entrypoint \| yes \| no \| yes \| no \| ~/.claude/skills/design-taste-frontend/SKILL.md<br>claude:entrypoint:design-taste-frontend \| design-taste-frontend \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/design-taste-frontend |
| 17 |active-name:desktop-tauri-guard; name:desktop-tauri-guard |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:desktop-tauri-guard \| desktop-tauri-guard \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/desktop-tauri-guard<br>claude:entrypoint:desktop-tauri-guard \| desktop-tauri-guard \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/desktop-tauri-guard |
| 18 |active-name:develop-web-game; name:develop-web-game |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:develop-web-game \| develop-web-game \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/develop-web-game<br>claude:entrypoint:develop-web-game \| develop-web-game \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/develop-web-game |
| 19 |active-name:doc; name:doc |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:doc \| doc \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/doc<br>claude:entrypoint:doc \| doc \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/doc |
| 20 |active-name:figma; name:figma |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:figma \| figma \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/figma<br>claude:entrypoint:figma \| figma \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/figma |
| 21 |active-name:figma-code-connect-components; name:figma-code-connect-components |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:figma-code-connect-components \| figma-code-connect-components \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/figma-code-connect-components<br>claude:entrypoint:figma-code-connect-components \| figma-code-connect-components \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/figma-code-connect-components |
| 22 |active-name:figma-create-design-system-rules; name:figma-create-design-system-rules |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:figma-create-design-system-rules \| figma-create-design-system-rules \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/figma-create-design-system-rules<br>claude:entrypoint:figma-create-design-system-rules \| figma-create-design-system-rules \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/figma-create-design-system-rules |
| 23 |active-name:figma-create-new-file; name:figma-create-new-file |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:figma-create-new-file \| figma-create-new-file \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/figma-create-new-file<br>claude:entrypoint:figma-create-new-file \| figma-create-new-file \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/figma-create-new-file |
| 24 |active-name:figma-generate-design; name:figma-generate-design |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:figma-generate-design \| figma-generate-design \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/figma-generate-design<br>claude:entrypoint:figma-generate-design \| figma-generate-design \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/figma-generate-design |
| 25 |active-name:figma-generate-library; name:figma-generate-library |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:figma-generate-library \| figma-generate-library \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/figma-generate-library<br>claude:entrypoint:figma-generate-library \| figma-generate-library \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/figma-generate-library |
| 26 |active-name:figma-implement-design; name:figma-implement-design |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:figma-implement-design \| figma-implement-design \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/figma-implement-design<br>claude:entrypoint:figma-implement-design \| figma-implement-design \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/figma-implement-design |
| 27 |active-name:figma-use; name:figma-use |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:figma-use \| figma-use \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 02-design-figma/figma-use<br>claude:entrypoint:figma-use \| figma-use \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/figma-use |
| 28 |active-name:find-skills; name:find-skills |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:find-skills \| find-skills \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/find-skills<br>aios-root:skill:find-skills \| find-skills \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/find-skills<br>claude:entrypoint:find-skills \| find-skills \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/find-skills<br>codex:entrypoint:find-skills \| find-skills \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/find-skills |
| 29 |active-name:frontend-skill; name:frontend-skill |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:frontend-skill \| frontend-skill \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/frontend-skill<br>aios-root:skill:frontend-skill \| frontend-skill \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/frontend-skill<br>claude:entrypoint:frontend-skill \| frontend-skill \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/frontend-skill<br>codex:entrypoint:frontend-skill \| frontend-skill \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/frontend-skill |
| 30 |active-name:gh-address-comments; name:gh-address-comments |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:gh-address-comments \| gh-address-comments \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/gh-address-comments<br>claude:entrypoint:gh-address-comments \| gh-address-comments \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/gh-address-comments |
| 31 |active-name:gh-fix-ci; name:gh-fix-ci |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:gh-fix-ci \| gh-fix-ci \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/gh-fix-ci<br>claude:entrypoint:gh-fix-ci \| gh-fix-ci \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/gh-fix-ci |
| 32 |active-name:github-ops; name:github-ops |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:github-ops \| github-ops \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/github-ops<br>claude:entrypoint:github-ops \| github-ops \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/github-ops |
| 33 |active-name:huashu-nuwa; name:huashu-nuwa |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:huashu-nuwa \| huashu-nuwa \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 07-knowledge-research/huashu-nuwa<br>claude:entrypoint:huashu-nuwa \| huashu-nuwa \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/huashu-nuwa |
| 34 |active-name:interface-design; name:interface-design |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill-registry:interface-design \| interface-design \| skill \| aios-root \| custom-registry,active-entrypoint \| yes \| no \| yes \| no \| ~/.claude/skills/interface-design/SKILL.md<br>claude:entrypoint:interface-design \| interface-design \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/interface-design |
| 35 |active-name:jupyter-notebook; name:jupyter-notebook |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:jupyter-notebook \| jupyter-notebook \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/jupyter-notebook<br>claude:entrypoint:jupyter-notebook \| jupyter-notebook \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/jupyter-notebook |
| 36 |active-name:linear; name:linear |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:linear \| linear \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 07-knowledge-research/linear<br>claude:entrypoint:linear \| linear \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/linear |
| 37 |active-name:local-ai-approved-apply; name:local-ai-approved-apply |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:local-ai-approved-apply \| local-ai-approved-apply \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/local-ai-approved-apply<br>aios-root:skill:local-ai-approved-apply \| local-ai-approved-apply \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/local-ai-approved-apply<br>claude:entrypoint:local-ai-approved-apply \| local-ai-approved-apply \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/local-ai-approved-apply<br>codex:entrypoint:local-ai-approved-apply \| local-ai-approved-apply \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/local-ai-approved-apply |
| 38 |active-name:local-ai-governance-audit; name:local-ai-governance-audit |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:local-ai-governance-audit \| local-ai-governance-audit \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/local-ai-governance-audit<br>aios-root:skill:local-ai-governance-audit \| local-ai-governance-audit \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/local-ai-governance-audit<br>claude:entrypoint:local-ai-governance-audit \| local-ai-governance-audit \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/local-ai-governance-audit<br>codex:entrypoint:local-ai-governance-audit \| local-ai-governance-audit \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/local-ai-governance-audit |
| 39 |active-name:local-ai-upgrade-proposal; name:local-ai-upgrade-proposal |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:local-ai-upgrade-proposal \| local-ai-upgrade-proposal \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/local-ai-upgrade-proposal<br>aios-root:skill:local-ai-upgrade-proposal \| local-ai-upgrade-proposal \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/local-ai-upgrade-proposal<br>claude:entrypoint:local-ai-upgrade-proposal \| local-ai-upgrade-proposal \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/local-ai-upgrade-proposal<br>codex:entrypoint:local-ai-upgrade-proposal \| local-ai-upgrade-proposal \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/local-ai-upgrade-proposal |
| 40 |active-name:netlify-deploy; name:netlify-deploy |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:netlify-deploy \| netlify-deploy \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/netlify-deploy<br>claude:entrypoint:netlify-deploy \| netlify-deploy \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/netlify-deploy |
| 41 |active-name:notion-knowledge-capture; name:notion-knowledge-capture |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:notion-knowledge-capture \| notion-knowledge-capture \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 07-knowledge-research/notion-knowledge-capture<br>claude:entrypoint:notion-knowledge-capture \| notion-knowledge-capture \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/notion-knowledge-capture |
| 42 |active-name:notion-meeting-intelligence; name:notion-meeting-intelligence |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:notion-meeting-intelligence \| notion-meeting-intelligence \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 07-knowledge-research/notion-meeting-intelligence<br>claude:entrypoint:notion-meeting-intelligence \| notion-meeting-intelligence \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/notion-meeting-intelligence |
| 43 |active-name:notion-research-documentation; name:notion-research-documentation |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:notion-research-documentation \| notion-research-documentation \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 07-knowledge-research/notion-research-documentation<br>claude:entrypoint:notion-research-documentation \| notion-research-documentation \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/notion-research-documentation |
| 44 |active-name:notion-spec-to-implementation; name:notion-spec-to-implementation |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:notion-spec-to-implementation \| notion-spec-to-implementation \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 07-knowledge-research/notion-spec-to-implementation<br>claude:entrypoint:notion-spec-to-implementation \| notion-spec-to-implementation \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/notion-spec-to-implementation |
| 45 |active-name:pdf; name:pdf |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:pdf \| pdf \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/pdf<br>claude:entrypoint:pdf \| pdf \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/pdf |
| 46 |active-name:playwright; name:playwright |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:playwright \| playwright \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/playwright<br>aios-root:skill:playwright \| playwright \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/playwright<br>claude:entrypoint:playwright \| playwright \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/playwright<br>codex:entrypoint:playwright \| playwright \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/playwright |
| 47 |active-name:playwright-interactive; name:playwright-interactive |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:playwright-interactive \| playwright-interactive \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/playwright-interactive<br>aios-root:skill:playwright-interactive \| playwright-interactive \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/playwright-interactive<br>claude:entrypoint:playwright-interactive \| playwright-interactive \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/playwright-interactive<br>codex:entrypoint:playwright-interactive \| playwright-interactive \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/playwright-interactive |
| 48 |active-name:render-deploy; name:render-deploy |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:render-deploy \| render-deploy \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/render-deploy<br>claude:entrypoint:render-deploy \| render-deploy \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/render-deploy |
| 49 |active-name:repomix; name:repomix |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:repomix \| repomix \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/repomix<br>aios-root:skill:repomix \| repomix \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/repomix<br>claude:entrypoint:repomix \| repomix \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/repomix<br>codex:entrypoint:repomix \| repomix \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/repomix |
| 50 |active-name:screenshot; name:screenshot |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:screenshot \| screenshot \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/screenshot<br>aios-root:skill:screenshot \| screenshot \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/screenshot<br>claude:entrypoint:screenshot \| screenshot \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/screenshot<br>codex:entrypoint:screenshot \| screenshot \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/screenshot |
| 51 |active-name:security-best-practices; name:security-best-practices |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:security-best-practices \| security-best-practices \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/security-best-practices<br>aios-root:skill:security-best-practices \| security-best-practices \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 08-security/security-best-practices<br>claude:entrypoint:security-best-practices \| security-best-practices \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/security-best-practices<br>codex:entrypoint:security-best-practices \| security-best-practices \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/security-best-practices |
| 52 |active-name:security-ownership-map; name:security-ownership-map |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:security-ownership-map \| security-ownership-map \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 08-security/security-ownership-map<br>claude:entrypoint:security-ownership-map \| security-ownership-map \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/security-ownership-map |
| 53 |active-name:security-threat-model; name:security-threat-model |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:security-threat-model \| security-threat-model \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 08-security/security-threat-model<br>claude:entrypoint:security-threat-model \| security-threat-model \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/security-threat-model |
| 54 |active-name:sentry; name:sentry |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:sentry \| sentry \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/sentry<br>claude:entrypoint:sentry \| sentry \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/sentry |
| 55 |active-name:slides; name:slides |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:slides \| slides \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/slides<br>claude:entrypoint:slides \| slides \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/slides |
| 56 |active-name:sora; name:sora |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:sora \| sora \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/sora<br>claude:entrypoint:sora \| sora \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/sora |
| 57 |active-name:speech; name:speech |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:speech \| speech \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/speech<br>claude:entrypoint:speech \| speech \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/speech |
| 58 |active-name:spreadsheet; name:spreadsheet |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:spreadsheet \| spreadsheet \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/spreadsheet<br>claude:entrypoint:spreadsheet \| spreadsheet \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/spreadsheet |
| 59 |active-name:summarize; name:summarize |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:summarize \| summarize \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/summarize<br>claude:entrypoint:summarize \| summarize \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/summarize |
| 60 |active-name:task-orchestrator; name:task-orchestrator |source duplicate: active runtime-view row should usually be a badge on canonical skill row |agents:entrypoint:task-orchestrator \| task-orchestrator \| runtime-view \| agents \| active-entrypoint \| yes \| no \| no \| no \| ~/.agents/skills/task-orchestrator<br>aios-root:skill:task-orchestrator \| task-orchestrator \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 01-orchestration-meta/task-orchestrator<br>claude:entrypoint:task-orchestrator \| task-orchestrator \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/task-orchestrator<br>codex:entrypoint:task-orchestrator \| task-orchestrator \| runtime-view \| codex \| active-entrypoint \| yes \| no \| no \| no \| ~/.codex/skills/task-orchestrator |
| 61 |active-name:tavily-research; name:tavily-research |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:tavily-research \| tavily-research \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 07-knowledge-research/tavily-research<br>claude:entrypoint:tavily-research \| tavily-research \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/tavily-research |
| 62 |active-name:top-ui-frontend-framework; name:top-ui-frontend-framework |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:top-ui-frontend-framework \| top-ui-frontend-framework \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 03-ui-browser-automation/top-ui-frontend-framework<br>claude:entrypoint:top-ui-frontend-framework \| top-ui-frontend-framework \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/top-ui-frontend-framework |
| 63 |active-name:transcribe; name:transcribe |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:transcribe \| transcribe \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 06-documents-media-data/transcribe<br>claude:entrypoint:transcribe \| transcribe \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/transcribe |
| 64 |active-name:unocss; name:unocss |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:unocss \| unocss \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/unocss<br>claude:entrypoint:unocss \| unocss \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/unocss |
| 65 |active-name:vercel-deploy; name:vercel-deploy |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:vercel-deploy \| vercel-deploy \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/vercel-deploy<br>claude:entrypoint:vercel-deploy \| vercel-deploy \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/vercel-deploy |
| 66 |active-name:vite; name:vite |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:vite \| vite \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/vite<br>claude:entrypoint:vite \| vite \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/vite |
| 67 |active-name:vue; name:vue |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:vue \| vue \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/vue<br>claude:entrypoint:vue \| vue \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/vue |
| 68 |active-name:vueuse-functions; name:vueuse-functions |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:vueuse-functions \| vueuse-functions \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/vueuse-functions<br>claude:entrypoint:vueuse-functions \| vueuse-functions \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/vueuse-functions |
| 69 |active-name:web-design-guidelines; name:web-design-guidelines |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill-registry:web-design-guidelines \| web-design-guidelines \| skill \| aios-root \| custom-registry,active-entrypoint \| yes \| no \| yes \| no \| ~/.claude/skills/web-design-guidelines/SKILL.md<br>claude:entrypoint:web-design-guidelines \| web-design-guidelines \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/web-design-guidelines |
| 70 |active-name:wechat-miniprogram-native-ui-frontend-framework; name:wechat-miniprogram-native-ui-frontend-framework |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:wechat-miniprogram-native-ui-frontend-framework \| wechat-miniprogram-native-ui-frontend-framework \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/wechat-miniprogram-native-ui-frontend-framework<br>claude:entrypoint:wechat-miniprogram-native-ui-frontend-framework \| wechat-miniprogram-native-ui-frontend-framework \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/wechat-miniprogram-native-ui-frontend-framework |
| 71 |active-name:winui-app; name:winui-app |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:winui-app \| winui-app \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 04-frameworks-platforms/winui-app<br>claude:entrypoint:winui-app \| winui-app \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/winui-app |
| 72 |active-name:yeet; name:yeet |source duplicate: active runtime-view row should usually be a badge on canonical skill row |aios-root:skill:yeet \| yeet \| skill \| aios-root \| skills-index,custom-registry,filesystem,active-entrypoint \| yes \| yes \| yes \| no \| 05-github-deploy-ops/yeet<br>claude:entrypoint:yeet \| yeet \| runtime-view \| claude \| active-entrypoint \| yes \| no \| no \| no \| ~/.claude/skills/yeet |
| 73 |manifest:/users/cc/.ai/aios/.agents/skills/aios-google-material-style/skill.md; name:aios-google-material-style |unintended duplicate row risk: same manifest identity appears in multiple resources |project-local:pack:-users-cc-ai-aios-agents-skills-aios-google-material-style-skill-md \| aios-google-material-style \| project-pack \| project-local \|  \| no \| no \| no \| no \| AIOS/.agents/skills/aios-google-material-style/SKILL.md<br>project-local:skill-discovered:aios-google-material-style:-users-cc-ai-aios-agents-skills-aios-google-material-style-skill-md \| aios-google-material-style \| project-pack \| project-local \| filesystem \| no \| no \| no \| yes \| AIOS/.agents/skills/aios-google-material-style/SKILL.md |
| 74 |manifest:/users/cc/.ai/aios/.agents/skills/aios-ui-polish-react-gsap/skill.md; name:aios-ui-polish-react-gsap |unintended duplicate row risk: same manifest identity appears in multiple resources |project-local:pack:-users-cc-ai-aios-agents-skills-aios-ui-polish-react-gsap-skill-md \| aios-ui-polish-react-gsap \| project-pack \| project-local \|  \| no \| no \| no \| no \| AIOS/.agents/skills/aios-ui-polish-react-gsap/SKILL.md<br>project-local:skill-discovered:aios-ui-polish-react-gsap:-users-cc-ai-aios-agents-skills-aios-ui-polish-react-gsap-skill-md \| aios-ui-polish-react-gsap \| project-pack \| project-local \| filesystem \| no \| no \| no \| yes \| AIOS/.agents/skills/aios-ui-polish-react-gsap/SKILL.md |

### `top-ui-frontend-framework` / `frontend-skill` Duplicate Groups

| Shared keys | Resources |
| --- | --- |
| active-name:frontend-skill; name:frontend-skill |agents:entrypoint:frontend-skill (runtime-view, agents, ~/.agents/skills/frontend-skill)<br>aios-root:skill:frontend-skill (skill, aios-root, 03-ui-browser-automation/frontend-skill)<br>claude:entrypoint:frontend-skill (runtime-view, claude, ~/.claude/skills/frontend-skill)<br>codex:entrypoint:frontend-skill (runtime-view, codex, ~/.codex/skills/frontend-skill) |
| active-name:top-ui-frontend-framework; name:top-ui-frontend-framework |aios-root:skill:top-ui-frontend-framework (skill, aios-root, 03-ui-browser-automation/top-ui-frontend-framework)<br>claude:entrypoint:top-ui-frontend-framework (runtime-view, claude, ~/.claude/skills/top-ui-frontend-framework) |

### Huashu Family Inventory Presence

| Metric | Count |
| --- | --- |
| family resources in inventory |22 |
| direct example resources in inventory |20 |
| direct examples independent resource names |20 |

## Part E: Frontend Search And Grouping Audit

### Observations From Source Code

- `frontend/src/lib/filtering.ts` includes `skill`, `runtime-view`, `registry`, and `project-pack` in the Skills view. That means identity resources and runtime/source views can appear as separate rows.
- `SkillsModule.tsx` defaults to capability grouping. Capability grouping appends resources by current resource id and does not merge canonical skill identity rows with runtime-view/source rows.
- Source grouping assigns each resource to the first matching source bucket, but this only changes grouping; it does not create a canonical identity row with source badges.
- `skillDiscoveryMetadata.ts` builds search text from each resource's own metadata and creates `huashu-nuwa`/`huashu-nvwa` variants only from resource name and own aliases.
- `CompactSkillRow.tsx` already displays source badges on a row, but runtime-view rows remain independent resources.
- `ResourceInspector.tsx` shows core discovery booleans and manifest path, but does not expose full source provenance details such as every merged source row or active client names.

### Search Counts

| Query | Skill-view matches | Sample |
| --- | --- | --- |
| `nuwa` |22 |andrej-karpathy-perspective, anthony-fu-perspective, elon-musk-perspective, evan-you-perspective, feynman-perspective, huashu-nuwa, ilya-sutskever-perspective, mrbeast-perspective, munger-perspective, naval-perspective, paul-graham-perspective, rich-harris-perspective, simon-willison-perspective, steve-jobs-perspective, sun-yuchen-perspective, taleb-perspective, teknium-perspective, trump-perspective, x-mastery-mentor, zhang-yiming-perspective |
| `nvwa` |2 |huashu-nuwa, huashu-nuwa |
| `top-ui` |2 |top-ui-frontend-framework (skill), top-ui-frontend-framework (runtime-view) |
| `frontend` |22 |codex-frontend-ui-debug (runtime-view), frontend-skill (runtime-view), codex-figma-to-code (skill), codex-frontend-ui-debug (skill), codex-visual-regression-playwright (skill), design-taste-frontend (skill), frontend-skill (skill), top-ui-frontend-framework (skill), unocss (skill), vite (skill), vue (skill), vueuse-functions (skill), wechat-miniprogram-native-ui-frontend-framework (skill), winui-app (skill), codex-frontend-ui-debug (runtime-view), design-taste-frontend (runtime-view), frontend-skill (runtime-view), top-ui-frontend-framework (runtime-view), wechat-miniprogram-native-ui-frontend-framework (runtime-view), codex-frontend-ui-debug (runtime-view) |

### Answers

- Default capability grouping includes discovered-only, registry-listed, active-entrypoint-marked canonical resources, project-pack resources, registry resources, and runtime-view resources because all are passed through the Skills view capability filter.
- Active entrypoints should usually be source badges or source details on canonical skill identity rows. Separate runtime rows are useful only behind an explicit `show runtime views` toggle.
- Huashu child/example skills do not reliably inherit parent-family aliases. Their paths contain `huashu-nuwa`, so `nuwa` can match via path, but `nvwa` is absent unless the child name or own aliases include it.
- Searching `nvwa` currently returns 2 resources, while `nuwa` returns 22; this is the alias/path variant gap.
- Searching `frontend` returns 22 resources and `top-ui` returns 2. Duplicate-looking rows are mostly source/identity modeling duplicates, not necessarily duplicate physical manifests.
- Duplicate groups with runtime-view rows: 72 / 74.

### Proposed UI / Source Model Improvements

- Build an identity row keyed by normalized manifest path first, then canonical path, then normalized skill name.
- Render source badges on that identity row for `skills-index`, `custom-registry`, `filesystem`, `active-entrypoint`, `project-pack`, and `runtime-view` provenance.
- Add inspector source details: merged sourceKinds, active client names, registry/index paths, manifest path, canonical path, and discovered root.
- Add a toggle to show active-entrypoint runtime views as separate rows for debugging.
- Add family/inherited aliases for huashu descendants: `huashu`, `huashu-nuwa`, `huashu-nvwa`, `nuwa`, `nvwa`, `女娲`, `蒸馏`, `persona`, `perspective`, `人物`, `角色`.
- Add a distilled-family grouping that treats `huashu-nuwa/examples/*` as children of the parent family while keeping each example independently inspectable.

## Part F: Root Cause And Fix Plan

### Root Causes

| Cause | Assessment |
| --- | --- |
| scanner coverage gap |No current uppercase `SKILL.md` scanner coverage gap for the huashu examples; lowercase/non-standard manifests remain diagnostic-only. |
| registry expansion gap |Registry expansion exists now, but entries without `skillMdPath`/`canonicalPath` remain lower-confidence and should be tested. |
| dedupe gap |74 normalized duplicate display groups remain in the generated inventory/Skills view model. |
| alias/search inheritance gap |Huashu child/example skills do not inherit parent aliases; `nvwa` variants are generated from name/aliases only, not path/family metadata. |
| source-vs-identity UI modeling gap |Runtime entrypoints, registry resources, project packs, and canonical skills are all first-class rows in Skills view instead of being merged into identity rows with provenance badges. |
| actual missing files |The expected 20 direct huashu example `SKILL.md` files exist. |

### Prioritized Fix Plan

- P0: Add exact audit/search regression tests for `nuwa`, `nvwa`, `huashu`, `top-ui`, and `frontend`; assert that the 20 direct examples are present in inventory and searchable by family terms.
- P1: Add an identity model/dedupe layer for Skills view keyed by normalized manifest path, canonical path, and normalized skill name; keep source provenance as metadata.
- P2: Add family alias inheritance for `huashu-nuwa/examples/*` and registry/index descendants: `huashu`, `huashu-nuwa`, `huashu-nvwa`, `nuwa`, `nvwa`, `女娲`, `蒸馏`, `persona`, `perspective`, `人物`, `角色`.
- P3: Render source badges and source details in row/inspector; suppress runtime-view duplicate rows by default behind a debug toggle.
- P4: Add scanner support for non-standard manifest names only if product policy wants diagnostic manifests to become canonical resources; keep uppercase `SKILL.md` as the current canonical contract unless changed deliberately.

## Implementation Follow-Up - 2026-07-03

- Added a frontend-only Skills identity model. The generated inventory snapshot remains unchanged; source/runtime resources are merged only for presentation.
- Skills now defaults to merged identity rows with source provenance badges and keeps raw entrypoint/source rows behind an explicit debug toggle.
- Huashu/nuwa/nvwa distilled-family aliases are inherited in frontend search text for child/example identity rows.
- Added deterministic frontend unit tests for identity keying, source merging, source badges, duplicate suppression, and huashu family search regressions.
