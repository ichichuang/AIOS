interface AiosPerfMark {
  name: string;
  at: number;
  detail?: Record<string, string | number | boolean | null>;
}

interface AiosPerfApi {
  marks: AiosPerfMark[];
  mark: typeof markAiosPerf;
  clear: () => void;
}

declare global {
  interface Window {
    __AIOS_PERF__?: AiosPerfApi;
  }
}

const MAX_MARKS = 80;
const AIOS_PERF_DEV = import.meta.env.DEV;

export function markAiosPerf(name: string, detail?: AiosPerfMark["detail"]): void {
  if (!isPerfEnabled()) return;

  const store =
    window.__AIOS_PERF__ ??
    (window.__AIOS_PERF__ = {
      marks: [],
      mark: markAiosPerf,
      clear: () => {
        window.__AIOS_PERF__?.marks.splice(0);
      }
    });

  store.marks.push({
    name,
    at: Math.round(performance.now() * 100) / 100,
    detail
  });

  if (store.marks.length > MAX_MARKS) {
    store.marks.splice(0, store.marks.length - MAX_MARKS);
  }

  performance.mark?.(`aios:${name}`);
}

function isPerfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return AIOS_PERF_DEV || window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
}
