---
name: aios-google-material-style
description: Use for AIOS Control Center frontend work that must follow the project-local Google Material-inspired style system.
---

# AIOS Material Console V2

Use Material UI as the primary React UI framework for this repository. Build AIOS Control Center V2 surfaces with MUI theme tokens, MUI layout primitives, and MUI components before adding custom CSS.

## Design Direction

- Follow AIOS Material Console V2: fixed-viewport, search-first, calm Google-style local AI capability command center.
- Keep the interface product-like, modular, Chinese-friendly, and read-only. It must not feel like a generic admin dashboard.
- Use a left navigation rail, compact top command bar, module-specific workspaces, contextual inspector sheet, status/risk chips, empty states, guardrail cards, timeline cards, and compact resource panels.
- Dashboard is a compact landing page only. Do not render dashboard summaries inside every module.
- Skills, MCP, Scripts, Reports, Project Packs, Policies, Validators, and Legacy need specialized module layouts rather than one generic card wall.
- Keep user-facing UI copy in Simplified Chinese except original technical names such as `Codex`, `Claude`, `MCP`, package names, file paths, and command names.
- Show Chinese capability titles beside original technical names for skills and resources.

## Theme And Tokens

- Use `frontend/src/theme/materialTheme.ts` and `frontend/src/theme/designTokens.ts` as the source of visual tokens.
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
- Use a transform-based selected navigation indicator. Do not animate layout.
- Animate module swaps, first-page card reveal, inspector changes, and copy feedback only.
- Do not use scroll animations or ScrollTrigger.
- Do not use blur, clip-path, broad stagger effects, premium GSAP plugins, or hundreds-of-card animations.
