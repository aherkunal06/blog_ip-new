"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaSearch, FaTimes } from "react-icons/fa";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import ProductSearch from "@/components/ProductSearch";

type Suggestion = { id: number; title: string; slug: string };

const pages = [
  { title: "Home", link: "/" },
  { title: "About", link: "/about" },
  { title: "Contact", link: "/contact" },
];

const Navbar = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeContext();
  const colors = useDynamicColors();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setShowDropdown(false);
      setActiveIndex(-1);
      controllerRef.current?.abort();
      return;
    }

    const handler = setTimeout(async () => {
      try {
        // Abort previous request only before starting a new one
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        setLoading(true);
        const res = await fetch(
          `/api/blogs?search=${encodeURIComponent(searchQuery)}&suggest=1`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSearchResults((data.blogs || []) as Suggestion[]);
        setShowDropdown(true);
        setActiveIndex(-1);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("search error:", err);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedBlog = searchResults[activeIndex >= 0 ? activeIndex : 0];
      if (selectedBlog) {
        router.push(`/site/${selectedBlog.slug}`);
        setSearchQuery("");
        setShowDropdown(false);
        setMobileMenuOpen(false);
        setMobileSearchOpen(false);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setMobileSearchOpen(false);
    }
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/user/login" });
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  };

  const linkBaseClass = "text-sm font-medium cursor-pointer transition-all duration-300 relative group";
  const linkThemeClass = (active: boolean) => {
    if (active) {
      return "text-transparent bg-clip-text";
    }
    return theme === "dark"
      ? "text-gray-200 hover:text-transparent hover:bg-clip-text"
      : "text-gray-700 hover:text-transparent hover:bg-clip-text";
  };

  const LinkUnderline = ({ active }: { active: boolean }) => (
    <span
      className="absolute bottom-0 left-0 w-full h-0.5 transform transition-transform duration-300"
      style={{
        background: colors.getGradient("primary", "secondary"),
        transform: active ? "scaleX(1)" : "scaleX(0)",
      }}
    />
  );

  return (
    <>
      <header
        className={`fixed w-full z-50 transition-all duration-300 backdrop-blur-md ${
          theme === "dark" ? "bg-gray-900/90 border-b border-gray-800" : "border-b border-gray-200 shadow-sm"
        }`}
        style={theme === "light" ? {
          backgroundColor: colors.headerBg ? `${colors.headerBg}e6` : "rgba(255, 255, 255, 0.9)", // e6 = 90% opacity, fallback to white
        } : {}}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => router.push("/")}>
              <div className="w-10 h-10 relative transition-transform duration-300 group-hover:scale-105">
                <Image src="/ipshopylogo.png" alt="Logo" fill className="object-cover rounded-xl shadow-md" />
              </div>
              <div 
                className="hidden sm:block text-xl lg:text-2xl font-bold bg-clip-text text-transparent animate-pulse inline-block"
                style={{
                  backgroundImage: `linear-gradient(to right, ${colors.accent}, ${colors.primary}, ${colors.secondary})`,
                  webkitBackgroundClip: "text",
                  webkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  display: "inline-block",
                } as React.CSSProperties}
              >
                ipshopyBlogs
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {pages.map((page) => {
                const isActive = pathname === page.link;
                return (
                  <Link key={page.link} href={page.link}>
                    <span 
                      className={`${linkBaseClass} ${linkThemeClass(isActive)} px-3 py-2 inline-block`}
                      style={isActive ? {
                        backgroundImage: colors.getGradient("primary", "secondary"),
                        webkitBackgroundClip: "text",
                        webkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        display: "inline-block",
                      } as React.CSSProperties : {}}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundImage = colors.getGradient("primary", "secondary");
                          (e.currentTarget.style as any).webkitBackgroundClip = "text";
                          (e.currentTarget.style as any).webkitTextFillColor = "transparent";
                          e.currentTarget.style.backgroundClip = "text";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundImage = "";
                          (e.currentTarget.style as any).webkitBackgroundClip = "";
                          (e.currentTarget.style as any).webkitTextFillColor = "";
                          e.currentTarget.style.backgroundClip = "";
                        }
                      }}
                    >
                      {page.title}
                      <LinkUnderline active={isActive} />
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Search */}
            <div className="hidden lg:block relative">
              <ProductSearch 
                placeholder="Search products or blogs..." 
                maxWidth="w-64"
                className="mx-0"
              />
            </div>

            {/* Desktop Auth & Theme */}
            <div className="hidden lg:flex items-center space-x-4">
              {!session ? (
                <button
                  onClick={() => router.push("/auth/user/login")}
                  className="px-6 py-2 rounded-full border-2 font-medium transition-all duration-300 hover:scale-105"
                  style={{
                    borderColor: colors.primary,
                    color: colors.primary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.primary;
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = colors.primary;
                  }}
                >
                  Sign In
                </button>
              ) : (
                <div ref={dropdownRef} className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold transition-all duration-300 hover:scale-105"
                    style={{
                      borderColor: colors.primary,
                      color: colors.primary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.primary;
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = colors.primary;
                    }}
                  >
                    {getInitials(session.user.name || undefined)}
                  </button>

                  {dropdownOpen && (
                    <div className={`absolute right-0 mt-3 w-48 rounded-xl shadow-2xl border backdrop-blur-sm ${theme === "dark" ? "bg-gray-800/95 border-gray-600" : "bg-white/95 border-gray-200"}`}>
                      <div className={`px-4 py-3 border-b ${theme === "dark" ? "border-gray-600" : "border-gray-200"}`}>
                        <p className={`text-sm font-medium truncate ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{session.user.name}</p>
                        <p className={`text-xs truncate ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{session.user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          signOut({ callbackUrl: "/auth/user/login" });
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 text-sm font-medium rounded-b-xl transition-colors ${theme === "dark" ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button onClick={toggleTheme} className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${theme === "dark" ? "text-yellow-400 hover:bg-yellow-400/10" : "text-gray-600 hover:bg-gray-200"}`}>
                {theme === "light" ? "🌙" : "☀️"}
              </button>
            </div>

            {/* Mobile Controls */}
            <div className="flex lg:hidden items-center space-x-2">
              <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)} className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
                <FaSearch className={theme === "dark" ? "text-gray-300" : "text-gray-600"} />
              </button>

              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className={`relative p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
                <div className="w-6 h-6 flex flex-col justify-center items-center">
                  <span className={`block h-0.5 w-6 transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-1.5" : ""} ${theme === "dark" ? "bg-white" : "bg-gray-900"}`} />
                  <span className={`block h-0.5 w-6 my-1 transition-all duration-300 ${mobileMenuOpen ? "opacity-0" : "opacity-100"} ${theme === "dark" ? "bg-white" : "bg-gray-900"}`} />
                  <span className={`block h-0.5 w-6 transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-1.5" : ""} ${theme === "dark" ? "bg-white" : "bg-gray-900"}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          {mobileSearchOpen && (
            <div className="lg:hidden px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <div className="relative">
                <ProductSearch placeholder="Search products or blogs..." />
                <button 
                  onClick={() => setMobileSearchOpen(false)} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
                >
                  <FaTimes className={theme === "dark" ? "text-gray-400" : "text-gray-500"} />
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeMobileMenu} />
          <div className={`fixed top-0 right-0 h-full w-80 z-50 transform transition-transform duration-300 lg:hidden ${theme === "dark" ? "bg-gray-900" : "bg-white"} shadow-2xl`}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Menu</h2>
                <button onClick={closeMobileMenu} className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
                  <FaTimes className={theme === "dark" ? "text-white" : "text-gray-900"} />
                </button>
              </div>

              <nav className="space-y-4">
                {pages.map((page) => (
                  <Link key={page.link} href={page.link} onClick={closeMobileMenu}>
                    <div
                      className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
                        pathname === page.link ? "text-white" : theme === "dark" ? "text-gray-200 hover:bg-gray-700" : "text-gray-700 hover:bg-gray-100"
                      }`}
                      style={{
                        backgroundColor: pathname === page.link ? colors.primary : undefined,
                      }}
                    >
                      {page.title}
                    </div>
                  </Link>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                {!session ? (
                    <button
                    onClick={() => {
                      router.push("/auth/user/login");
                      closeMobileMenu();
                    }}
                    className="w-full px-4 py-3 rounded-lg font-medium border-2 transition-colors"
                    style={{
                      borderColor: colors.primary,
                      color: colors.primary,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.primary;
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = colors.primary;
                    }}
                  >
                    Sign In
                  </button>
                ) : (
                  <>
                    <div className={`px-4 py-3 rounded-lg border ${theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"}`}>
                      <p className="font-medium text-sm truncate">{session.user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await signOut({ callbackUrl: "/auth/user/login" });
                        closeMobileMenu();
                      }}
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${theme === "dark" ? "text-red-400 hover:bg-red-500/10" : "text-red-600 hover:bg-red-50"}`}
                    >
                      Logout
                    </button>
                  </>
                )}

                <button onClick={toggleTheme} className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${theme === "dark" ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}>
                  {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;

