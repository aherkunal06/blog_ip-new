"use client";

import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import type { Product } from "@/types/product";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

interface ProductShowcaseCarouselProps {
  title?: string;
  autoRotate?: boolean;
  rotateInterval?: number;
  limit?: number;
}

const ProductShowcaseCarousel: React.FC<ProductShowcaseCarouselProps> = ({
  title = "Featured Products",
  autoRotate = true,
  rotateInterval = 5000,
  limit = 8,
}) => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `/api/products/index?status=active&adminPriority>=50&limit=${limit}`
        );
        setProducts(res.data.products || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit]);

  // Auto-rotate carousel
  useEffect(() => {
    if (!autoRotate || isPaused || products.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % Math.ceil(products.length / 6));
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRotate, isPaused, products.length, rotateInterval]);

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? Math.ceil(products.length / 6) - 1 : prev - 1
    );
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000); // Resume after 10s
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % Math.ceil(products.length / 6));
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getVisibleProducts = () => {
    const productsPerSlide = 6;
    const start = currentIndex * productsPerSlide;
    return products.slice(start, start + productsPerSlide);
  };

  if (loading) {
    return (
      <section className={`w-full py-12 ${theme === "dark" ? "bg-black" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-64 ${
                  theme === "dark" ? "bg-gray-800" : "bg-gray-200"
                } animate-pulse rounded-lg`}
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const visibleProducts = getVisibleProducts();
  const totalPages = Math.ceil(products.length / 6);

  return (
    <section
      className={`w-full py-12 md:py-16 ${
        theme === "dark" ? "bg-gray-900" : "bg-white"
      }`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
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
              {title}
            </span>
          </h2>
          <Link
            href="https://ipshopy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold hover:opacity-80 transition-opacity"
            style={{ color: colors.primary }}
          >
            View All Products →
          </Link>
        </div>

        <div className="relative">
          <div
            ref={carouselRef}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6"
          >
            {visibleProducts.map((product) => (
              <div
                key={product.id}
                className={`group flex flex-col rounded-xl overflow-hidden border ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 hover:border-gray-600"
                    : "bg-white border-gray-200 hover:border-gray-300"
                } shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
              >
                <Link
                  href={product.ipshopyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative w-full aspect-square">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
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
                    {product.salePrice && product.price && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                        {Math.round(
                          ((product.price - product.salePrice) / product.price) *
                            100
                        )}
                        % OFF
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <h3
                      className={`font-semibold text-sm mb-2 line-clamp-2 ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {product.name}
                    </h3>

                    {product.rating > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-yellow-400 text-xs">★</span>
                        <span
                          className={`text-xs ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {product.rating.toFixed(1)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      {product.salePrice ? (
                        <>
                          <span
                            className={`font-bold text-sm ${
                              theme === "dark" ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {formatPrice(product.salePrice)}
                          </span>
                          {product.price && (
                            <span
                              className={`text-xs line-through ${
                                theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }`}
                            >
                              {formatPrice(product.price)}
                            </span>
                          )}
                        </>
                      ) : (
                        product.price && (
                          <span
                            className={`font-bold text-sm ${
                              theme === "dark" ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {formatPrice(product.price)}
                          </span>
                        )
                      )}
                    </div>

                    <div
                      className="w-full py-2 px-3 text-center text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      style={{
                        background: colors.getGradient("primary", "secondary"),
                      }}
                    >
                      Shop Now
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <>
              <button
                onClick={handlePrev}
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 p-3 rounded-full shadow-lg transition ${
                  theme === "dark"
                    ? "bg-gray-800 text-white hover:bg-gray-700"
                    : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
                aria-label="Previous products"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={handleNext}
                className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 p-3 rounded-full shadow-lg transition ${
                  theme === "dark"
                    ? "bg-gray-800 text-white hover:bg-gray-700"
                    : "bg-white text-gray-900 hover:bg-gray-50"
                }`}
                aria-label="Next products"
              >
                <FaChevronRight />
              </button>

              <div className="flex justify-center gap-2 mt-6">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex ? "w-8" : "w-2"
                    }`}
                    style={{
                      background:
                        index === currentIndex
                          ? colors.primary
                          : theme === "dark"
                          ? "#374151"
                          : "#e5e7eb",
                    }}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductShowcaseCarousel;

