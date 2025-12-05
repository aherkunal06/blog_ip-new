"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";

interface ProductCategory {
  name: string;
  productCount: number;
  image: string | null;
}

const ProductCategoriesGrid: React.FC = () => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/products/categories?limit=8");
        setCategories(res.data.categories || []);
      } catch (error) {
        console.error("Error fetching product categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <section className={`w-full py-12 ${theme === "dark" ? "bg-black" : "bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
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
            Shop by Category
          </span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <Link
              key={index}
              href={`https://ipshopy.com/${category.name.toLowerCase().replace(/\s+/g, "-")}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`group block rounded-xl overflow-hidden border ${
                theme === "dark"
                  ? "bg-gray-900 border-gray-800 hover:border-gray-700"
                  : "bg-white border-gray-200 hover:border-gray-300"
              } shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex items-center justify-center ${
                      theme === "dark" ? "bg-gray-800" : "bg-gray-100"
                    }`}
                  >
                    <span
                      className={`text-4xl ${
                        theme === "dark" ? "text-gray-600" : "text-gray-400"
                      }`}
                    >
                      📦
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              </div>

              <div className="p-4 text-center">
                <h3
                  className={`text-lg font-bold mb-2 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {category.name}
                </h3>
                <p
                  className={`text-sm mb-3 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {category.productCount} {category.productCount === 1 ? "Item" : "Items"}
                </p>
                <span
                  className="inline-block px-4 py-2 text-sm font-semibold rounded-lg text-white hover:opacity-90 transition-opacity"
                  style={{
                    background: colors.getGradient("primary", "secondary"),
                  }}
                >
                  Shop {category.name}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductCategoriesGrid;

