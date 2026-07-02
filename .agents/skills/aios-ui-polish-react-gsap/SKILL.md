---
name: aios-ui-polish-react-gsap
description: "Project-local guidance for polishing the AIOS Control Center React UI with Radix Themes and GSAP."
---

# AIOS UI Polish With React, Radix Themes, And GSAP

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

- Use Radix Themes for visual components when it improves structure, accessibility, or consistency.
- Prefer fixed viewport modular layouts over whole-page scrolling.
- Use compact cards, segmented navigation, drawer-like inspectors, tabs, command-style search, concise Chinese labels, and clear status badges.
- Keep hierarchy dense and readable; this is a local AI control center, not a marketing page.
- Do not install or run shadcn/ui in this repository.

## Motion

- Use `gsap` and `@gsap/react` for React animations.
- Register `useGSAP` once in a project-local motion helper.
- Scope animations with React refs.
- Rely on `useGSAP` cleanup through GSAP context.
- Respect `prefers-reduced-motion`.
- Animate opacity, transform, scale, and clip-path rather than layout properties.
- Use lightweight transitions for module switching, detail panel changes, card entrance, and copy feedback.
- Do not use scroll-driven animations or ScrollTrigger in Phase 1.1.
