"use client";

import { useThemeContext } from "@/context/ThemeContext";

interface BlogMetaInfoProps {
  author: string;
  createdAt: string;
  updatedAt: string;
}

export default function BlogMetaInfo({ author, createdAt, updatedAt }: BlogMetaInfoProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const textColor = isDark ? "text-gray-300" : "text-gray-700";
  const iconColor = isDark ? "text-gray-400" : "text-gray-600";

  return (
    <div className="flex flex-wrap items-center gap-4 mb-8">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
          {author[0].toUpperCase()}
        </div>
        <span className={`font-medium ${textColor}`}>{author}</span>
      </div>
      <div className={`flex items-center gap-2 ${iconColor}`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
        <span>{createdAt}</span>
      </div>
      <div className={`flex items-center gap-2 ${iconColor}`}>
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        <span>Updated {updatedAt}</span>
      </div>
    </div>
  );
}

