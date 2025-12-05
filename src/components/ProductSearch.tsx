"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { FaSearch } from "react-icons/fa";
import { useThemeContext } from "@/context/ThemeContext";
import type { Product } from "@/types/product";

interface ProductSearchProps {
  placeholder?: string;
  className?: string;
  maxWidth?: string;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  placeholder = "Search products or blogs...",
  className = "",
  maxWidth = "max-w-2xl",
}) => {
  const { theme } = useThemeContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    products: Product[];
    blogs: any[];
  }>({ products: [], blogs: [] });
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ products: [], blogs: [] });
      setShowResults(false);
      setActiveIndex(-1);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const [productsRes, blogsRes] = await Promise.all([
          axios.get(`/api/products?status=active&limit=5`).catch(() => ({ data: { products: [] } })),
          axios.get(`/api/blogs?limit=5&search=${encodeURIComponent(query)}`).catch(() => ({ data: { blogs: [] } })),
        ]);

        const products = (productsRes.data.products || []).filter((p: Product) =>
          p.name.toLowerCase().includes(query.toLowerCase())
        );
        const blogs = blogsRes.data.blogs || [];

        setResults({ products, blogs });
        setShowResults(true);
        setActiveIndex(-1);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(search, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  // Get all items as a flat array for keyboard navigation
  const allItems = useMemo(() => {
    const items: Array<{ type: 'product' | 'blog'; data: any; index: number }> = [];
    results.products.forEach((product, idx) => {
      items.push({ type: 'product', data: product, index: idx });
    });
    results.blogs.forEach((blog, idx) => {
      items.push({ type: 'blog', data: blog, index: idx });
    });
    return items;
  }, [results]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || allItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < allItems.length) {
        const item = allItems[activeIndex];
        if (item.type === 'product') {
          window.open(item.data.ipshopyUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = `/${item.data.slug}`;
        }
        setQuery("");
        setShowResults(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowResults(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && resultsRef.current) {
      const activeElement = resultsRef.current.querySelector(
        `[data-index="${activeIndex}"]`
      ) as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  return (
    <div className={`relative w-full ${maxWidth} ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 pl-5 rounded-xl border-2 ${theme === "dark"
            ? "bg-gray-800/50 border-gray-600 text-gray-100 placeholder-gray-400 focus:bg-gray-800"
            : "bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white"
            } focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300`}
        />
        <FaSearch className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
        {loading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
          </div>
        )}
      </div>

      {showResults && (results.products.length > 0 || results.blogs.length > 0) && (
        <div
          ref={resultsRef}
          className={`absolute z-50 w-full mt-2 rounded-lg border shadow-lg max-h-96 overflow-y-auto ${theme === "dark"
            ? "bg-gray-900 border-gray-800"
            : "bg-white border-gray-200"
            }`}
        >
          {results.products.length > 0 && (
            <div className="p-2">
              <div
                className={`px-3 py-2 text-xs font-semibold uppercase ${theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
              >
                Products
              </div>
              {results.products.map((product, idx) => {
                const itemIndex = idx;
                const isActive = activeIndex === itemIndex;
                return (
                  <Link
                    key={product.id}
                    href={product.ipshopyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-index={itemIndex}
                    className={`block px-3 py-2 rounded transition-colors ${isActive
                      ? theme === "dark"
                        ? "bg-purple-600 text-white"
                        : "bg-purple-100 text-purple-900"
                      : theme === "dark"
                        ? "hover:bg-gray-800 text-white"
                        : "hover:bg-gray-100 text-gray-900"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {product.image && (
                        <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{product.name}</div>
                        {product.salePrice ? (
                          <div className="text-sm text-purple-600">
                            ${product.salePrice}
                          </div>
                        ) : product.price ? (
                          <div className="text-sm text-gray-600">
                            ${product.price}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {results.blogs.length > 0 && (
            <div className="p-2 border-t border-gray-200 dark:border-gray-800">
              <div
                className={`px-3 py-2 text-xs font-semibold uppercase ${theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
              >
                Blogs
              </div>
              {results.blogs.map((blog: any, idx) => {
                const itemIndex = results.products.length + idx;
                const isActive = activeIndex === itemIndex;
                return (
                  <Link
                    key={blog.id}
                    href={`/${blog.slug}`}
                    data-index={itemIndex}
                    className={`block px-3 py-2 rounded transition-colors ${isActive
                      ? theme === "dark"
                        ? "bg-purple-600 text-white"
                        : "bg-purple-100 text-purple-900"
                      : theme === "dark"
                        ? "hover:bg-gray-800 text-white"
                        : "hover:bg-gray-100 text-gray-900"
                      }`}
                  >
                    <div className="font-medium line-clamp-1">{blog.title}</div>
                    {blog.metaDescription && (
                      <div
                        className={`text-sm line-clamp-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}
                      >
                        {blog.metaDescription}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;

