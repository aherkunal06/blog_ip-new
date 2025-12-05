"use client";

import { useEffect } from "react";

export function ThemeScript() {
  useEffect(() => {
    // Ensure theme is applied on mount
    const applyTheme = () => {
      try {
        const theme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = theme === "dark" || (!theme && prefersDark);
        
        if (isDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch (e) {
        console.error("Error applying theme:", e);
      }
    };

    applyTheme();

    // Listen for theme changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme") {
        applyTheme();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return null;
}

