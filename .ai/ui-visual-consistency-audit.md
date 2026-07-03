# AIOS UI Visual Consistency Audit

## Visual Check Context & Limitation
The automated browser subagent could not be initialized because the sandbox browser environment requires Linux (current sandbox environment is macOS). Therefore, automated viewport capturing was skipped.

## Modules Redesigned & Fixed
1. **ResourceCard (`ResourceCard.tsx`):**
   - Simplified all non-Skills resource cards (MCP, Scripts, Reports, Project Packs, Policies, Validators, Legacy) to conform to the usage-first pattern.
   - Removed all dense metadata grids and path details from the card bodies.
   - Added a systematic chip filter that restricts the total number of status/risk/info chips on any card to **at most 2**.
   - Kept selected/hover state outlines and card min-height uniform.

2. **ResourceInspector (`ResourceInspector.tsx`):**
   - Universalized the usage-first inspector design for all resource types.
   - First viewport renders only user-relevant text (displayName, technicalName code-pill, short description, suitability chips).
   - Conditionally mounts the `"如何使用"` prompt accordion only if copying prompts is relevant (i.e. `prompts.length > 0`), avoiding empty accordion placeholders.
   - Keeps all diagnostic/technical details collapsed by default inside designated accordions (`概览`, `元数据质量`, `来源与路径`, `安全与风险`, `Token 压力`).

3. **PoliciesModule (`PoliciesModule.tsx`):**
   - Redesigned the safety boundaries list into a clean, modern grid of **"规则 cards"**.
   - Formatted each card with a clear title outlining the protection domain (e.g. `数据源写保护`, `运行基线限制`) and a body describing the specific constraint.

4. **ValidatorsModule (`ValidatorsModule.tsx`):**
   - Styled all validator notices and known warnings as structured **"检查项"**.
   - Handled known warnings and warnings in a calm, non-disruptive card format using soft warning background colors.

5. **LegacyModule (`LegacyModule.tsx`):**
   - Set cards inside the legacy module to display warning/compatibility badges as neutral footnotes.

6. **Layout Variables (`designTokens.ts` & `materialTheme.ts`):**
   - Added layout CSS variables for row heights, toolbar heights, card min-heights, and inspector max-height constraints to eliminate ad-hoc CSS.

---

## Verification Summary
- **TypeScript Typecheck**: Checked and compiled successfully.
- **Unit Tests**: All unit tests passed.
- **Vite Build**: Succeeded, generating optimized production bundles.
- **Git Check**: `git diff --check` reported clean whitespace structure.

## Recommendations for Manual Verification
Since the automated chrome driver could not start on macOS, please run `pnpm dev` locally on your machine and visit `http://127.0.0.1:5177/` (or the printed local address) to perform a visual smoke test:
1. Verify the layout looks clean at `1440x900`, `1200x820`, and `390x844` viewports.
2. Confirm clicking cards opens the inspector panel on the right, and the accordions are collapsed by default.
3. Test that there is no body-level scrollbar.
