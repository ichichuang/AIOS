import { alpha, createTheme } from "@mui/material/styles";
import { designTokens, type AiosResolvedColorMode, type AiosThemePalette } from "./designTokens";

export function createAiosMaterialTheme(resolvedMode: AiosResolvedColorMode) {
  const palette = designTokens.palettes[resolvedMode];

  return createTheme({
    palette: {
      mode: resolvedMode,
      primary: {
        main: palette.primary,
        dark: palette.primaryDark,
        light: palette.primarySoft,
        contrastText: resolvedMode === "dark" ? "#101418" : "#ffffff"
      },
      secondary: {
        main: palette.info,
        light: palette.infoSoft,
        contrastText: resolvedMode === "dark" ? "#101418" : "#ffffff"
      },
      background: {
        default: palette.background,
        paper: palette.surface
      },
      text: {
        primary: palette.text,
        secondary: palette.textMuted
      },
      success: {
        main: palette.success,
        light: palette.successSoft
      },
      warning: {
        main: palette.warning,
        light: palette.warningSoft
      },
      error: {
        main: palette.error,
        light: palette.errorSoft
      },
      divider: palette.outline
    },
    typography: {
      fontFamily: designTokens.fontFamily,
      allVariants: {
        letterSpacing: 0
      },
      h1: {
        fontSize: "1.75rem",
        lineHeight: 1.15,
        fontWeight: 700
      },
      h2: {
        fontSize: "1.35rem",
        lineHeight: 1.2,
        fontWeight: 700
      },
      h3: {
        fontSize: "1rem",
        lineHeight: 1.3,
        fontWeight: 700
      },
      body1: {
        lineHeight: 1.55
      },
      body2: {
        lineHeight: 1.5
      },
      button: {
        letterSpacing: 0,
        fontWeight: 700
      }
    },
    shape: {
      borderRadius: designTokens.radius.md
    },
    spacing: 8,
    components: createAiosComponentOverrides(resolvedMode, palette)
  });
}

export const materialTheme = createAiosMaterialTheme("light");

