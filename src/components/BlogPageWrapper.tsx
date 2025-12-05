"use client";

import { useThemeContext } from "@/context/ThemeContext";
import { ReactNode } from "react";

interface BlogPageWrapperProps {
  children: ReactNode;
}

export default function BlogPageWrapper({ children }: BlogPageWrapperProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  return (
    <article className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-white"}`}>
      {children}
    </article>
  );
}

