"use client";

import { useThemeContext } from "@/context/ThemeContext";
import Link from "next/link";
import Image from "next/image";

interface RelatedArticleLinkProps {
  blog: {
    id: number;
    title: string;
    slug: string;
    image: string | null;
  };
}

export default function RelatedArticleLink({ blog }: RelatedArticleLinkProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const hoverBg = isDark ? "hover:bg-gray-700" : "hover:bg-gray-50";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const hoverText = isDark ? "group-hover:text-blue-400" : "group-hover:text-blue-600";

  return (
    <Link href={`/blogs/${blog.slug}`} className="block group">
      <div className={`flex gap-3 p-3 rounded-xl ${hoverBg} transition-all duration-300`}>
        <div className="w-16 h-12 relative flex-shrink-0 rounded-lg overflow-hidden">
          <Image
            src={blog.image || "/placeholder.png"}
            alt={blog.title}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${textColor} ${hoverText} transition-colors duration-300 line-clamp-2`}>
            {blog.title}
          </h4>
        </div>
      </div>
    </Link>
  );
}

