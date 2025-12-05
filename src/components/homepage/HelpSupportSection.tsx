"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";

interface HelpCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  blogCount: number;
}

const HelpSupportSection: React.FC = () => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/blogs/categories/help");
        setCategories(res.data.categories || []);
      } catch (error) {
        console.error("Error fetching help categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getCategoryIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("install")) return "📦";
    if (nameLower.includes("trouble") || nameLower.includes("fix")) return "🔧";
    if (nameLower.includes("faq")) return "❓";
    if (nameLower.includes("guide") || nameLower.includes("how")) return "📚";
    return "📖";
  };

  if (loading) {
    return (
      <section className={`w-full py-12 ${theme === "dark" ? "bg-black" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`h-48 ${
                  theme === "dark" ? "bg-gray-800" : "bg-gray-200"
                } animate-pulse rounded-lg`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className={`w-full py-12 md:py-16 ${theme === "dark" ? "bg-black" : "bg-white"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
          <span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: colors.getGradient("primary", "secondary"),
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Help & Support Guides
          </span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/articles/${category.slug}`}
              className={`group flex flex-col items-center p-6 rounded-xl border ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-800 hover:border-gray-700"
                  : "bg-white border-gray-200 hover:border-gray-300"
              } shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="text-5xl mb-4">{getCategoryIcon(category.name)}</div>
              <h3
                className={`text-lg font-bold mb-2 text-center ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {category.name}
              </h3>
              <p
                className={`text-sm mb-4 text-center ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {category.blogCount} {category.blogCount === 1 ? "Post" : "Posts"}
              </p>
              <span
                className="text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ color: colors.primary }}
              >
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HelpSupportSection;

