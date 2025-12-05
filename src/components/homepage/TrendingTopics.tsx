"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";

interface TrendingCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  blogCount: number;
  productCount: number;
}

const TrendingTopics: React.FC = () => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [categories, setCategories] = useState<TrendingCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/blogs/categories/trending?limit=6");
        setCategories(res.data.categories || []);
      } catch (error) {
        console.error("Error fetching trending categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getCategoryIcon = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes("tech")) return "💻";
    if (nameLower.includes("review")) return "⭐";
    if (nameLower.includes("guide")) return "📖";
    if (nameLower.includes("news")) return "📰";
    return "📝";
  };

  if (loading) {
    return (
      <section className={`w-full py-12 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-40 ${
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
    <section className={`w-full py-12 md:py-16 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
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
            Trending Topics
          </span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          {categories.map((category) => {
            const imgSrc = category.image || "/default-category.png";
            return (
              <Link
                key={category.id}
                href={`/articles/${category.slug}`}
                className={`group relative flex flex-col rounded-xl overflow-hidden border ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                    : "bg-white border-gray-200 hover:border-gray-300"
                } shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2`}
              >
                {/* Category Image */}
                <div className="relative w-full aspect-[4/3] overflow-hidden">
                  {category.image ? (
                    <Image
                      src={imgSrc}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      <span className="text-4xl">{getCategoryIcon(category.name)}</span>
                    </div>
                  )}
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col items-center text-center">
                  <h3
                    className={`text-sm font-bold mb-2 line-clamp-1 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {category.name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {category.blogCount} Posts
                    </span>
                    <span
                      className={`${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      •
                    </span>
                    <span
                      className={`${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {category.productCount} Products
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TrendingTopics;

