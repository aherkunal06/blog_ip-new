"use client";

import { useThemeContext } from "@/context/ThemeContext";
import { ReactNode } from "react";

interface BlogHeadingProps {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4;
  className?: string;
}

export default function BlogHeading({ children, level = 3, className = "" }: BlogHeadingProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const textColor = isDark ? "text-white" : "text-gray-900";

  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const sizeClasses = {
    1: "text-3xl font-bold",
    2: "text-2xl font-bold",
    3: "text-lg font-semibold",
    4: "text-base font-semibold",
  };

  return (
    <Tag className={`${sizeClasses[level]} ${textColor} ${className}`}>
      {children}
    </Tag>
  );
}

