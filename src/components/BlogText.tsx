"use client";

import { useThemeContext } from "@/context/ThemeContext";
import { ReactNode } from "react";

interface BlogTextProps {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "heading";
}

export default function BlogText({ children, className = "", variant = "primary" }: BlogTextProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  const colorClasses = {
    primary: isDark ? "text-gray-100" : "text-gray-900",
    secondary: isDark ? "text-gray-300" : "text-gray-700",
    heading: isDark ? "text-white" : "text-gray-900",
  };

  return <span className={`${colorClasses[variant]} ${className}`}>{children}</span>;
}

