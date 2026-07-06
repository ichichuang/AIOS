export type AiosResolvedColorMode = "light" | "dark";
export type AiosThemePreference = AiosResolvedColorMode | "system";

export interface AiosThemePalette {
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  surfaceHover: string;
  selectedSurface: string;
  selectedOutline: string;
  outline: string;
  outlineStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  error: string;
  errorSoft: string;
  info: string;
  infoSoft: string;
  shadowSurface: string;
  shadowLifted: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  bodyBackground: string;
}

export const aiosColorModeStorageKey = "aios-color-mode";

export const aiosThemePalettes: Record<AiosResolvedColorMode, AiosThemePalette> = {
  light: {
    background: "#f6f8fc",
    backgroundAlt: "#eef3f9",
    surface: "#ffffff",
    surfaceRaised: "rgba(255, 255, 255, 0.94)",
    surfaceMuted: "#f8fafd",
    surfaceHover: "#ffffff",
    selectedSurface: "#fff8f2",
    selectedOutline: "rgba(196, 107, 43, 0.30)",
    outline: "rgba(60, 64, 67, 0.16)",
    outlineStrong: "rgba(60, 64, 67, 0.26)",
    text: "#1f1f1f",
    textMuted: "#5f6368",
    textSubtle: "#7b818a",
    primary: "#c46b2b",
    primaryDark: "#9f5522",
    primarySoft: "#fff5ee",
    success: "#137333",
    successSoft: "#e6f4ea",
    warning: "#b06000",
    warningSoft: "#fff8e7",
    error: "#b3261e",
    errorSoft: "#fce8e6",
    info: "#00796b",
    infoSoft: "#e0f2f1",
    shadowSurface: "0 1px 2px rgba(60, 64, 67, 0.10), 0 2px 4px rgba(60, 64, 67, 0.06)",
    shadowLifted: "0 6px 16px rgba(60, 64, 67, 0.10)",
    scrollbarTrack: "rgba(60, 64, 67, 0.06)",
    scrollbarThumb: "rgba(60, 64, 67, 0.24)",
    scrollbarThumbHover: "rgba(60, 64, 67, 0.36)",
    bodyBackground: "linear-gradient(135deg, #f6f8fc 0%, #eef3f9 100%)"
  },
  dark: {
    background: "#101418",
    backgroundAlt: "#151b22",
    surface: "#1b2128",
    surfaceRaised: "rgba(27, 33, 40, 0.96)",
    surfaceMuted: "#202832",
    surfaceHover: "#252f3a",
    selectedSurface: "#2a2622",
    selectedOutline: "rgba(242, 167, 109, 0.30)",
    outline: "rgba(218, 220, 224, 0.14)",
    outlineStrong: "rgba(218, 220, 224, 0.26)",
    text: "#e8eaed",
    textMuted: "#bdc1c6",
    textSubtle: "#9aa0a6",
    primary: "#f2a76d",
    primaryDark: "#c46b2b",
    primarySoft: "#2d251f",
    success: "#81c995",
    successSoft: "#182d20",
    warning: "#fdd663",
    warningSoft: "#302b1d",
    error: "#f28b82",
    errorSoft: "#44201d",
    info: "#78d9c5",
    infoSoft: "#173330",
    shadowSurface: "0 1px 2px rgba(0, 0, 0, 0.30), 0 8px 24px rgba(0, 0, 0, 0.22)",
    shadowLifted: "0 10px 28px rgba(0, 0, 0, 0.32)",
    scrollbarTrack: "rgba(232, 234, 237, 0.05)",
    scrollbarThumb: "rgba(232, 234, 237, 0.28)",
    scrollbarThumbHover: "rgba(232, 234, 237, 0.40)",
    bodyBackground: "linear-gradient(135deg, #101418 0%, #151b22 100%)"
  }
} as const;

export const designTokens = {
  palettes: aiosThemePalettes,
  color: {
    googleBlue: aiosThemePalettes.light.primary,
    googleBlueDark: aiosThemePalettes.light.primaryDark,
    googleBlueSoft: aiosThemePalettes.light.primarySoft,
    background: aiosThemePalettes.light.background,
    backgroundAlt: aiosThemePalettes.light.backgroundAlt,
    surface: aiosThemePalettes.light.surface,
    surfaceMuted: aiosThemePalettes.light.surfaceMuted,
    outline: aiosThemePalettes.light.outline,
    outlineStrong: aiosThemePalettes.light.outlineStrong,
    selectedSurface: aiosThemePalettes.light.selectedSurface,
    text: aiosThemePalettes.light.text,
    textMuted: aiosThemePalettes.light.textMuted,
    textSubtle: aiosThemePalettes.light.textSubtle,
    success: aiosThemePalettes.light.success,
    successSoft: aiosThemePalettes.light.successSoft,
    warning: aiosThemePalettes.light.warning,
    warningSoft: aiosThemePalettes.light.warningSoft,
    error: aiosThemePalettes.light.error,
    errorSoft: aiosThemePalettes.light.errorSoft,
    info: aiosThemePalettes.light.info,
    infoSoft: aiosThemePalettes.light.infoSoft
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
    summaryBandHeight: 72,
    controlsRailHeight: 38,
    compactToolbarHeight: 38,
    categoryRailHeight: 48,
    standardRowHeight: 90,
    compactCardHeight: 72,
    compactCardMinHeight: 72,
    inspectorFirstScreenSummaryMaxHeight: 180,
    internalScrollPadding: 12
  },
  density: {
    panelPadding: 14,
    cardPadding: 14,
    compactGap: 8,
    comfortableGap: 14
  },
  surface: {
    base: aiosThemePalettes.light.surface,
    soft: aiosThemePalettes.light.surfaceMuted,
    raised: aiosThemePalettes.light.surfaceRaised,
    selected: aiosThemePalettes.light.selectedSurface
  },
  motion: {
    durationFast: 0.34,
    durationBase: 0.42,
    durationSlow: 0.6,
    durationHover: 0.42,
    durationHoverExit: 0.36,
    durationSelected: 0.56,
    durationReveal: 0.58,
    durationPanel: 0.48,
    durationPress: 0.15,
    easeStandard: "power3.out",
    easeEmphasis: "expo.out"
  },
  inspector: {
    width: 376,
    maxWidth: 392,
    drawerHeight: "76dvh"
  },
  shadow: {
    surface: aiosThemePalettes.light.shadowSurface,
    lifted: aiosThemePalettes.light.shadowLifted
  },
  fontFamily:
    'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", "Noto Sans CJK SC", sans-serif',
  monoFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
} as const;

export type DesignTokens = typeof designTokens;
