"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import EventBanner from "@/components/EventBanner";
import type { Product } from "@/types/product";

interface Blog {
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
  categories: string[];
  createdAt: string;
  firstProduct?: Product | null;
}

const HeroWithProduct: React.FC = () => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [featuredBlog, setFeaturedBlog] = useState<Blog | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [blogRes, productsRes] = await Promise.all([
          axios.get("/api/blogs/featured?type=latest"),
          axios.get("/api/products/index?status=active&adminPriority>=80&limit=5"),
        ]);

        if (blogRes.data.blog) {
          setFeaturedBlog(blogRes.data.blog);
        }
        setFeaturedProducts(productsRes.data.products || []);
      } catch (error) {
        console.error("Error fetching hero data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-rotate products
  useEffect(() => {
    if (featuredProducts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentProductIndex((prev) => (prev + 1) % featuredProducts.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [featuredProducts.length]);

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const calculateReadTime = (content: string | null) => {
    if (!content) return "2 min read";
    const wordsPerMinute = 200;
    const words = content.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <section className={`w-full py-16 ${theme === "dark" ? "bg-black" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3 h-96 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
            <div className="md:col-span-2 h-96 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />
          </div>
        </div>
      </section>
    );
  }

  const currentProduct = featuredProducts[currentProductIndex];

  return (
    <section className={`w-full py-12 md:py-16 ${theme === "dark" ? "bg-gradient-to-b from-black to-gray-900" : "bg-gradient-to-b from-white to-gray-50"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-5 gap-8 my-8 items-stretch">
          {/* Featured Blog (Left - 60%) */}
          {featuredBlog && (
            <div className="md:col-span-3 flex">
              <Link
                href={`/${featuredBlog.slug}`}
                className="group block h-full w-full flex flex-col"
              >
                <div
                  className={`rounded-2xl overflow-hidden shadow-xl flex flex-col h-full ${theme === "dark" ? "bg-gray-900" : "bg-white"
                    } transition-all duration-300 hover:shadow-2xl`}
                >
                  {featuredBlog.image && (
                    <div className="relative w-full h-36 md:h-60 overflow-hidden">
                      <Image
                        src={featuredBlog.image}
                        alt={featuredBlog.imageAlt || featuredBlog.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        priority
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </div>
                  )}

                  <div className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-3">
                      {featuredBlog.categories.slice(0, 2).map((cat) => (
                        <span
                          key={cat}
                          className="px-3 py-1 text-xs font-semibold rounded-full"
                          style={{
                            background: colors.getGradient("primary", "secondary"),
                            color: "white",
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>

                    <h1
                      className={`text-3xl md:text-4xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"
                        } group-hover:opacity-80 transition-opacity`}
                    >
                      {featuredBlog.title}
                    </h1>

                    {featuredBlog.metaDescription && (
                      <p
                        className={`text-base md:text-lg mb-6 line-clamp-2 ${theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}
                      >
                        {featuredBlog.metaDescription}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{
                            background: colors.getGradient("primary", "secondary"),
                          }}
                        >
                          {(featuredBlog.author.username || featuredBlog.author.name || "A")[0].toUpperCase()}
                        </div>
                        <span
                          className={`font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"
                            }`}
                        >
                          {featuredBlog.author.username || featuredBlog.author.name}
                        </span>
                      </div>
                      <span
                        className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}
                      >
                        {formatDate(featuredBlog.createdAt)}
                      </span>
                      <span
                        className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"
                          }`}
                      >
                        {calculateReadTime(featuredBlog.metaDescription || "")}
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <span
                        className="px-6 py-3 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity"
                        style={{
                          background: colors.getGradient("primary", "secondary"),
                        }}
                      >
                        Read Full Article →
                      </span>
                      {featuredBlog.firstProduct && (
                        <Link
                          href={featuredBlog.firstProduct.ipshopyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 rounded-lg border font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Shop Related Products →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Featured Product Spotlight (Right - 40%) */}
          {currentProduct && (
            <div className="md:col-span-2 flex">
              <div
                className={`rounded-2xl overflow-hidden shadow-xl h-full w-full flex flex-col ${theme === "dark" ? "bg-gray-900" : "bg-white"
                  } border ${theme === "dark" ? "border-gray-800" : "border-gray-200"
                  }`}
              >
                <div className="p-1.5 flex justify-center gap-1 mb-2">
                  {featuredProducts.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentProductIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${index === currentProductIndex
                        ? "w-6"
                        : "w-1.5"
                        }`}
                      style={{
                        background:
                          index === currentProductIndex
                            ? colors.primary
                            : theme === "dark"
                              ? "#374151"
                              : "#e5e7eb",
                      }}
                      aria-label={`View product ${index + 1}`}
                    />
                  ))}
                </div>

                <div className="px-4 pb-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2.5 py-0.5 text-xs font-semibold rounded-full text-white"
                      style={{
                        background: colors.getGradient("primary", "secondary"),
                      }}
                    >
                      ⭐ Featured Product
                    </span>
                  </div>

                  {currentProduct.image && (
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden mb-3">
                      <Image
                        src={currentProduct.image}
                        alt={currentProduct.name}
                        fill
                        className="object-cover"
                      />
                      {currentProduct.salePrice && currentProduct.price && (
                        <div className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded">
                          {Math.round(
                            ((currentProduct.price - currentProduct.salePrice) /
                              currentProduct.price) *
                            100
                          )}
                          % OFF
                        </div>
                      )}
                    </div>
                  )}

                  <h2
                    className={`text-xl font-bold mb-2 line-clamp-2 ${theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                  >
                    {currentProduct.name}
                  </h2>

                  {currentProduct.rating > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-sm ${i < Math.floor(currentProduct.rating)
                              ? "text-yellow-400"
                              : theme === "dark"
                                ? "text-gray-600"
                                : "text-gray-300"
                              }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span
                        className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}
                      >
                        {currentProduct.rating.toFixed(1)} ({currentProduct.reviewCount})
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    {currentProduct.salePrice ? (
                      <>
                        <span
                          className="text-2xl font-bold"
                          style={{ color: colors.primary }}
                        >
                          {formatPrice(currentProduct.salePrice)}
                        </span>
                        {currentProduct.price && (
                          <span
                            className={`text-lg line-through ${theme === "dark" ? "text-gray-500" : "text-gray-400"
                              }`}
                          >
                            {formatPrice(currentProduct.price)}
                          </span>
                        )}
                      </>
                    ) : (
                      currentProduct.price && (
                        <span
                          className="text-2xl font-bold"
                          style={{ color: colors.primary }}
                        >
                          {formatPrice(currentProduct.price)}
                        </span>
                      )
                    )}
                  </div>

                  <div className="space-y-2 mt-auto">
                    <Link
                      href={currentProduct.ipshopyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2 px-4 text-center text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      style={{
                        background: colors.getGradient("primary", "secondary"),
                      }}
                    >
                      Shop Now on ipshopy.com
                    </Link>
                    <Link
                      href={currentProduct.ipshopyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block w-full py-1.5 px-4 text-center text-sm font-semibold rounded-lg border transition ${theme === "dark"
                        ? "border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                    >
                      View Product Details
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Banner */}
        <div className="mt-8">
          <EventBanner />
        </div>
      </div>
    </section>
  );
};

export default HeroWithProduct;

