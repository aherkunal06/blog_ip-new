"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import type { Product } from "@/types/product";

interface ProductWidgetProps {
  product: Product;
  variant?: "card" | "inline" | "sidebar";
}

const ProductWidget: React.FC<ProductWidgetProps> = ({
  product,
  variant = "card",
}) => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();

  const trackClick = async () => {
    try {
      await axios.post("/api/products/click", { productId: product.id });
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

  if (variant === "inline") {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${
          theme === "dark" ? "bg-gray-800" : "bg-gray-100"
        }`}
      >
        {product.image && (
          <div className="relative w-8 h-8 rounded overflow-hidden">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
            />
          </div>
        )}
        <Link
          href={product.ipshopyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackClick}
          className="font-medium text-purple-600 hover:text-purple-700"
        >
          {product.name}
        </Link>
        {product.salePrice ? (
          <span className="text-sm font-semibold text-purple-600">
            {formatPrice(product.salePrice)}
          </span>
        ) : product.price ? (
          <span className="text-sm text-gray-600">{formatPrice(product.price)}</span>
        ) : null}
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <Link
        href={product.ipshopyUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackClick}
        className={`block p-3 rounded-lg border transition-all hover:shadow-md ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700 hover:border-gray-600"
            : "bg-white border-gray-200 hover:border-gray-300"
        }`}
      >
        <div className="flex gap-3">
          {product.image && (
            <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0">
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4
              className={`font-semibold text-sm line-clamp-2 mb-1 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {product.name}
            </h4>
            <div className="flex items-center gap-2">
              {product.salePrice ? (
                <>
                  <span className="font-bold text-sm text-purple-600">
                    {formatPrice(product.salePrice)}
                  </span>
                  {product.price && (
                    <span className="text-xs line-through text-gray-400">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </>
              ) : (
                product.price && (
                  <span className="font-bold text-sm text-gray-900">
                    {formatPrice(product.price)}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default card variant
  return (
    <div
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

        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-400 text-xs">★</span>
            <span
              className={`text-xs ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          </div>
        )}

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
            product.price && (
              <span
                className={`font-bold text-lg ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {formatPrice(product.price)}
              </span>
            )
          )}
        </div>

        <Link
          href={product.ipshopyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackClick}
          className="w-full py-2 px-4 text-center text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
          style={{
            background: colors.getGradient("primary", "secondary"),
          }}
        >
          Shop Now
        </Link>
      </div>
    </div>
  );
};

export default ProductWidget;

