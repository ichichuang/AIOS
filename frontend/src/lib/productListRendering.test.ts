import assert from "node:assert/strict";
import { isValidProductListInput, productVirtualListHeight, shouldShowProductRowsMismatchDiagnostic } from "./productListRendering";

assert.equal(productVirtualListHeight(0, 96), "0px");
assert.equal(productVirtualListHeight(1, 96), "96px");
assert.equal(productVirtualListHeight(8, 96), "768px");
assert.equal(productVirtualListHeight(20, 96), "min(768px, var(--aios-module-scroll-body-height, 768px))");

assert.equal(
  shouldShowProductRowsMismatchDiagnostic({ summaryCount: 1, rowCount: 0, query: "", statusFilterActive: false, loading: false, error: null }),
  true
);
assert.equal(
  shouldShowProductRowsMismatchDiagnostic({ summaryCount: 1, rowCount: 0, query: "writer", statusFilterActive: false, loading: false, error: null }),
  false
);
assert.equal(
  shouldShowProductRowsMismatchDiagnostic({ summaryCount: 1, rowCount: 0, query: "", statusFilterActive: true, loading: false, error: null }),
  false
);
assert.equal(
  shouldShowProductRowsMismatchDiagnostic({ summaryCount: 1, rowCount: 0, query: "", statusFilterActive: false, loading: true, error: null }),
  false
);
assert.equal(
  shouldShowProductRowsMismatchDiagnostic({ summaryCount: 0, rowCount: 0, query: "", statusFilterActive: false, loading: false, error: null }),
  false
);

assert.equal(isValidProductListInput([]), true);
assert.equal(isValidProductListInput([{ id: "a" }]), true);
assert.equal(isValidProductListInput([{ id: "a" }, null as unknown as { id: string }]), false);
assert.equal(isValidProductListInput([{ id: "a" }, undefined as unknown as { id: string }]), false);

console.log("productListRendering tests passed");
