# AIOS Material Console UI Defect Repair

## Status

GO

## Browser QA

- URL: `http://127.0.0.1:5175/`
- Browser route: in-app Browser unavailable (`agent.browsers.list()` returned `[]`); used Playwright Python with system Google Chrome.
- Page identity: `AIOS 控制中心`.
- Console warnings/errors: 0.
- Body-level scroll: none at 1440x900 desktop and 390x844 mobile; internal scroll regions remain in use.
- Rapid navigation switching: passed across 总览、技能库、MCP、脚本、报告、项目包、策略、验证器、旧入口.
- Dashboard launcher checks: required titles are visible and readable, including `前端与界面`, `小程序与移动端`, `设计美化与动效`, `技能蒸馏 / 人物视角`, `浏览器测试与截图`, `文档与知识库`, `本地系统与工具`.
- Inspector checks:
  - Dashboard empty state now shows contextual usage guidance.
  - Selected resource inspector primary panel uses `max-height: none` and `overflow: visible`.
  - `如何使用` is visible above technical accordions when prompts exist.
  - Technical details remain visually secondary and collapsed by default.
- Resource card checks:
  - MCP, 脚本, 验证器 cards show readable titles, code-pill technical names, purpose text, and at most 2 chips.
  - Default cards do not show path blocks.
  - Chip lanes do not dominate the text column.
- Report checks:
  - Dashboard recent reports and Reports module rows use the left-aligned timeline primitive.
  - Report rows show title + filename code pill, date + summary, at most 2 chips, and no full path preview.
- Skills checks:
  - View options popover open/close preserved module content height.
  - Category rail remained readable.
  - `nvwa`, `frontend`, and `top-ui` searches returned visible virtualized rows.

## Fixed Defects

1. Added a dedicated Dashboard capability launcher card so action chips and code pills no longer squeeze Chinese titles into fragments.
2. Removed broad quick-entry text truncation rules that affected unrelated launcher cards.
3. Replaced the blank inspector empty state with a compact contextual module guide.
4. Kept selected inspector content unclipped and kept `如何使用` above technical accordions.
5. Strengthened shared usage and timeline primitives for left alignment, padding, fixed chip lanes, and selected accents.
6. Increased resource card minimum widths and two-line purpose clamps for MCP, Scripts, Validators, Project Packs, Policies, and Legacy style cards.
7. Preserved Reports and recent reports on the same left-aligned timeline primitive with no default path preview.
8. Kept Skills view options and category rail from collapsing the virtualized list layout.

## Screenshot Paths

- `.ai/ui-snapshots/ui-defect-repair/dashboard-dark-readable-cards.png`
- `.ai/ui-snapshots/ui-defect-repair/dashboard-light-readable-cards.png`
- `.ai/ui-snapshots/ui-defect-repair/inspector-empty-dashboard.png`
- `.ai/ui-snapshots/ui-defect-repair/inspector-selected-resource.png`
- `.ai/ui-snapshots/ui-defect-repair/mcp-cards-readable.png`
- `.ai/ui-snapshots/ui-defect-repair/scripts-cards-readable.png`
- `.ai/ui-snapshots/ui-defect-repair/validators-cards-readable.png`
- `.ai/ui-snapshots/ui-defect-repair/reports-left-aligned.png`
- `.ai/ui-snapshots/ui-defect-repair/skills-options-open-stable.png`
- `.ai/ui-snapshots/ui-defect-repair/skills-nvwa-search.png`
- `.ai/ui-snapshots/ui-defect-repair/mobile-390x844.png`

## GSAP Verification

- `frontend/src/lib/useAiosMotion.ts` remains limited to scoped opacity/transform motion for selected nav indicator, module swaps, inspector content switches, and copy feedback.
- No GSAP tween animates width, height, top, left, grid-template, box-shadow, filter, blur, clip-path, scroll, or react-window row transforms.
- `useGSAP` scoped cleanup remains in place.
- `contextSafe` remains used for event-triggered copy feedback.
- Repeatable tweens keep `overwrite: "auto"`.
- `prefers-reduced-motion` is respected.

## Remaining Visual Risks

- Vite still reports the existing large chunk warning during frontend build; this pass did not change bundling.
- Inventory-dependent counts and report filenames may change when the generated snapshot changes.
- Very long technical names are intentionally kept in single-line code pills with ellipsis in default rows.
- On narrow mobile widths, bottom navigation labels are horizontally constrained by viewport size.

## Final Decision

GO
