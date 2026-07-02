---
name: aios-ui-polish-react-gsap
description: "Project-local guidance for polishing the AIOS Control Center React UI with MUI and scoped GSAP."
---

# AIOS UI Polish With React, MUI, And GSAP

Use this skill only inside `/Users/cc/.ai/AIOS`.

## Repository Rules

- Keep every change inside `/Users/cc/.ai/AIOS`.
- Do not execute MCP servers.
- Do not change global AIOS state, global skill entrypoints, Codex automations, credentials, auth files, session files, provider config, model config, or environment files.
- Keep the Control Center local-only and read-only.
- Do not modify scanner read/write boundaries or global baseline logic.

## UI Copy

- Keep visible UI copy in Simplified Chinese.
- Preserve original technical names exactly, including skill names, package names, MCP server names, file paths, commands, resource IDs, and prompt bodies.
- Copied Codex and Claude execution prompts may remain English for reliability, but labels and explanations around those prompts must be Simplified Chinese.

## Visual System

- Use MUI as the primary UI system. Do not introduce Radix Themes, shadcn/ui, Tailwind as the main styling system, heavy admin templates, remote fonts, or external runtime assets.
- Prefer fixed viewport modular layouts over whole-page scrolling.
- Use compact module headers, a custom Material navigation rail, contextual drawer/side-sheet inspectors, command-style search, concise Chinese labels, and clear status badges.
- Keep hierarchy dense and readable; this is a local AI control center, not a marketing page.
- Avoid nested cards, repeated metric-card mosaics, and dense tables as the primary UI.
- Dashboard content belongs only on the dashboard. Other modules need specialized layouts.

## Motion

- Use `gsap` and `@gsap/react` for React animations.
- Register `useGSAP` once in a project-local motion helper.
- Scope animations with React refs.
- Rely on `useGSAP` cleanup through GSAP context.
- Respect `prefers-reduced-motion`.
- Animate only opacity and transform (`x`, `y`, `scale`). Do not use blur, filter, clip-path, layout animation, or broad stagger effects.
- Use explicit hooks for module switching, selected nav indicator, first-page card reveal, inspector changes, and copy feedback.
- Use timelines with defaults around `0.18s` to `0.26s`, `power2.out` or `power3.out`, and `overwrite: "auto"` where repeated interactions can stack tweens.
- Animate only visible or first-page card groups. Do not animate hundreds of cards at once.
- Do not use ScrollTrigger, scroll-driven animation, Draggable, Flip, SplitText, premium plugins, or remote animation assets.
