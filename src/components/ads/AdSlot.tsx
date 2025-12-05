"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import AdItem from "./AdItem";
import { useThemeContext } from "@/context/ThemeContext";

interface AdSlotProps {
  placement: "sidebar" | "inline" | "after-content" | "banner" | "header" | "footer";
  blogSlug?: string;
  categorySlug?: string;
  isHomepage?: boolean;
  maxAds?: number;
  className?: string;
}

interface Ad {
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
  campaignName: string;
}

const AdSlot: React.FC<AdSlotProps> = ({
  placement,
  blogSlug,
  categorySlug,
  isHomepage = false,
  maxAds = 3,
  className = "",
}) => {
  const { theme } = useThemeContext();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true);
        let url = "";

        if (blogSlug) {
          url = `/api/ads/for-blog/${blogSlug}?placement=${placement}&maxAds=${maxAds}`;
        } else if (isHomepage) {
          url = `/api/ads/for-homepage?placement=${placement}&maxAds=${maxAds}`;
        } else if (categorySlug) {
          url = `/api/ads/for-category/${categorySlug}?placement=${placement}&maxAds=${maxAds}`;
        } else {
          // No ads to show
          setLoading(false);
          return;
        }

        const res = await axios.get(url);
        setAds(res.data.ads || []);
      } catch (error) {
        console.error("Error fetching ads:", error);
        setAds([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [placement, blogSlug, categorySlug, isHomepage, maxAds]);

  if (loading) {
    return (
      <div className={`${className} space-y-4`}>
        {Array.from({ length: maxAds }).map((_, i) => (
          <div
            key={i}
            className={`h-48 ${
              theme === "dark" ? "bg-gray-800" : "bg-gray-200"
            } animate-pulse rounded-lg`}
          />
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return null; // Don't show empty ad slots
  }

  return (
    <div className={className}>
      {placement === "banner" ? (
        <div className="space-y-2">
          {ads.map((ad) => (
            <AdItem key={ad.id} ad={ad} variant="banner" />
          ))}
        </div>
      ) : placement === "sidebar" ? (
        <div className="space-y-4">
          {ads.map((ad) => (
            <AdItem key={ad.id} ad={ad} variant="sidebar" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <AdItem key={ad.id} ad={ad} variant="card" />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdSlot;

