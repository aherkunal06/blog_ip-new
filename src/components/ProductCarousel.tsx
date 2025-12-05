"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import type { Product } from "@/types/product";

interface ProductCarouselProps {
  limit?: number;
  title?: string;
  category?: string;
}

const ProductCarousel: React.FC<ProductCarouselProps> = ({
  limit = 6,
  title = "Featured Products",
  category,
}) => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        let url = `/api/products/index?status=active&limit=${limit}`;
        if (category) {
          url = `/api/products/index?category=${encodeURIComponent(category)}&status=active&limit=${limit}`;
        }
        const res = await axios.get(url);
        setProducts(res.data.products || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit, category]);

  const trackClick = async (productId: number) => {
    try {
      await axios.post("/api/products/click", { productId });
    } catch (error) {
      // Silent fail for analytics
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="w-full py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className={`h-64 ${
                theme === "dark" ? "bg-gray-800" : "bg-gray-200"
              } animate-pulse rounded-lg`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
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
            {title}
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className={`group flex flex-col rounded-xl overflow-hidden border ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-800 hover:border-gray-700"
                  : "bg-white border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-lg"
              } transition-all duration-300 hover:-translate-y-1`}
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
                      theme === "dark" ? "bg-gray-800" : "bg-gray-100"
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
                      ((product.price - product.salePrice) / product.price) * 100
                    )}
                    % OFF
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3
                  className={`font-semibold text-sm mb-2 line-clamp-2 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {product.name}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1">
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
                  {product.reviewCount > 0 && (
                    <span
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-500" : "text-gray-500"
                      }`}
                    >
                      ({product.reviewCount})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {product.salePrice ? (
                    <>
                      <span
                        className={`font-bold text-lg ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {formatPrice(product.salePrice)}
                      </span>
                      {product.price && (
                        <span
                          className={`text-sm line-through ${
                            theme === "dark" ? "text-gray-500" : "text-gray-400"
                          }`}
                        >
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span
                      className={`font-bold text-lg ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>

                <Link
                  href={product.ipshopyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick(product.id)}
                  className="w-full py-2 px-4 text-center text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  style={{
                    background: colors.getGradient("primary", "secondary"),
                  }}
                >
                  Shop Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="https://ipshopy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            style={{
              background: colors.getGradient("primary", "secondary"),
            }}
          >
            View All Products on ipshopy.com
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProductCarousel;

