"use client";
import { useThemeContext } from "@/context/ThemeContext";
import { FaFileAlt, FaCheckCircle, FaClock, FaBlog } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function DashboardContent() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const [stats, setStats] = useState({
    totalBlogs: 0,
    approvedBlogs: 0,
    pendingBlogs: 0,
    totalCategories: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/admin/dashboard');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className={`p-6 md:p-8 ${isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
          Dashboard
        </h1>
        <p className={`${isDark ? "text-gray-400" : "text-gray-500"} text-sm`}>
          Welcome to the admin dashboard
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={`p-6 rounded-2xl shadow-md ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="mb-2 flex items-center gap-2 text-gray-400 text-sm">
            <FaFileAlt /> Total Blogs
          </div>
          <div className="text-3xl font-bold">{loading ? '...' : stats.totalBlogs}</div>
        </div>
        <div className={`p-6 rounded-2xl shadow-md ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="mb-2 flex items-center gap-2 text-green-400 text-sm">
            <FaCheckCircle /> Approved Blogs
          </div>
          <div className="text-3xl font-bold">{loading ? '...' : stats.approvedBlogs}</div>
        </div>
        <div className={`p-6 rounded-2xl shadow-md ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="mb-2 flex items-center gap-2 text-amber-400 text-sm">
            <FaClock /> Pending Blogs
          </div>
          <div className="text-3xl font-bold">{loading ? '...' : stats.pendingBlogs}</div>
        </div>
        <div className={`p-6 rounded-2xl shadow-md ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="mb-2 flex items-center gap-2 text-blue-400 text-sm">
            <FaBlog /> Categories
          </div>
          <div className="text-3xl font-bold">{loading ? '...' : stats.totalCategories}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`p-6 rounded-2xl shadow-md ${isDark ? "bg-gray-800" : "bg-white"}`}>
        <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a
            href="/admin/blogs/create"
            className={`p-4 rounded-lg border-2 border-dashed transition-colors ${
              isDark
                ? "border-gray-600 hover:border-blue-500 hover:bg-gray-700"
                : "border-gray-300 hover:border-blue-500 hover:bg-gray-50"
            }`}
          >
            <div className="text-center">
              <FaBlog className="mx-auto mb-2 text-2xl text-blue-500" />
              <div className="font-medium">Create Blog</div>
            </div>
          </a>
          <a
            href="/admin/blogs/categories"
            className={`p-4 rounded-lg border-2 border-dashed transition-colors ${
              isDark
                ? "border-gray-600 hover:border-blue-500 hover:bg-gray-700"
                : "border-gray-300 hover:border-blue-500 hover:bg-gray-50"
            }`}
          >
            <div className="text-center">
              <FaFileAlt className="mx-auto mb-2 text-2xl text-purple-500" />
              <div className="font-medium">Manage Categories</div>
            </div>
          </a>
          <a
            href="/admin/blogs/media"
            className={`p-4 rounded-lg border-2 border-dashed transition-colors ${
              isDark
                ? "border-gray-600 hover:border-blue-500 hover:bg-gray-700"
                : "border-gray-300 hover:border-blue-500 hover:bg-gray-50"
            }`}
          >
            <div className="text-center">
              <FaFileAlt className="mx-auto mb-2 text-2xl text-pink-500" />
              <div className="font-medium">Media Manager</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

