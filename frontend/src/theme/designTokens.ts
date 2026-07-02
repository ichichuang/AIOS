export const designTokens = {
  color: {
    googleBlue: "#1a73e8",
    googleBlueDark: "#1558b0",
    googleBlueSoft: "#e8f0fe",
    background: "#f6f8fc",
    backgroundAlt: "#eef3f9",
    surface: "#ffffff",
    surfaceMuted: "#f8fafd",
    outline: "rgba(60, 64, 67, 0.16)",
    outlineStrong: "rgba(60, 64, 67, 0.26)",
    text: "#1f1f1f",
    textMuted: "#5f6368",
    textSubtle: "#7b818a",
    success: "#137333",
    successSoft: "#e6f4ea",
    warning: "#b06000",
    warningSoft: "#fef7e0",
    error: "#b3261e",
    errorSoft: "#fce8e6",
    info: "#00796b",
    infoSoft: "#e0f2f1"
  },
  radius: {
    xs: 8,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28
  },
  shell: {
    railWidth: 92,
    railCompactWidth: 82,
    inspectorWidth: 376,
    inspectorMaxWidth: 392,
    gap: 14,
    viewportPadding: 14,
    moduleHeaderHeight: 64,
    summaryBandHeight: 96
  },
  density: {
    panelPadding: 14,
    cardPadding: 14,
    compactGap: 8,
    comfortableGap: 14
  },
  shadow: {
    surface: "0 1px 2px rgba(60, 64, 67, 0.14), 0 2px 6px rgba(60, 64, 67, 0.08)",
    lifted: "0 12px 30px rgba(60, 64, 67, 0.12)"
  },
  fontFamily:
    'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Noto Sans CJK SC", sans-serif',
  monoFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
} as const;

export type DesignTokens = typeof designTokens;