function createAiosComponentOverrides(resolvedMode: AiosResolvedColorMode, palette: AiosThemePalette) {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: resolvedMode,
          "--aios-bg": palette.background,
          "--aios-bg-alt": palette.backgroundAlt,
          "--aios-surface": palette.surface,
          "--aios-surface-raised": palette.surfaceRaised,
          "--aios-surface-muted": palette.surfaceMuted,
          "--aios-surface-hover": palette.surfaceHover,
          "--aios-selected-surface": palette.selectedSurface,
          "--aios-selected-outline": palette.selectedOutline,
          "--aios-outline": palette.outline,
          "--aios-outline-strong": palette.outlineStrong,
          "--aios-text": palette.text,
          "--aios-muted": palette.textMuted,
          "--aios-subtle": palette.textSubtle,
          "--aios-primary": palette.primary,
          "--aios-primary-dark": palette.primaryDark,
          "--aios-primary-soft": palette.primarySoft,
          "--aios-success": palette.success,
          "--aios-success-soft": palette.successSoft,
          "--aios-warning": palette.warning,
          "--aios-warning-soft": palette.warningSoft,
          "--aios-error": palette.error,
          "--aios-error-soft": palette.errorSoft,
          "--aios-info": palette.info,
          "--aios-info-soft": palette.infoSoft,
          "--aios-shadow": palette.shadowSurface,
          "--aios-shadow-lifted": palette.shadowLifted,
          "--aios-scrollbar-track": palette.scrollbarTrack,
          "--aios-scrollbar-thumb": palette.scrollbarThumb,
          "--aios-scrollbar-thumb-hover": palette.scrollbarThumbHover,
          "--aios-body-bg": palette.bodyBackground,
          "--aios-rail-width": `${designTokens.shell.railWidth}px`,
          "--aios-rail-compact-width": `${designTokens.shell.railCompactWidth}px`,
          "--aios-topbar-height": `${designTokens.shell.topbarHeight}px`,
          "--aios-inspector-width": `${designTokens.shell.inspectorWidth}px`,
          "--aios-inspector-max-width": `${designTokens.shell.inspectorMaxWidth}px`,
          "--aios-shell-gap": `${designTokens.shell.gap}px`,
          "--aios-shell-padding": `${designTokens.shell.viewportPadding}px`,
          "--aios-module-header": `${designTokens.shell.moduleHeaderHeight}px`,
          "--aios-summary-band": `${designTokens.shell.summaryBandHeight}px`,
          "--aios-controls-rail-height": `${designTokens.shell.controlsRailHeight}px`,
          "--aios-toolbar-height": `${designTokens.shell.compactToolbarHeight}px`,
          "--aios-category-rail-height": `${designTokens.shell.categoryRailHeight}px`,
          "--aios-standard-row-height": `${designTokens.shell.standardRowHeight}px`,
          "--aios-card-height": `${designTokens.shell.compactCardHeight}px`,
          "--aios-card-min-height": `${designTokens.shell.compactCardMinHeight}px`,
          "--aios-scroll-padding": `${designTokens.shell.internalScrollPadding}px`,
          "--aios-inspector-summary-max-height": `${designTokens.shell.inspectorFirstScreenSummaryMaxHeight}px`,
          "--aios-motion-fast": `${designTokens.motion.durationFast}s`,
          "--aios-motion-base": `${designTokens.motion.durationBase}s`,
          "--aios-module-content-padding": "16px",
          "--aios-card-padding-x": "16px",
          "--aios-card-padding-y": "14px",
          "--aios-row-min-height": "86px",
          "--aios-report-row-min-height": "76px",
          "--aios-card-gap": "10px",
          "--aios-section-gap": "14px",
          "--aios-row-padding": "var(--aios-card-padding-y) var(--aios-card-padding-x)",
          "--aios-report-row-height": "var(--aios-report-row-min-height)",
          "--aios-view-options-popover-width": "240px"
        },
        "*": {
          boxSizing: "border-box"
        },
        "html, body, #root": {
          width: "100%",
          height: "100dvh",
          minHeight: "100dvh",
          overflow: "hidden"
        },
        body: {
          margin: 0,
          minWidth: 320,
          color: palette.text,
          background: palette.bodyBackground
        },
        "button, input": {
          font: "inherit"
        },
        "button, .MuiButton-root": {
          letterSpacing: 0
        },
        code: {
          maxWidth: "100%",
          fontFamily: designTokens.monoFamily,
          fontSize: 12,
          overflowWrap: "anywhere",
          whiteSpace: "normal"
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: alpha(palette.surface, resolvedMode === "dark" ? 0.96 : 0.92),
          border: `1px solid ${palette.outline}`,
          borderRadius: designTokens.radius.lg,
          color: palette.text,
          boxShadow: palette.shadowSurface
        }
      }
    },
    MuiCard: {
      defaultProps: {
        variant: "outlined" as const
      },
      styleOverrides: {
        root: {
          borderColor: palette.outline,
          borderRadius: designTokens.radius.lg,
          backgroundImage: "none",
          boxShadow: "none",
          color: palette.text
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: palette.surface,
          backgroundImage: "none",
          color: palette.text
        }
      }
    },
    MuiChip: {
      defaultProps: {
        size: "small" as const
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          letterSpacing: 0
        },
        outlined: {
          borderColor: palette.outlineStrong,
          color: palette.textMuted
        },
        filled: {
          backgroundColor: palette.primarySoft,
          color: palette.primary
        }
      }
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          minHeight: 34,
          textTransform: "none"
        },
        outlined: {
          borderColor: palette.outlineStrong,
          color: palette.primary,
          "&:hover": {
            borderColor: palette.selectedOutline,
            backgroundColor: palette.primarySoft
          }
        },
        contained: {
          color: resolvedMode === "dark" ? "#101418" : "#ffffff"
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: palette.textMuted,
          "&:hover": {
            backgroundColor: palette.primarySoft,
            color: palette.primary
          }
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: "small" as const
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: palette.surface,
          color: palette.text,
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.outline
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.selectedOutline
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.primary
          }
        },
        input: {
          "&::placeholder": {
            color: palette.textSubtle,
            opacity: 1
          }
        }
      }
    },
    MuiTab: {
      styleOverrides: {
        root: {
          letterSpacing: 0,
          textTransform: "none"
        }
      }
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          border: `1px solid ${palette.outline}`,
          borderRadius: designTokens.radius.sm,
          backgroundColor: resolvedMode === "dark" ? "#edf2f7" : "#2f3136",
          color: resolvedMode === "dark" ? "#101418" : "#ffffff",
          fontSize: 12
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderColor: palette.outline,
          backgroundColor: palette.surfaceRaised,
          backgroundImage: "none",
          color: palette.text
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 10,
          borderRadius: 999,
          backgroundColor: palette.primarySoft
        },
        bar: {
          borderRadius: 999
        }
      }
    }
  };
}
