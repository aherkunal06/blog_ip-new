"use client";

import { useThemeContext } from "@/context/ThemeContext";
import HeroWithProduct from "@/components/homepage/HeroWithProduct";
import ProductShowcaseCarousel from "@/components/homepage/ProductShowcaseCarousel";
import LatestProductBlogs from "@/components/homepage/LatestProductBlogs";
import HelpSupportSection from "@/components/homepage/HelpSupportSection";
import EventsShowcase from "@/components/homepage/EventsShowcase";
import TrendingTopics from "@/components/homepage/TrendingTopics";
import ProductCategoriesGrid from "@/components/homepage/ProductCategoriesGrid";
import NewsletterSignup from "@/components/homepage/NewsletterSignup";
import AdSlot from "@/components/ads/AdSlot";

export default function Home() {
  const { theme } = useThemeContext();

  return (
    <div className={`min-h-screen transition-colors duration-500 ${theme === "dark" ? "bg-black" : "bg-white"}`}>
      {/* SECTION 1: Hero with Product Spotlight */}
      <HeroWithProduct />

      {/* Homepage Banner Ads */}
      <div className="w-full px-4 md:px-6 py-6">
        <AdSlot placement="banner" isHomepage={true} maxAds={1} />
      </div>

      {/* SECTION 2: Product Showcase Carousel */}
      <ProductShowcaseCarousel 
        title="Featured Products" 
        autoRotate={true}
        rotateInterval={5000}
        limit={12}
      />

      {/* SECTION 3: Latest Product Blogs */}
      <LatestProductBlogs />

      {/* SECTION 4: Help & Support Blogs */}
      <HelpSupportSection />

      {/* SECTION 5: Upcoming Events */}
      <EventsShowcase />

      {/* SECTION 6: Trending Topics */}
      <TrendingTopics />

      {/* SECTION 7: Product Categories */}
      <ProductCategoriesGrid />

      {/* SECTION 8: Newsletter Signup */}
      <NewsletterSignup />
    </div>
  );
}
