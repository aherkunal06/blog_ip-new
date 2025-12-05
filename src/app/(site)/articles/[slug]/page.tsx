// src/app/(site)/articles/[slug]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import ProductCarousel from "@/components/ProductCarousel";
import AdSlot from "@/components/ads/AdSlot";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  productCount?: number;
}

interface Blog {
  id: number;
  title: string;
  slug: string;
  image: string | null;
  metaDescription: string | null;
  createdAt: string;
  author?: {
    username: string;
    name?: string;
  };
}

const BLOGS_PER_PAGE = 12;

export default function CategoryPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const isDark = theme === "dark";

  const [category, setCategory] = useState<Category | null>(null);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (!slug) return;

    const fetchCategory = async () => {
      try {
        setLoading(true);
        const [categoryRes, blogsRes] = await Promise.all([
          axios.get(`/api/blogs/categories/${slug}`),
          axios.get(`/api/blogs/categories/${slug}/blogs?page=${currentPage}&limit=${BLOGS_PER_PAGE}`)
        ]);

        if (categoryRes.data?.category) {
          setCategory(categoryRes.data.category);
          
          // Fetch product count for this category
          try {
            const productsRes = await axios.get(`/api/products/index?category=${encodeURIComponent(categoryRes.data.category.name)}&status=active&limit=1`);
            setProductCount(productsRes.data?.total || 0);
          } catch (err) {
            console.error("Error fetching product count:", err);
            setProductCount(0);
          }
        }

        if (blogsRes.data) {
          setBlogs(blogsRes.data.blogs || []);
          setTotalPages(blogsRes.data.totalPages || 1);
          setTotalBlogs(blogsRes.data.totalBlogs || 0);
        }
      } catch (error) {
        console.error("Error fetching category data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [slug, currentPage]);


  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "Unknown date";
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-300" : "text-gray-600";
  const textTertiary = isDark ? "text-gray-400" : "text-gray-500";

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-black" : "bg-gray-50"}`} style={{ paddingTop: '140px' }}>
        <div className="p-4 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className={`h-12 w-64 ${isDark ? "bg-gray-800" : "bg-gray-200"} rounded`}></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`h-[400px] ${isDark ? "bg-gray-800" : "bg-gray-200"} rounded-xl`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className={`min-h-screen ${isDark ? "bg-black" : "bg-gray-50"}`} style={{ paddingTop: '140px' }}>
        <div className="p-4 max-w-7xl mx-auto text-center py-16">
          <h2 className={`text-2xl font-semibold ${textPrimary}`}>Category not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? "bg-black" : "bg-gray-50"}`}>
      <div className="px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8 max-w-7xl mx-auto" style={{ paddingTop: '140px' }}>
        {/* Category Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-4 mb-4">
            {category.image && (
              <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold mb-2 ${textPrimary}`}>
                {category.name}
              </h1>
              {category.description && (
                <p className={`text-sm md:text-base ${textSecondary} max-w-3xl`}>
                  {category.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <p className={`text-sm ${textTertiary}`}>
                {totalBlogs} {totalBlogs === 1 ? 'article' : 'articles'}
              </p>
              {productCount > 0 && (
                <p className={`text-sm ${textTertiary}`}>
                  {productCount} {productCount === 1 ? 'product' : 'products'}
                </p>
              )}
            </div>
            <Link
              href={`https://ipshopy.com/${category.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              View All Products on ipshopy.com
            </Link>
          </div>
        </div>

        {/* Banner Ad - Only show if ads are available */}
        <div className="mb-12">
          <AdSlot placement="banner" categorySlug={slug} maxAds={1} />
        </div>

        {/* Featured Products in Category */}
        {productCount > 0 && (
          <div className="mb-12">
            <ProductCarousel 
              title={`Featured Products in ${category.name}`}
              limit={6}
              category={category.name}
            />
          </div>
        )}

        {/* Blogs Grid */}
        {blogs.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl ${isDark ? "bg-gray-900" : "bg-white"} border ${isDark ? "border-gray-800" : "border-gray-200"}`}>
            <div className="text-6xl mb-4">📝</div>
            <p className={`text-lg font-medium ${textPrimary} mb-2`}>
              No articles yet
            </p>
            <p className={`text-sm ${textSecondary}`}>
              Check back soon for new content in this category.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
              {blogs.map((blog) => {
                const imgSrc = blog.image || "/default-blog.png";
                const authorName = blog.author?.username || blog.author?.name || "Anonymous";

                return (
                  <Link
                    key={blog.id}
                    href={`/${blog.slug}`}
                    className={`group block h-full rounded-xl overflow-hidden border ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                        : "bg-white border-gray-200 hover:border-gray-300"
                    } shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col`}
                  >
                    {/* Image Section */}
                    <div className="relative w-full h-56 overflow-hidden">
                      {blog.image ? (
                        <Image
                          src={imgSrc}
                          alt={blog.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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

                    {/* Content Section */}
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
                            {authorName[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={`text-sm font-medium ${
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              {authorName}
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
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-center gap-2 mt-8 pt-8 border-t ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    currentPage === 1
                      ? isDark ? "text-gray-600 cursor-not-allowed" : "text-gray-400 cursor-not-allowed"
                      : isDark ? "text-gray-300 hover:bg-gray-800 cursor-pointer" : "text-gray-700 hover:bg-gray-100 cursor-pointer"
                  }`}
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                          currentPage === pageNum
                            ? isDark ? "bg-blue-600 text-white" : "bg-blue-500 text-white"
                            : isDark ? "text-gray-300 hover:bg-gray-800 cursor-pointer" : "text-gray-700 hover:bg-gray-100 cursor-pointer"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                    currentPage === totalPages
                      ? isDark ? "text-gray-600 cursor-not-allowed" : "text-gray-400 cursor-not-allowed"
                      : isDark ? "text-gray-300 hover:bg-gray-800 cursor-pointer" : "text-gray-700 hover:bg-gray-100 cursor-pointer"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

