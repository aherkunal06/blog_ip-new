"use client";

import { useThemeContext } from "@/context/ThemeContext";
import { ReactNode } from "react";

interface BlogTextElementProps {
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export default function BlogTextElement({ children, variant = "primary", className = "" }: BlogTextElementProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  
  const colorClasses = {
    primary: isDark ? "text-gray-100" : "text-gray-900",
    secondary: isDark ? "text-gray-300" : "text-gray-600",
  };

  return <span className={`${colorClasses[variant]} ${className}`}>{children}</span>;
}

