"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { SessionProvider } from "next-auth/react";
import { Provider } from "react-redux";
import { store } from "../redux/store/store";
import { ThemeProvider } from "@/context/ThemeContext";
import { SiteSettingsProvider } from "@/context/SiteSettingsContext";
import SiteLayoutWrapper from "@/components/SiteLayoutWrapper";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      // Explicitly add or remove dark class
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      // Explicitly add or remove dark class
      if (prefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    // Explicitly add or remove dark class
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <SiteSettingsProvider>
    <ThemeProvider>
    <Provider store={store}>
      <SessionProvider basePath="/api/auth/user">
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;700&display=swap"
          rel="stylesheet"
          />

        <SiteLayoutWrapper>
          <Header theme={theme} toggleTheme={toggleTheme} />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </SiteLayoutWrapper>
      </SessionProvider>
    </Provider>
  </ThemeProvider>
  </SiteSettingsProvider>
  );
}
