import { CssBaseline, ThemeProvider } from "@mui/material";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { zhCN } from "../i18n/zh-CN";
import { aiosColorModeStorageKey, type AiosResolvedColorMode, type AiosThemePreference } from "./designTokens";
import { createAiosMaterialTheme } from "./materialTheme";

interface AiosThemeModeContextValue {
  mode: AiosThemePreference;
  resolvedMode: AiosResolvedColorMode;
  modeLabel: string;
  setMode: (mode: AiosThemePreference) => void;
  cycleMode: () => void;
}

const AiosThemeModeContext = createContext<AiosThemeModeContextValue | null>(null);

interface AiosThemeProviderProps {
  children: ReactNode;
}

export function AiosThemeProvider({ children }: AiosThemeProviderProps) {
  const [mode, setModeState] = useState<AiosThemePreference>(() => readStoredMode());
  const systemMode = useSystemColorMode();
  const resolvedMode = mode === "system" ? systemMode : mode;
  const theme = useMemo(() => createAiosMaterialTheme(resolvedMode), [resolvedMode]);

  useEffect(() => {
    writeStoredMode(mode);
  }, [mode]);

  useEffect(() => {
    document.documentElement.dataset.aiosColorMode = resolvedMode;
    document.documentElement.style.colorScheme = resolvedMode;
  }, [resolvedMode]);

  const setMode = useCallback((nextMode: AiosThemePreference) => setModeState(nextMode), []);
  const cycleMode = useCallback(() => {
    setModeState((currentMode) => {
      if (currentMode === "light") return "dark";
      if (currentMode === "dark") return "system";
      return "light";
    });
  }, []);

  const value = useMemo<AiosThemeModeContextValue>(
    () => ({
      mode,
      resolvedMode,
      modeLabel: themeModeLabels[mode],
      setMode,
      cycleMode
    }),
    [cycleMode, mode, resolvedMode, setMode]
  );

  return (
    <AiosThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AiosThemeModeContext.Provider>
  );
}

export function useAiosThemeMode(): AiosThemeModeContextValue {
  const context = useContext(AiosThemeModeContext);
  if (!context) throw new Error("useAiosThemeMode must be used within AiosThemeProvider");
  return context;
}

const themeModeLabels: Record<AiosThemePreference, string> = {
  light: zhCN.theme.light,
  dark: zhCN.theme.dark,
  system: zhCN.theme.system
};

function useSystemColorMode(): AiosResolvedColorMode {
  const [systemMode, setSystemMode] = useState<AiosResolvedColorMode>(() => getSystemColorMode());

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemMode(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return systemMode;
}

function getSystemColorMode(): AiosResolvedColorMode {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredMode(): AiosThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const storedMode = window.localStorage.getItem(aiosColorModeStorageKey);
    return isAiosThemePreference(storedMode) ? storedMode : "system";
  } catch {
    return "system";
  }
}

function writeStoredMode(mode: AiosThemePreference): void {
  try {
    window.localStorage.setItem(aiosColorModeStorageKey, mode);
  } catch {
    // Private browsing or locked storage should not block theme switching.
  }
}

function isAiosThemePreference(value: string | null): value is AiosThemePreference {
  return value === "light" || value === "dark" || value === "system";
}
