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
    selectedSurface: "#d8e8ff",
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
    railWidth: 80,
    railCompactWidth: 76,
    topbarHeight: 60,
    inspectorWidth: 376,
    inspectorMaxWidth: 392,
    gap: 12,
    viewportPadding: 12,
    moduleHeaderHeight: 58,
    summaryBandHeight: 72
  },
  density: {
    panelPadding: 14,
    cardPadding: 14,
    compactGap: 8,
    comfortableGap: 14
  },
  surface: {
    base: "#ffffff",
    soft: "#f8fafd",
    raised: "rgba(255, 255, 255, 0.94)",
    selected: "#d8e8ff"
  },
  motion: {
    durationFast: 0.18,
    durationBase: 0.22,
    durationSlow: 0.26,
    easeStandard: "power2.out",
    easeEmphasis: "power3.out"
  },
  inspector: {
    width: 376,
    maxWidth: 392,
    drawerHeight: "76dvh"
  },
  shadow: {
    surface: "0 1px 2px rgba(60, 64, 67, 0.10), 0 2px 4px rgba(60, 64, 67, 0.06)",
    lifted: "0 6px 16px rgba(60, 64, 67, 0.10)"
  },
  fontFamily:
    'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Noto Sans CJK SC", sans-serif',
  monoFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
} as const;

export type DesignTokens = typeof designTokens;
