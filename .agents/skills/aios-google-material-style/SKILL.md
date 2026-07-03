---
name: aios-google-material-style
description: Use for AIOS Control Center frontend work that must follow the project-local Google Material-inspired style system.
---

# AIOS Material Console V3

Use Material UI as the primary React UI framework for this repository. Build AIOS Control Center V3 surfaces with MUI theme tokens, MUI layout primitives, and MUI components before adding custom CSS.

## Design Direction

- Follow AIOS Material Console V3: fixed-viewport, search-first, stable Google-style local AI capability console.
- Keep the interface product-like, modular, Chinese-friendly, and read-only. It must not feel like a generic admin dashboard.
- Use a compact left navigation rail, one-line top command bar, module-specific workspaces, contextual inspector sheet, status/risk chips, empty states, guardrail cards, timeline cards, and compact resource panels.
- Keep the navigation rail in the 72px to 84px range on desktop so labels remain readable without stealing workspace width.
- Do not render floating suggestion chips in the top bar. Search can switch modules, but it should not create a second visual command row.
- Dashboard is a compact landing page only. Do not render dashboard summaries inside every module, and keep dashboard content inside the module scroll region.
- Keep the contextual inspector collapsed by default. Open it only after explicit resource selection or inspector toggle. The default view of the inspector should be usage-first (showing displayName, short description, suitability, and copy prompts), while technical provenance, metadata quality, safety, token pressure, and paths must be hidden under collapsed secondary disclosures (accordions). Technical metadata must stay in inspector details.
- Skills must use a compact horizontal category rail (height 44-52px) with horizontal scrolling, and render only the selected group's summary in a single compact line below the rail.
- Skills grouping/source/quality toggles must be placed under an absolute Popover or Menu anchored to the "视图选项" button. The view option controls must not affect the height of the category rail or the list layout.
- Skills row height must be fixed (84-96px) and show enriched display name, original name as a small code pill, one concise purpose line, up to 2 use-case chips, and a single compact source summary badge (e.g. 多来源, Registry, 本地, 入口). Default rows must hide full paths and full source badges.
- Distilled skill families must support frontend family alias inheritance so child/example identities remain searchable by parent terms such as huashu, nuwa/nvwa, persona, perspective, 女娲, and 蒸馏.
- Skills rows and inspectors must use the local enriched display name, enriched description, and metadata quality status when source metadata is weak, while keeping original technical names and paths visible.
- Skills, MCP, Scripts, Reports, Project Packs, Policies, Validators, and Legacy must all follow the same visual consistency rules and layout rhythm: predicting row/card heights, using the 8px spacing grid, and keeping visible UI copy in Simplified Chinese.
- All non-Skills resource cards (MCP, Scripts, Reports, Project Packs, Policies, Validators, and Legacy) must be simplified: show only the user-facing title, the technical name as a small code pill, a single-line purpose description, and at most 2 chips (combining status/risk warnings and extra metadata), with selected states clearly marked. Remove dense metadata grids and path previews from default card bodies, and move them into the universal inspector. Reports and lists must be left-aligned and styled like a timeline/list rather than large centered cards.
- Keep user-facing UI copy in Simplified Chinese except original technical names such as `Codex`, `Claude`, `MCP`, package names, file paths, and command names.
- Show Chinese capability titles beside original technical names for skills and resources.



## Theme And Tokens

- The official product brand assets are `label.png` (browser tab favicon and small logo) and `logo.png` (large brand logo).
- The official AIOS primary brand color is `#dd752d`. Change global primary theme values to this token.
- Use `frontend/src/theme/materialTheme.ts` and `frontend/src/theme/designTokens.ts` as the source of visual tokens.
- AIOS Material Console must support global light and dark themes through centralized MUI tokens and AIOS CSS variables; do not leave mode-specific colors scattered in component files.
- Keep shell, density, surface, inspector, semantic status, and motion values centralized in tokens and CSS variables.
- Use MUI theme values for color, shape, typography, spacing, and component states.
- Avoid scattered one-off CSS values unless they express fixed shell or internal-scroll constraints.
- Use a Chinese-friendly system font stack with local `Noto Sans SC` fallback if available. Do not load remote fonts.
- Keep `html`, `body`, and `#root` at `100dvh` with overflow hidden. Use internal scroll regions only.

## Safety Boundaries

- Preserve local-only and read-only AIOS boundaries.
- Do not modify global Codex, Claude, Agents, MCP, provider, auth, credential, secret, or environment configuration.
- Keep changes inside `/Users/cc/.ai/AIOS`.
- Do not execute MCP servers from the UI or from scanner code.
- Preserve scanner path safety and snapshot write boundaries.

## Motion

- Use GSAP only for scoped, cleanup-safe micro-interactions.
- Use `useGSAP` with a local scope and automatic cleanup.
- Respect `prefers-reduced-motion`.
- Use only opacity and transform-based animation (`x`, `y`, `scale`).
- Use a transform-based selected navigation indicator. Do not animate width, height, top, left, grid-template values, or any other layout property.
- Animate module swaps, selected navigation indicator movement, first 12 visible cards, inspector changes, and copy feedback only.
- Do not use scroll animations or ScrollTrigger.
- Do not use blur, clip-path, broad stagger effects, premium GSAP plugins, or hundreds-of-card animations.
