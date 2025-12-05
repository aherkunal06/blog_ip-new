"use client";

import { useThemeContext } from "@/context/ThemeContext";
import { ReactNode } from "react";

interface BlogSectionCardProps {
  children: ReactNode;
  className?: string;
}

export default function BlogSectionCard({ children, className = "" }: BlogSectionCardProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  return (
    <div
      className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} rounded-2xl shadow-lg border p-6 md:p-10 ${className}`}
    >
      {children}
    </div>
  );
}

