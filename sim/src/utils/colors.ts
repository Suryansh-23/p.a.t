/**
 * Color scheme and theme utilities for TUI
 */

// Based on the provided screenshots - dark purple/navy theme with vibrant accents
export const COLORS = {
  // Background colors
  bg: {
    primary: "#1a1a2e",
    secondary: "#16213e",
    panel: "#0f0f23",
  },

  // Accent colors
  accent: {
    purple: "#9d4edd",
    purpleDark: "#7b2cbf",
    purpleLight: "#a78bfa",
    cyan: "#06b6d4",
    cyanBright: "#00d4ff",
  },

  // Text colors
  text: {
    primary: "#f0f0f0",
    secondary: "#a0a0a0",
    muted: "#707070",
    highlight: "#ffffff",
  },

  // Status colors
  status: {
    success: "#10b981",
    warning: "#fbbf24",
    error: "#ef4444",
    info: "#3b82f6",
  },

  // Chart colors
  chart: {
    line: "#ffffff",
    fill: "#9d4edd",
    upperBand: "#a78bfa",
    lowerBand: "#7b2cbf",
    grid: "#2a2a3e",
  },
};

// Blessed color names (for terminal compatibility)
export const BLESSED_COLORS = {
  bg: "black",
  border: "magenta",
  borderFocus: "cyan",
  text: "white",
  textMuted: "gray",
  accent: "magenta",
  success: "green",
  warning: "yellow",
  error: "red",
  info: "blue",
  chart: {
    line: "white",
    fill: "magenta",
    midPrice: "cyan",
    upperSpread: "magenta",
    lowerSpread: "blue",
    baseline: "gray",
  },
};

// Unicode box-drawing characters for beautiful borders
export const BOX_CHARS = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
  leftTee: "├",
  rightTee: "┤",
  topTee: "┬",
  bottomTee: "┴",
  cross: "┼",
};

// UI symbols
export const SYMBOLS = {
  bullet: "●",
  circle: "○",
  checkmark: "✓",
  cross: "✗",
  arrow: {
    up: "▲",
    down: "▼",
    left: "◄",
    right: "►",
  },
  slider: {
    track: "─",
    handle: "●",
    left: "├",
    right: "┤",
  },
  block: {
    full: "█",
    light: "░",
    medium: "▒",
    dark: "▓",
  },
};
