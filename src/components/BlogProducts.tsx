"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import ProductWidget from "./ProductWidget";
import type { Product } from "@/types/product";
import { useThemeContext } from "@/context/ThemeContext";

interface BlogProductsProps {
  blogSlug: string;
  title?: string;
  variant?: "grid" | "sidebar";
  limit?: number;
}

const BlogProducts: React.FC<BlogProductsProps> = ({
  blogSlug,
  title = "Products Mentioned",
  variant = "grid",
  limit,
}) => {
  const { theme } = useThemeContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`/api/blogs/${blogSlug}/products`);
        let fetchedProducts = res.data.products || [];
        
        if (limit) {
          fetchedProducts = fetchedProducts.slice(0, limit);
        }
        
        setProducts(fetchedProducts);
      } catch (error) {
        console.error("Error fetching blog products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (blogSlug) {
      fetchProducts();
    }
  }, [blogSlug, limit]);

  if (loading) {
    return (
      <div className="w-full">
        <div
          className={`grid gap-4 ${
            variant === "grid"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          }`}
        >
          {Array.from({ length: limit || 3 }).map((_, i) => (
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
    <div className="w-full">
      <h3
        className={`text-2xl font-bold mb-6 ${
          theme === "dark" ? "text-white" : "text-gray-900"
        }`}
      >
        {title}
      </h3>
      <div
        className={`grid gap-4 ${
          variant === "grid"
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        }`}
      >
        {products.map((product) => (
          <ProductWidget
            key={product.id}
            product={product}
            variant={variant === "sidebar" ? "sidebar" : "card"}
          />
        ))}
      </div>
    </div>
  );
};

export default BlogProducts;

