import { alpha, createTheme } from "@mui/material/styles";
import { designTokens } from "./designTokens";

export const materialTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: designTokens.color.googleBlue,
      dark: designTokens.color.googleBlueDark,
      light: designTokens.color.googleBlueSoft,
      contrastText: "#ffffff"
    },
    secondary: {
      main: designTokens.color.info,
      light: designTokens.color.infoSoft,
      contrastText: "#ffffff"
    },
    background: {
      default: designTokens.color.background,
      paper: designTokens.color.surface
    },
    text: {
      primary: designTokens.color.text,
      secondary: designTokens.color.textMuted
    },
    success: {
      main: designTokens.color.success,
      light: designTokens.color.successSoft
    },
    warning: {
      main: designTokens.color.warning,
      light: designTokens.color.warningSoft
    },
    error: {
      main: designTokens.color.error,
      light: designTokens.color.errorSoft
    },
    divider: designTokens.color.outline
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
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": {
          colorScheme: "light",
          "--aios-bg": designTokens.color.background,
          "--aios-bg-alt": designTokens.color.backgroundAlt,
          "--aios-surface": designTokens.color.surface,
          "--aios-surface-muted": designTokens.color.surfaceMuted,
          "--aios-outline": designTokens.color.outline,
          "--aios-outline-strong": designTokens.color.outlineStrong,
          "--aios-text": designTokens.color.text,
          "--aios-muted": designTokens.color.textMuted,
          "--aios-subtle": designTokens.color.textSubtle,
          "--aios-primary": designTokens.color.googleBlue,
          "--aios-primary-dark": designTokens.color.googleBlueDark,
          "--aios-primary-soft": designTokens.color.googleBlueSoft,
          "--aios-success": designTokens.color.success,
          "--aios-success-soft": designTokens.color.successSoft,
          "--aios-warning": designTokens.color.warning,
          "--aios-warning-soft": designTokens.color.warningSoft,
          "--aios-error": designTokens.color.error,
          "--aios-error-soft": designTokens.color.errorSoft,
          "--aios-info": designTokens.color.info,
          "--aios-info-soft": designTokens.color.infoSoft,
          "--aios-shadow": designTokens.shadow.surface,
          "--aios-shadow-lifted": designTokens.shadow.lifted,
          "--aios-rail-width": `${designTokens.shell.railWidth}px`,
          "--aios-rail-compact-width": `${designTokens.shell.railCompactWidth}px`,
          "--aios-inspector-width": `${designTokens.shell.inspectorWidth}px`,
          "--aios-shell-gap": `${designTokens.shell.gap}px`,
          "--aios-shell-padding": `${designTokens.shell.viewportPadding}px`,
          "--aios-module-header": `${designTokens.shell.moduleHeaderHeight}px`,
          "--aios-summary-band": `${designTokens.shell.summaryBandHeight}px`
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
          color: designTokens.color.text,
          background: `linear-gradient(135deg, ${designTokens.color.background} 0%, ${designTokens.color.backgroundAlt} 100%)`
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
          background: alpha(designTokens.color.surface, 0.92),
          border: `1px solid ${designTokens.color.outline}`,
          borderRadius: designTokens.radius.lg,
          color: designTokens.color.text,
          boxShadow: designTokens.shadow.surface
        }
      }
    },
    MuiCard: {
      defaultProps: {
        variant: "outlined"
      },
      styleOverrides: {
        root: {
          borderColor: designTokens.color.outline,
          borderRadius: designTokens.radius.lg,
          boxShadow: "none"
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none"
        }
      }
    },
    MuiChip: {
      defaultProps: {
        size: "small"
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
          letterSpacing: 0
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
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: "small"
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          backgroundColor: designTokens.color.surface
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
          borderRadius: designTokens.radius.sm,
          fontSize: 12
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 10,
          borderRadius: 999,
          backgroundColor: designTokens.color.googleBlueSoft
        },
        bar: {
          borderRadius: 999
        }
      }
    }
  }
});
