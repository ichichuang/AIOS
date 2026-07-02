---
name: aios-google-material-style
description: Use for AIOS Control Center frontend work that must follow the project-local Google Material-inspired style system.
---

# AIOS Google Material Style

Use Material UI as the primary React UI framework for this repository. Build AIOS Control Center surfaces with MUI theme tokens, MUI layout primitives, and MUI components before adding custom CSS.

## Design Direction

- Follow a Google Material-inspired local control center style: clean surfaces, soft elevation, rounded containers, clear density rules, useful whitespace, restrained color, responsive panels, and Material motion.
- Keep the interface product-like, not admin-table-like.
- Prefer AppBar, navigation rail, cards, chips, tabs, drawers or side sheets, command search, empty states, summary cards, timeline cards, and focused inspector panels.
- Keep user-facing UI copy in Simplified Chinese except original technical names such as `Codex`, `Claude`, `MCP`, package names, file paths, and command names.
- Show Chinese capability titles beside original technical names for skills and resources.

## Theme And Tokens

- Use `frontend/src/theme/materialTheme.ts` and `frontend/src/theme/designTokens.ts` as the source of visual tokens.
- Use MUI theme values for color, shape, typography, spacing, and component states.
- Avoid scattered one-off CSS values unless they express layout constraints that are not theme tokens.
- Use a Chinese-friendly system font stack with local `Noto Sans SC` fallback if available. Do not load remote fonts.

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
- Prefer opacity and transform transitions.
- Do not use scroll animations or ScrollTrigger.
