export interface ProductRowsMismatchDiagnosticInput {
  summaryCount: number;
  rowCount: number;
  query: string;
  statusFilterActive: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Deterministic height helper for product list containers.
 *
 * This function is intentionally simple: it returns a pixel height based on the
 * number of rows and a fixed row height, capped at a maximum number of visible
 * rows. It no longer drives absolute-positioned virtual lists; it is only used
 * as an optional max-height hint for normal document-flow lists so that rows
 * cannot produce stacked empty border bands when the surrounding container has
 * not finished measuring.
 */
export function productVirtualListHeight(rowCount: number, rowHeight: number, maxVisibleRows = 8): string {
  const safeRows = Math.max(0, Math.floor(rowCount));
  const safeRowHeight = Math.max(0, Math.floor(rowHeight));
  const safeMaxRows = Math.max(1, Math.floor(maxVisibleRows));
  const height = Math.min(safeRows, safeMaxRows) * safeRowHeight;
  if (height <= 0) return "0px";
  if (safeRows <= safeMaxRows) return `${height}px`;
  return `min(${height}px, var(--aios-module-scroll-body-height, ${height}px))`;
}

export function shouldShowProductRowsMismatchDiagnostic(input: ProductRowsMismatchDiagnosticInput): boolean {
  return input.summaryCount > 0 && input.rowCount === 0 && input.query.trim().length === 0 && !input.statusFilterActive && !input.loading && !input.error;
}

/**
 * Ensures a product list only renders rows backed by real items.
 *
 * This guard rejects any virtual/measured fallback that would create empty
 * placeholder rows, zero-height rows, or rows without meaningful content.
 */
export function isValidProductListInput<T>(items: readonly T[]): items is T[] {
  return Array.isArray(items) && items.every((item) => item !== null && item !== undefined);
}
