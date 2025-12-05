// src/utils/useDynamicColors.ts
import { useSiteSettings } from "@/context/SiteSettingsContext";

/**
 * Hook to get dynamic colors with fallback to default Tailwind colors
 * Returns both CSS variable names and direct color values
 */
export const useDynamicColors = () => {
  const { colors } = useSiteSettings();

  return {
    // Primary colors
    primary: colors.primary_color || "#9333ea",
    secondary: colors.secondary_color || "#3b82f6",
    accent: colors.accent_color || "#ec4899",
    
    // UI colors
    headerBg: colors.header_bg_color || "#ffffff",
    footerBg: colors.footer_bg_color || "#1e293b",
    text: colors.text_color || "#1f2937",
    link: colors.link_color || "#9333ea",
    
    // Button colors
    buttonPrimary: colors.button_primary_color || "#9333ea",
    buttonSecondary: colors.button_secondary_color || "#3b82f6",
    
    // CSS variable names for use in className
    cssVars: {
      primary: "var(--color-primary)",
      secondary: "var(--color-secondary)",
      accent: "var(--color-accent)",
      headerBg: "var(--color-header-bg)",
      footerBg: "var(--color-footer-bg)",
      text: "var(--color-text)",
      link: "var(--color-link)",
      buttonPrimary: "var(--color-button-primary)",
      buttonSecondary: "var(--color-button-secondary)",
    },
    
    // Helper function to create gradient styles
    getGradient: (from: "primary" | "secondary" | "accent", to: "primary" | "secondary" | "accent") => {
      const fromColor = from === "primary" ? colors.primary_color : from === "secondary" ? colors.secondary_color : colors.accent_color;
      const toColor = to === "primary" ? colors.primary_color : to === "secondary" ? colors.secondary_color : colors.accent_color;
      return `linear-gradient(to right, ${fromColor || "#9333ea"}, ${toColor || "#3b82f6"})`;
    },
  };
};

