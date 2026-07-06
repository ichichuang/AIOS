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
          "--aios-text-muted": palette.textMuted,
          "--aios-muted": palette.textMuted,
          "--aios-subtle": palette.textSubtle,
          "--aios-primary": palette.primary,
          "--aios-primary-dark": palette.primaryDark,
          "--aios-primary-soft": palette.primarySoft,
          "--aios-accent": palette.primary,
          "--aios-accent-soft": palette.primarySoft,
          "--aios-accent-border": alpha(palette.primary, resolvedMode === "dark" ? 0.36 : 0.28),
          "--aios-selected-bg": palette.selectedSurface,
          "--aios-selected-border": alpha(palette.primary, resolvedMode === "dark" ? 0.32 : 0.24),
          "--aios-selected-marker": alpha(palette.primary, resolvedMode === "dark" ? 0.72 : 0.62),
          "--aios-success": palette.success,
          "--aios-success-soft": palette.successSoft,
          "--aios-success-bg": palette.successSoft,
          "--aios-success-border": alpha(palette.success, resolvedMode === "dark" ? 0.34 : 0.24),
          "--aios-warning": palette.warning,
          "--aios-warning-soft": palette.warningSoft,
          "--aios-warning-bg": palette.warningSoft,
          "--aios-warning-border": alpha(palette.warning, resolvedMode === "dark" ? 0.36 : 0.28),
          "--aios-error": palette.error,
          "--aios-error-soft": palette.errorSoft,
          "--aios-error-bg": palette.errorSoft,
          "--aios-error-border": alpha(palette.error, resolvedMode === "dark" ? 0.34 : 0.24),
          "--aios-info": palette.info,
          "--aios-info-soft": palette.infoSoft,
          "--aios-info-bg": palette.infoSoft,
          "--aios-info-border": alpha(palette.info, resolvedMode === "dark" ? 0.34 : 0.24),
          "--aios-neutral-chip-bg": palette.surfaceMuted,
          "--aios-neutral-chip-border": palette.outline,
          "--aios-chip-text": palette.textMuted,
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
          "--aios-motion-slow": `${designTokens.motion.durationSlow}s`,
          "--aios-motion-hover": `${designTokens.motion.durationHover}s`,
          "--aios-motion-hover-exit": `${designTokens.motion.durationHoverExit}s`,
          "--aios-motion-selected": `${designTokens.motion.durationSelected}s`,
          "--aios-motion-reveal": `${designTokens.motion.durationReveal}s`,
          "--aios-motion-panel": `${designTokens.motion.durationPanel}s`,
          "--aios-motion-press": `${designTokens.motion.durationPress}s`,
          "--aios-motion-ease": "cubic-bezier(0.22, 1, 0.36, 1)",
          "--aios-motion-emphasis": "cubic-bezier(0.16, 1, 0.3, 1)",
          "--aios-motion-press-ease": "cubic-bezier(0.2, 0, 0, 1)",
          "--aios-transition-hover": "var(--aios-motion-hover) var(--aios-motion-ease)",
          "--aios-transition-selected": "var(--aios-motion-selected) var(--aios-motion-emphasis)",
          "--aios-transition-reveal": "var(--aios-motion-reveal) var(--aios-motion-ease)",
          "--aios-transition-press": "var(--aios-motion-press) var(--aios-motion-press-ease)",
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
          fontSize: 12
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
          letterSpacing: 0,
          border: `1px solid ${palette.outline}`,
          "&.MuiChip-colorPrimary": {
            borderColor: alpha(palette.primary, resolvedMode === "dark" ? 0.32 : 0.24),
            backgroundColor: palette.selectedSurface,
            color: palette.primary
          },
          "&.MuiChip-colorWarning": {
            borderColor: alpha(palette.warning, resolvedMode === "dark" ? 0.36 : 0.28),
            backgroundColor: palette.warningSoft,
            color: palette.warning
          }
        },
        outlined: {
          borderColor: palette.outline,
          backgroundColor: "transparent",
          color: palette.textMuted
        },
        filled: {
          borderColor: palette.outline,
          backgroundColor: palette.surfaceMuted,
          color: palette.textMuted
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
          textTransform: "none",
          transition:
            "background-color var(--aios-transition-hover), border-color var(--aios-transition-hover), box-shadow var(--aios-transition-hover)",
          "&:active": {
            transform: "translateY(1px) scale(0.992)",
            transition: "transform var(--aios-transition-press), background-color var(--aios-transition-hover), border-color var(--aios-transition-hover), box-shadow var(--aios-transition-hover)"
          },
          "&:focus-visible": {
            outline: `2px solid ${palette.primary}`,
            outlineOffset: 2
          }
        },
        outlined: {
          borderColor: palette.outlineStrong,
          color: palette.primary,
          "&:hover": {
            borderColor: alpha(palette.primary, resolvedMode === "dark" ? 0.36 : 0.28),
            backgroundColor: palette.selectedSurface
          },
          "&.Mui-disabled": {
            borderColor: palette.outline,
            color: palette.textSubtle,
            backgroundColor: "transparent"
          }
        },
        contained: {
          backgroundColor: palette.primary,
          color: resolvedMode === "dark" ? "#101418" : "#ffffff",
          "&:hover": {
            backgroundColor: palette.primaryDark
          },
          "&.Mui-disabled": {
            backgroundColor: palette.surfaceMuted,
            color: palette.textSubtle
          }
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: palette.textMuted,
          transition:
            "background-color var(--aios-transition-hover), border-color var(--aios-transition-hover), color var(--aios-transition-hover)",
          "&:hover": {
            backgroundColor: palette.selectedSurface,
            color: palette.primary
          },
          "&:active": {
            transform: "translateY(1px) scale(0.992)",
            transition: "transform var(--aios-transition-press), background-color var(--aios-transition-hover), border-color var(--aios-transition-hover), color var(--aios-transition-hover)"
          },
          "&:focus-visible": {
            outline: `2px solid ${palette.primary}`,
            outlineOffset: 2
          }
        }
      }
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          transition:
            "background-color var(--aios-transition-hover), border-color var(--aios-transition-hover), color var(--aios-transition-hover), box-shadow var(--aios-transition-hover)",
          "&:active": {
            transform: "translateY(1px) scale(0.992)",
            transition: "transform var(--aios-transition-press), background-color var(--aios-transition-hover), border-color var(--aios-transition-hover), color var(--aios-transition-hover), box-shadow var(--aios-transition-hover)"
          },
          "&:focus-visible": {
            outline: `2px solid ${palette.primary}`,
            outlineOffset: 1
          }
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: palette.surface,
          color: palette.text,
          transition:
            "background-color var(--aios-transition-hover), border-color var(--aios-transition-hover), box-shadow var(--aios-transition-hover)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.outline
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(palette.primary, resolvedMode === "dark" ? 0.32 : 0.24)
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: palette.primary
          },
          "&:focus-within": {
            boxShadow: `0 0 0 2px ${alpha(palette.primary, 0.18)}`
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
          backgroundColor: palette.surfaceMuted
        },
        bar: {
          borderRadius: 999
        }
      }
    }
  };
}
