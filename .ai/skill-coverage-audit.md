# AIOS Skill Coverage Audit

Date: 2026-07-02
Scope: read-only metadata audit for skill manifests under `/Users/cc/.ai` and active entrypoint directories.

No full `SKILL.md` bodies, secrets, environment values, or credential material were copied into this report.

## Source Counts

| Source | Count | Notes |
| --- | ---: | --- |
| `/Users/cc/.ai/SKILLS_INDEX.json` | 69 | Canonical shared skill records. |
| `/Users/cc/.ai/state/custom-skill-registry.json` `skills[]` | 92 | Registry records now expand to individual inventory resources. |
| Bounded direct `SKILL.md` discovery | 91 | 346 directories visited; symlinked directories skipped. |
| Active Codex entrypoints | 19 | Top-level directories under `/Users/cc/.codex/skills`, excluding `.system`. |
| Active Agents entrypoints | 19 | Top-level directories under `/Users/cc/.agents/skills`. |
| Active Claude entrypoints | 72 | Top-level directories/symlinked directories under `/Users/cc/.claude/skills`. |
| Generated AIOS inventory resources | 285 | Includes 92 `skill` resources and 25 `project-pack` resources. |

## Direct Discovery Roots

| Root | Manifests |
| --- | ---: |
| `/Users/cc/.ai/skills` | 0 |
| `/Users/cc/.ai/skill-modules` | 89 |
| `/Users/cc/.ai/distilled-skills` | 0 |
| `/Users/cc/.ai/generated-skills` | 0 |
| `/Users/cc/.ai/skill-packs` | 0 |
| `/Users/cc/.ai/archive` | 0 |
| `/Users/cc/.ai/archives` | 0 |
| `/Users/cc/.ai/90-archive` | 0 |
| `/Users/cc/.ai/AIOS/.agents/skills` | 2 |

## `huashu` / `nvwa` Finding

| Check | Result |
| --- | --- |
| Filesystem manifest | Present at `/Users/cc/.ai/skill-modules/07-knowledge-research/huashu-nuwa/SKILL.md`. |
| Distilled example manifests | 20 present under `/Users/cc/.ai/skill-modules/07-knowledge-research/huashu-nuwa/examples/*/SKILL.md`. |
| `SKILLS_INDEX.json` | Present as `huashu-nuwa`, with aliases including `nvwa`, `nvwa.skill`, `女娲`, and `蒸馏`. |
| Custom registry | Present as `huashu-nuwa`; registry also lists the 20 distilled perspective skills. |
| Codex active entrypoint | Not present. |
| Agents active entrypoint | Not present. |
| Claude active entrypoint | Present as `huashu-nuwa` via an active symlinked directory. |
| Generated inventory | Present as canonical `huashu-nuwa`; metadata aliases include `huashu-nvwa`, `nvwa`, and `nvwa.skill`. |

## Root Cause

Before this change, `scanSkills()` only emitted canonical `SKILLS_INDEX.json` records, a single `custom-skill-registry.json` file resource, and top-level active entrypoint views. It did not expand `custom-skill-registry.json` `skills[]` records and did not directly discover bounded `SKILL.md` manifests under `/Users/cc/.ai`, so distilled registry skills could not appear as individual Control Center resources.

## Fix Summary

- Added bounded, read-only `SKILL.md` discovery with depth, count, byte, skip-directory, and no-symlink limits.
- Added safe manifest metadata parsing for frontmatter and heading fallback.
- Expanded registry `skills[]` into individual `AiosResource` records.
- Deduplicated by normalized manifest path first, then normalized skill name, while preserving canonical `SKILLS_INDEX` records.
- Merged source metadata: `indexed`, `registryListed`, `activeEntrypoint`, `discoveredOnly`, `distillationRelated`, `manifestPath`, `discoveryRoot`, and `sourceKinds`.
- Kept discovered skills as metadata only; no skills were executed, copied, promoted, or written into global entrypoints.
