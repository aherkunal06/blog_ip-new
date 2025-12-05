"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import { stripHtml, truncateText } from "@/lib/htmlUtils";

interface AdItemProps {
  ad: {
    id: number;
    productUrl: string;
    productName: string;
    productImage: string | null;
    productPrice: number | null;
    productSalePrice: number | null;
    title: string | null;
    description: string | null;
    ctaText: string;
    campaignId: number;
    blogId?: number;
    categoryId?: number;
  };
  variant?: "card" | "sidebar" | "banner" | "inline";
}

const AdItem: React.FC<AdItemProps> = ({ ad, variant = "card" }) => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const impressionTracked = useRef(false);
  const adRef = useRef<HTMLDivElement>(null);

  // Track impression when ad comes into view
  useEffect(() => {
    if (impressionTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackImpression();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const trackImpression = async () => {
    if (impressionTracked.current) return;
    impressionTracked.current = true;

    try {
      await axios.post("/api/ads/impression", {
        adItemId: ad.id,
        campaignId: ad.campaignId,
        blogId: ad.blogId,
        categoryId: ad.categoryId,
      });
    } catch (error) {
      // Silent fail for analytics
    }
  };

  const trackClick = async () => {
    try {
      await axios.post("/api/ads/click", {
        adItemId: ad.id,
        campaignId: ad.campaignId,
        blogId: ad.blogId,
        categoryId: ad.categoryId,
      });
    } catch (error) {
      // Silent fail for analytics
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Add UTM parameters to product URL
  const getProductUrl = () => {
    const url = new URL(ad.productUrl);
    url.searchParams.set("utm_source", "blog");
    url.searchParams.set("utm_medium", "ad");
    url.searchParams.set("utm_campaign", `campaign_${ad.campaignId}`);
    url.searchParams.set("utm_content", `ad_${ad.id}`);
    if (ad.blogId) {
      url.searchParams.set("utm_term", `blog_${ad.blogId}`);
    }
    return url.toString();
  };

  if (variant === "banner") {
    const cleanTitle = stripHtml(ad.title || ad.productName);
    const cleanDescription = ad.description ? stripHtml(ad.description) : null;
    
    return (
      <div
        ref={adRef}
        className={`relative rounded-xl overflow-hidden ${
          theme === "dark" ? "bg-gray-900" : "bg-gradient-to-r from-purple-50 to-blue-50"
        } border ${
          theme === "dark" ? "border-gray-800" : "border-gray-200"
        } shadow-lg`}
      >
        <Link
          href={getProductUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackClick}
          className="block p-6 hover:opacity-95 transition-opacity"
        >
          <div className="flex items-center gap-6">
            {ad.productImage && (
              <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                <Image
                  src={ad.productImage}
                  alt={cleanTitle}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold text-xl md:text-2xl mb-2 line-clamp-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}
              >
                {cleanTitle}
              </h3>
              {cleanDescription && (
                <p
                  className={`text-sm md:text-base mb-3 line-clamp-2 ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  {truncateText(cleanDescription, 120)}
                </p>
              )}
              <div className="flex items-center gap-3">
                {ad.productSalePrice ? (
                  <>
                    <span
                      className="font-bold text-2xl"
                      style={{ color: colors.primary }}
                    >
                      {formatPrice(ad.productSalePrice)}
                    </span>
                    {ad.productPrice && (
                      <span
                        className={`text-lg line-through ${
                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        {formatPrice(ad.productPrice)}
                      </span>
                    )}
                  </>
                ) : (
                  ad.productPrice && (
                    <span
                      className="font-bold text-2xl"
                      style={{ color: colors.primary }}
                    >
                      {formatPrice(ad.productPrice)}
                    </span>
                  )
                )}
              </div>
            </div>
            <div
              className="px-6 py-3 text-white font-semibold rounded-lg whitespace-nowrap hover:opacity-90 transition-opacity shadow-md"
              style={{
                background: colors.getGradient("primary", "secondary"),
              }}
            >
              {ad.ctaText}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div
        ref={adRef}
        className={`rounded-lg border overflow-hidden ${
          theme === "dark"
            ? "bg-gray-900 border-gray-800"
            : "bg-white border-gray-200"
        } shadow-sm hover:shadow-md transition-shadow`}
      >
        <Link
          href={getProductUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={trackClick}
          className="block"
        >
          {ad.productImage && (
            <div className="relative w-full aspect-square">
              <Image
                src={ad.productImage}
                alt={ad.title || ad.productName}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="p-3">
            <h4
              className={`font-semibold text-sm mb-2 line-clamp-2 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {ad.title || ad.productName}
            </h4>
            <div className="flex items-center justify-between">
              {ad.productSalePrice ? (
                <span
                  className="font-bold text-sm"
                  style={{ color: colors.primary }}
                >
                  {formatPrice(ad.productSalePrice)}
                </span>
              ) : (
                ad.productPrice && (
                  <span
                    className="font-bold text-sm"
                    style={{ color: colors.primary }}
                  >
                    {formatPrice(ad.productPrice)}
                  </span>
                )
              )}
              <span
                className="text-xs px-2 py-1 rounded text-white"
                style={{
                  background: colors.getGradient("primary", "secondary"),
                }}
              >
                {ad.ctaText}
              </span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // Default card variant
  return (
    <div
      ref={adRef}
      className={`group flex flex-col rounded-xl overflow-hidden border ${
        theme === "dark"
          ? "bg-gray-900 border-gray-800 hover:border-gray-700"
          : "bg-white border-gray-200 hover:border-gray-300"
      } shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
    >
      <Link
        href={getProductUrl()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={trackClick}
        className="block"
      >
        <div className="relative w-full aspect-square">
          {ad.productImage ? (
            <Image
              src={ad.productImage}
              alt={ad.title || ad.productName}
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
          {ad.productSalePrice && ad.productPrice && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
              {Math.round(
                ((ad.productPrice - ad.productSalePrice) / ad.productPrice) * 100
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
            {ad.title || ad.productName}
          </h3>

          {ad.description && (
            <p
              className={`text-xs mb-3 line-clamp-2 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {truncateText(stripHtml(ad.description), 100)}
            </p>
          )}

          <div className="flex items-center gap-2 mb-4">
            {ad.productSalePrice ? (
              <>
                <span
                  className={`font-bold text-lg ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatPrice(ad.productSalePrice)}
                </span>
                {ad.productPrice && (
                  <span
                    className={`text-sm line-through ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    {formatPrice(ad.productPrice)}
                  </span>
                )}
              </>
            ) : (
              ad.productPrice && (
                <span
                  className={`font-bold text-lg ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {formatPrice(ad.productPrice)}
                </span>
              )
            )}
          </div>

          <div
            className="w-full py-2 px-4 text-center text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            style={{
              background: colors.getGradient("primary", "secondary"),
            }}
          >
            {ad.ctaText}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default AdItem;

