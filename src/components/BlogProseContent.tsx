"use client";

import { useThemeContext } from "@/context/ThemeContext";

interface BlogProseContentProps {
  content: string;
}

export default function BlogProseContent({ content }: BlogProseContentProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  // Base prose classes with explicit text colors
  const proseClasses = isDark
    ? "prose prose-lg max-w-none dark:prose-invert prose-headings:text-white prose-p:text-gray-300 prose-a:text-blue-400 prose-strong:text-white prose-li:text-gray-300 prose-ul:text-gray-300 prose-ol:text-gray-300 prose-blockquote:text-gray-300 prose-code:text-gray-100 prose-pre:text-gray-100 prose-img:rounded-xl prose-img:shadow-lg"
    : "prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-a:text-blue-600 prose-strong:text-gray-900 prose-li:text-gray-800 prose-ul:text-gray-800 prose-ol:text-gray-800 prose-blockquote:text-gray-800 prose-code:text-gray-900 prose-pre:text-gray-900 prose-img:rounded-xl prose-img:shadow-lg";

  return (
    <div className={proseClasses}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}

