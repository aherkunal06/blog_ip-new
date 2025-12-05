"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useThemeContext } from "@/context/ThemeContext";
import { useSession } from "next-auth/react";
import {
  FaChevronLeft,
  FaUserCircle,
  FaChevronDown,
  FaTachometerAlt,
  FaBlog,
  FaBook,
  FaLink,
  FaShieldVirus,
  FaChartLine,
  FaComment,
  FaLock,
  FaMailBulk,
  FaUsers,
  FaCog,
  FaInfoCircle,
  FaFileAlt,
  FaSearch,
  FaMoon,
  FaSun,
  FaSync,
  FaList,
  FaCalendarAlt,
} from "react-icons/fa";
import Image from "next/image";
import { FaChartColumn } from "react-icons/fa6";
import { PhotoIcon } from "@heroicons/react/20/solid";

type DrawerItem = {
  title: string;
  link?: string;
  icon: React.ReactNode;
  iconColor: string;
  children?: Array<{
    title: string;
    link: string;
    icon: React.ReactNode;
    iconColor: string;
  }>;
};

interface AdminNavbarProps {
  children: React.ReactNode;
}

export default function AdminNavbar({ children }: AdminNavbarProps) {
  const { theme, toggleTheme } = useThemeContext();
  const { data: session } = useSession();
  const [adminUser, setAdminUser] = useState<{ name: string; email: string } | null>(null);
  const [open, setOpen] = useState(true);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchAdminUser = async () => {
      if (session?.user?.name) {
        try {
          const res = await fetch('/api/admin/user-info');
          if (res.ok) {
            const data = await res.json();
            setAdminUser(data);
          } else {
            // Fallback to session data
            setAdminUser({
              name: session.user.name || 'Admin User',
              email: (session.user as any).email || 'admin@shopblog.com',
            });
          }
        } catch (error) {
          // Fallback to session data
          setAdminUser({
            name: session.user.name || 'Admin User',
            email: (session.user as any).email || 'admin@shopblog.com',
          });
        }
      }
    };
    fetchAdminUser();
  }, [session]);

  // Global fixed tooltip state for collapsed mode
  const [hoverTip, setHoverTip] = useState<{
    visible: boolean;
    top: number;
    left: number;
    item?: DrawerItem;
  } | null>(null);

  useEffect(() => {
    const handleScroll = () =>
      setHoverTip((t) => (t ? { ...t, visible: false } : t));
    const handleResize = () =>
      setHoverTip((t) => (t ? { ...t, visible: false } : t));
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const drawerItems: DrawerItem[] = [
    {
      title: "Dashboard",
      link: "/admin",
      icon: <FaBlog />,
      iconColor: "text-blue-600",
    },
    {
      title: "Categories",
      link: "/admin/blogs/categories",
      icon: <FaBook />,
      iconColor: "text-violet-500",
    },
    {
      title: "Events",
      link: "/admin/events",
      icon: <FaCalendarAlt />,
      iconColor: "text-pink-500",
    },
    {
      title: "Blogs",
      icon: <FaFileAlt />,
      iconColor: "text-indigo-500",
      children: [
        {
          title: "All Blogs",
          link: "/admin/blogs/list",
          icon: <FaList />,
          iconColor: "text-indigo-500",
        },
        {
          title: "Generate",
          link: "/admin/blogs/generate",
          icon: <FaSync />,
          iconColor: "text-green-500",
        },
        {
          title: "Create",
          link: "/admin/blogs/create",
          icon: <FaFileAlt />,
          iconColor: "text-blue-500",
        },
      ],
    },
 {
  title: "Media",
  link: "/admin/blogs/media",
  icon: <PhotoIcon className="w-5 h-5" />,
  iconColor: "text-pink-400",
},

    {
      title: "Information",
      icon: <FaInfoCircle />,
      iconColor: "text-teal-500",
      children: [
        {
          title: "About",
          link: "/admin/information/about",
          icon: <FaFileAlt />,
          iconColor: "text-slate-500",
        },
        {
          title: "Privacy Policies",
          link: "/admin/information/privacy_policies",
          icon: <FaFileAlt />,
          iconColor: "text-stone-500",
        },
        {
          title: "Terms",
          link: "/admin/information/terms",
          icon: <FaFileAlt />,
          iconColor: "text-neutral-500",
        },
      ],
    },
    {
      title: "Admin Users",
      link: "/admin/admin-users",
      icon: <FaUsers />,
      iconColor: "text-amber-500",
    },
    {
      title: "Admin Groups",
      link: "/admin/admin-groups",
      icon: <FaUsers />,
      iconColor: "text-purple-500",
    },
    {
      title: "Comments",
      link: "/admin/comments",
      icon: <FaComment />,
      iconColor: "text-cyan-500",
    },
    {
      title: "Site Settings",
      link: "/admin/site-settings",
      icon: <FaCog />,
      iconColor: "text-green-500",
    },
    {
      title: "Ads Management",
      icon: <FaChartLine />,
      iconColor: "text-orange-500",
      children: [
        {
          title: "Product Sync",
          link: "/admin/ads/product-sync",
          icon: <FaSync />,
          iconColor: "text-blue-500",
        },
        {
          title: "Campaigns",
          link: "/admin/ads/campaigns",
          icon: <FaChartColumn />,
          iconColor: "text-purple-500",
        },
        {
          title: "Product Priority",
          link: "/admin/ads/products",
          icon: <FaChartLine />,
          iconColor: "text-indigo-500",
        },
      ],
    },
    {
      title: "Auto Generate",
      icon: <FaFileAlt />,
      iconColor: "text-emerald-500",
      children: [
        {
          title: "Dashboard",
          link: "/admin/blogs/auto-generate",
          icon: <FaTachometerAlt />,
          iconColor: "text-blue-500",
        },
        {
          title: "Products",
          link: "/admin/blogs/auto-generate/products",
          icon: <FaList />,
          iconColor: "text-green-500",
        },
        {
          title: "Settings",
          link: "/admin/blogs/auto-generate/settings",
          icon: <FaCog />,
          iconColor: "text-gray-500",
        },
      ],
    },
    {
      title: "Logout",
      link: "/api/auth/admin/signout",
      icon: <FaLock />,
      iconColor: "text-red-500",
    },
  ];

  const hasChildren = (item: DrawerItem) => !!item.children?.length;
  const toggleDropdown = (title: string) =>
    setOpenDropdown((cur) => (cur === title ? null : title));
  const isActive = (link?: string) => !!link && pathname === link;
  const isParentActive = (item: DrawerItem) =>
    (item.link && isActive(item.link)) ||
    (item.children?.some((c) => isActive(c.link)) ?? false);

  useEffect(() => {
    const activeParent = drawerItems.find((item) =>
      item.children?.some((c) => isActive(c.link))
    );
    if (activeParent) setOpenDropdown(activeParent.title);
  }, [pathname]);

  // Collapsed hover: compute tooltip position and content
  const handleItemEnter = (
    e: React.MouseEvent<HTMLElement>,
    item: DrawerItem
  ) => {
    if (open) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const top = rect.top + window.scrollY;
    const left = rect.right + 8 + window.scrollX;
    setHoverTip({ visible: true, top, left, item });
  };
  const handleItemLeave = () => setHoverTip(null);

  // Click behavior for parents (works in both modes)
  const handleParentClick = (e: React.MouseEvent, item: DrawerItem) => {
    if (!hasChildren(item)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!open) {
      setOpenDropdown((cur) => (cur === item.title ? null : item.title));
      setHoverTip((prev) =>
        prev?.item?.title === item.title ? { ...prev, visible: true } : prev
      );
      return;
    }
    toggleDropdown(item.title);
  };

  return (
    <div
      className={`flex h-screen transition-colors duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white"
          : "bg-gradient-to-br from-gray-50 via-white to-slate-100 text-gray-900"
      }`}
    >
      {/* Sidebar */}
      <div
        className={`${open ? "w-72" : "w-20"} transition-all duration-300 ${
          theme === "dark"
            ? "bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700"
            : "bg-gradient-to-b from-white to-gray-50 border-r border-gray-200"
        } flex flex-col shadow-xl relative z-10`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-opacity-20 backdrop-blur-sm">
          <div className={`${open ? "flex items-center gap-3" : "hidden"}`}>
            <div className="w-10 h-10 relative">
              <Image
                src="/ipshopylogo.png"
                alt="Logo"
                fill
                className="object-cover rounded-xl"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ipshopyBlogs
              </h1>
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Admin Panel
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              theme === "dark"
                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
            aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          >
            {open ? (
              <FaChevronLeft className="text-lg" />
            ) : (
              <div className="w-10 h-10 relative m-0">
                <Image
                  src="/ipshopylogo.png"
                  alt="Logo"
                  fill
                  className="object-cover rounded-xl"
                />
              </div>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto scrollbar-hide relative">
          <div className="space-y-2">
            {drawerItems.map((item) => {
              const parentActive = isParentActive(item);
              const dropdownOpen = openDropdown === item.title;
              const isLeaf = !hasChildren(item);

              const collapsedHoverProps = !open
                ? {
                    onMouseEnter: (e: React.MouseEvent<HTMLElement>) =>
                      handleItemEnter(e, item),
                    onMouseLeave: handleItemLeave,
                  }
                : {};

              return (
                <div key={item.title} className="relative group">
                  {isLeaf ? (
                    <Link
                      href={item.link || "#"}
                      {...collapsedHoverProps}
                      className={`flex items-center w-full p-3 gap-4 rounded-xl transition-all duration-200 ${
                        !open ? "justify-center" : ""
                      } ${
                        isActive(item.link)
                          ? theme === "dark"
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                            : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                          : theme === "dark"
                          ? "hover:bg-gray-700 text-gray-300 hover:text-white"
                          : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <span
                        className={`text-xl ${
                          isActive(item.link) ? "text-white" : item.iconColor
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`font-medium truncate ${
                          open ? "" : "hidden"
                        }`}
                      >
                        {item.title}
                      </span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      {...collapsedHoverProps}
                      aria-haspopup="true"
                      aria-expanded={dropdownOpen}
                      onClick={(e) => handleParentClick(e, item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleParentClick(e as any, item);
                        }
                      }}
                      className={`flex items-center w-full p-3 gap-4 rounded-xl transition-all duration-200 ${
                        !open ? "justify-center" : ""
                      } ${
                        parentActive
                          ? theme === "dark"
                            ? "bg-gray-700 text-blue-400"
                            : "bg-blue-50 text-blue-700"
                          : theme === "dark"
                          ? "hover:bg-gray-700 text-gray-300 hover:text-white"
                          : "hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                      }`}
                    >
                      <span
                        className={`text-xl ${
                          parentActive ? "text-blue-500" : item.iconColor
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span
                        className={`font-medium truncate flex-1 text-left ${
                          open ? "" : "hidden"
                        }`}
                      >
                        {item.title}
                      </span>
                      {open && (
                        <span
                          className={`transition-transform duration-200 ${
                            dropdownOpen ? "rotate-180" : ""
                          }`}
                        >
                          <FaChevronDown className="text-sm" />
                        </span>
                      )}
                    </button>
                  )}

                  {/* Inline dropdown when expanded */}
                  {hasChildren(item) && open && dropdownOpen && (
                    <div className="mt-2 ml-6 space-y-1 border-l-2 border-gray-300 dark:border-gray-600 pl-4">
                      {item.children!.map((child) => (
                        <Link
                          key={child.title}
                          href={child.link}
                          className={`flex items-center p-2 gap-3 rounded-lg transition-all duration-200 text-sm ${
                            isActive(child.link)
                              ? theme === "dark"
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                                : "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                              : theme === "dark"
                              ? "hover:bg-gray-700 text-gray-400 hover:text-white"
                              : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <span
                            className={`text-base ${
                              isActive(child.link)
                                ? "text-white"
                                : child.iconColor
                            }`}
                          >
                            {child.icon}
                          </span>
                          <span className="font-medium">{child.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header
          className={`flex justify-between items-center px-6 py-4 border-b backdrop-blur-sm ${
            theme === "dark"
              ? "border-gray-700 bg-gray-800/80"
              : "border-gray-200 bg-white/80"
          } shadow-sm sticky top-0 z-20`}
        >
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <FaSearch
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                type="text"
                placeholder="Search in admin panel..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-all duration-200 ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-600"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-gray-50"
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 ml-6">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all duration-200 ${
                theme === "dark"
                  ? "hover:bg-gray-700 text-yellow-400"
                  : "hover:bg-gray-100 text-blue-600"
              }`}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <FaMoon /> : <FaSun />}
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-gray-300 dark:border-gray-600">
              <div className="text-right">
                <div
                  className={`font-medium ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}
                >
                  {adminUser?.name || session?.user?.name || 'Admin User'}
                </div>
                <div
                  className={`text-xs ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {adminUser?.email || (session?.user as any)?.email || 'admin@shopblog.com'}
                </div>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white">
                <FaUserCircle className="text-xl" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto bg-opacity-50">
          <div className="max-w-full mx-auto">{children}</div>
        </main>
      </div>

      {/* Global fixed tooltip for collapsed sidebar */}
      {!open && hoverTip?.visible && hoverTip.item && (
        <div
          className="fixed z-[22]"
          style={{ top: hoverTip.top, left: hoverTip.left }}
          onMouseLeave={() => setHoverTip(null)}
        >
          <div
            className={`rounded-lg shadow-lg px-3 py-2 text-sm border pointer-events-auto ${
              theme === "dark"
                ? "bg-gray-900 text-white border-gray-700"
                : "bg-gray-900 text-white border-gray-800"
            }`}
          >
            <div className="font-semibold flex items-center gap-2">
              <span className="text-white">{hoverTip.item.icon}</span>
              <span>{hoverTip.item.title}</span>
            </div>
            {hoverTip.item.children?.length ? (
              <div className="mt-1 space-y-1">
                {hoverTip.item.children.map((child) => (
                  <Link
                    key={child.title}
                    href={child.link}
                    className="flex items-center gap-2 hover:underline text-gray-200"
                  >
                    <span>{child.icon}</span>
                    <span>{child.title}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

