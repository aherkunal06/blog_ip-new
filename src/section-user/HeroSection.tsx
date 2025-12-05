"use client";

import Image from "next/image";
import React, { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";

const HeroSection = () => {
  const { theme } = useThemeContext(); // ✅ get theme from context
  const colors = useDynamicColors();

  useEffect(() => {
    AOS.init({
      duration: 900,
      once: true,
      easing: "ease-in-out",
    });
  }, []);

  return (
    <section
      className={`relative px-4 md:px-10 py-6 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6 mt-10
        ${theme === "dark" ? "bg-black text-gray-100" : "bg-white text-gray-900"}`}
      style={{
        backgroundImage: `url('/2.webp')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Left Content */}
      <div className="flex-1">
        <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-900"}`}>
          <span className="mr-1">Welcome to</span>
          <span 
            className="inline-block bg-clip-text text-transparent animate-gradient-x"
            style={{
              backgroundImage: `linear-gradient(to right, ${colors.accent}, ${colors.primary}, ${colors.secondary})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              display: "inline-block",
            }}
          >
            ipshopyBlogs
          </span>
        </h1>

        <p className={`max-w-lg leading-relaxed mb-6 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
          — your space to explore handpicked articles, trending topics, and stories that matter. Read, learn, and stay updated with fresh perspectives every day.
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            href="https://ipshopy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2 text-white font-semibold rounded-full hover:scale-105 transition transform"
            style={{
              background: colors.getGradient("primary", "secondary"),
            }}
          >
            Shop Now on ipshopy.com
          </a>
          <a
            href="/articles"
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-full hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Explore Blogs
          </a>
        </div>
      </div>

      {/* Right Image */}
      <div className="flex-1 text-center">
        <Image
          src="/hero.png"
          alt="hero-image"
          width={420}
          height={320}
          className="max-w-full h-auto animate-bounce-slow"
        />
      </div>
    </section>
  );
};

export default HeroSection;
