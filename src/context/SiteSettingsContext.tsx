"use client";

import React, { createContext, useState, useEffect, useContext } from "react";

interface SiteColors {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  header_bg_color: string;
  footer_bg_color: string;
  text_color: string;
  link_color: string;
  button_primary_color: string;
  button_secondary_color: string;
  default_theme: string;
}

interface SiteSettingsContextType {
  colors: SiteColors;
  loading: boolean;
  refreshColors: () => Promise<void>;
}

// Default fallback colors
const defaultColors: SiteColors = {
  primary_color: "#9333ea", // purple-600
  secondary_color: "#3b82f6", // blue-500
  accent_color: "#ec4899", // pink-500
  header_bg_color: "#ffffff",
  footer_bg_color: "#1e293b", // slate-800
  text_color: "#1f2937", // gray-800
  link_color: "#9333ea", // purple-600
  button_primary_color: "#9333ea", // purple-600
  button_secondary_color: "#3b82f6", // blue-500
  default_theme: "light",
};

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<SiteColors>(defaultColors);
  const [loading, setLoading] = useState(true);

  const fetchColors = async () => {
    try {
      const res = await fetch("/api/site-settings/public");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          // Convert settings array to object
          const colorsMap: Partial<SiteColors> = {};
          data.settings.forEach((setting: { key_name: string; value: string | null }) => {
            if (setting.value) {
              colorsMap[setting.key_name as keyof SiteColors] = setting.value;
            }
          });
          
          // Merge with defaults (use DB values if available, otherwise use defaults)
          const mergedColors: SiteColors = {
            primary_color: colorsMap.primary_color || defaultColors.primary_color,
            secondary_color: colorsMap.secondary_color || defaultColors.secondary_color,
            accent_color: colorsMap.accent_color || defaultColors.accent_color,
            header_bg_color: colorsMap.header_bg_color || defaultColors.header_bg_color,
            footer_bg_color: colorsMap.footer_bg_color || defaultColors.footer_bg_color,
            text_color: colorsMap.text_color || defaultColors.text_color,
            link_color: colorsMap.link_color || defaultColors.link_color,
            button_primary_color: colorsMap.button_primary_color || defaultColors.button_primary_color,
            button_secondary_color: colorsMap.button_secondary_color || defaultColors.button_secondary_color,
            default_theme: colorsMap.default_theme || defaultColors.default_theme,
          };
          
          setColors(mergedColors);
          
          // Apply colors as CSS variables
          applyColorsToDocument(mergedColors);
        } else {
          // Use defaults if API fails
          applyColorsToDocument(defaultColors);
        }
      } else {
        // Use defaults if API fails
        applyColorsToDocument(defaultColors);
      }
    } catch (error) {
      console.error("Error fetching site colors:", error);
      // Use defaults on error
      applyColorsToDocument(defaultColors);
    } finally {
      setLoading(false);
    }
  };

  const applyColorsToDocument = (colorsToApply: SiteColors) => {
    const root = document.documentElement;
    root.style.setProperty("--color-primary", colorsToApply.primary_color);
    root.style.setProperty("--color-secondary", colorsToApply.secondary_color);
    root.style.setProperty("--color-accent", colorsToApply.accent_color);
    root.style.setProperty("--color-header-bg", colorsToApply.header_bg_color);
    root.style.setProperty("--color-footer-bg", colorsToApply.footer_bg_color);
    root.style.setProperty("--color-text", colorsToApply.text_color);
    root.style.setProperty("--color-link", colorsToApply.link_color);
    root.style.setProperty("--color-button-primary", colorsToApply.button_primary_color);
    root.style.setProperty("--color-button-secondary", colorsToApply.button_secondary_color);
  };

  useEffect(() => {
    fetchColors();
  }, []);

  const refreshColors = async () => {
    setLoading(true);
    await fetchColors();
  };

  return (
    <SiteSettingsContext.Provider value={{ colors, loading, refreshColors }}>
      {children}
    </SiteSettingsContext.Provider>
  );
};

export const useSiteSettings = () => {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    // Return defaults if context is not available
    return { colors: defaultColors, loading: false, refreshColors: async () => {} };
  }
  return context;
};

