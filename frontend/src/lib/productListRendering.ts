export interface ProductRowsMismatchDiagnosticInput {
  summaryCount: number;
  rowCount: number;
  query: string;
  statusFilterActive: boolean;
  loading: boolean;
  error: string | null;
}

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
