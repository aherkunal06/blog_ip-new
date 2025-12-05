"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import type { Product } from "@/types/product";

interface BlogWithProduct {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  imageAlt: string | null;
  metaDescription: string | null;
  author: {
    username: string;
    name?: string;
  };
  createdAt: string;
  firstProduct: Product | null;
}

const LatestProductBlogs: React.FC = () => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [blogs, setBlogs] = useState<BlogWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/blogs/with-products?limit=6");
        setBlogs(res.data.blogs || []);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className={`w-full py-12 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-96 ${
                  theme === "dark" ? "bg-gray-800" : "bg-gray-200"
                } animate-pulse rounded-lg`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Show section even if no blogs (will show loading state or empty message)
  // But if loading is done and no blogs, show a message instead of hiding
  if (!loading && blogs.length === 0) {
    return (
      <section className={`w-full py-12 md:py-16 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: colors.getGradient("primary", "secondary"),
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Latest Articles
            </span>
          </h2>
          <p className={`text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            No blog posts available yet. Check back soon!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={`w-full py-12 md:py-16 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl md:text-4xl font-bold">
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: colors.getGradient("primary", "secondary"),
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Latest Articles
            </span>
          </h2>
          <Link
            href="/articles"
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all duration-300 ${
              theme === "dark"
                ? "bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md"
            }`}
            style={{ color: theme === "dark" ? undefined : colors.primary }}
          >
            View All Articles →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/${blog.slug}`}
              className={`group block h-full rounded-xl overflow-hidden border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                  : "bg-white border-gray-200 hover:border-gray-300"
              } shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col`}
            >
              <div className="relative w-full h-56 overflow-hidden">
                {blog.image ? (
                  <Image
                    src={blog.image}
                    alt={blog.imageAlt || blog.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex items-center justify-center ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <span
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      No Image
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3
                  className={`text-xl font-bold mb-3 line-clamp-2 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  } group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300`}
                >
                  {blog.title}
                </h3>

                {blog.metaDescription && (
                  <p
                    className={`text-sm mb-4 line-clamp-3 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {blog.metaDescription}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md"
                      style={{
                        background: colors.getGradient("primary", "secondary"),
                      }}
                    >
                      {(blog.author.username || blog.author.name || "A")[0].toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-medium ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {blog.author.username || blog.author.name}
                      </span>
                      <span
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-500" : "text-gray-500"
                        }`}
                      >
                        {formatDate(blog.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors duration-300 ${
                      theme === "dark"
                        ? "bg-gray-700 text-gray-300 group-hover:bg-gray-600"
                        : "bg-gray-100 text-gray-700 group-hover:bg-gray-200"
                    }`}
                  >
                    Read More →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestProductBlogs;

