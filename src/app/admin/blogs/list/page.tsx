"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dayjs from "dayjs";
import { 
  FaEdit, 
  FaCheckCircle, 
  FaClock, 
  FaFileAlt, 
  FaTrash,
  FaEye,
  FaPlus,
  FaFilter,
  FaDownload,
  FaCalendarAlt,
  FaUpload,
  FaFileExport
} from "react-icons/fa";
import { useDebounce } from "../../../../hooks/useDebounce";
import { useThemeContext } from "@/context/ThemeContext";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

type Blog = {
  id: number;
  title: string;
  image: string;
  authorId: number;
  author: { username: string };
  status: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminBlogListPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const debouncedSearch = useDebounce(globalFilter, 500);
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<"json" | "csv">("json");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const [totalCount, setTotalCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const isDark = theme === "dark";
  const router = useRouter();

  // Check route permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (session?.user?.role === 'super-admin') {
        return; // Super admins have all permissions
      }

      try {
        const res = await fetch(`/api/admin/check-route?route=/admin/blogs/list&method=GET`);
        const data = await res.json();
        
        if (!data.hasPermission) {
          toast.error("You don't have permission to access this page");
          router.push('/admin');
        }
      } catch (error) {
        console.error('Error checking permission:', error);
      }
    };

    if (session) {
      checkPermission();
    }
  }, [session, router]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all")
        params.set("status", statusFilter === "approved" ? "true" : "false");
      if (startDate) params.set("startDate", dayjs(startDate).toISOString());
      if (endDate) params.set("endDate", dayjs(endDate).toISOString());

      const res = await fetch(`/api/admin/blogs?${params.toString()}`);
      const data = await res.json();
      
      // Handle error responses
      if (!res.ok || data.error) {
        if (res.status === 403) {
          toast.error("You don't have permission to access this page");
          router.push('/admin');
          return;
        }
        toast.error(data.error || "Failed to fetch blogs");
        setBlogs([]);
        setRowCount(0);
        setTotalCount(0);
        setApprovedCount(0);
        setPendingCount(0);
        setLoading(false);
        return;
      }

      // Ensure data.blogs is an array
      const blogsArray = Array.isArray(data.blogs) ? data.blogs : [];
      setBlogs(blogsArray);
      setRowCount(data.total || 0);

      // Calculate dashboard counts
      const approved = blogsArray.filter((b: Blog) => b.status).length;
      const pending = blogsArray.filter((b: Blog) => !b.status).length;
      setTotalCount(data.total || 0);
      setApprovedCount(approved);
      setPendingCount(pending);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast.error("Failed to fetch blogs");
      setBlogs([]);
      setRowCount(0);
      setTotalCount(0);
      setApprovedCount(0);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/admin/blogs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: !currentStatus }),
      });
      if (res.ok) {
        toast.success(`Blog ${!currentStatus ? 'approved' : 'marked as pending'}!`);
        fetchBlogs();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const bulkUpdateStatus = async (newStatus: boolean) => {
    if (!selectedIds.length) return toast.error("Please select at least one blog.");
    
    try {
      const res = await fetch("/api/admin/blogs/bulk-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status: newStatus }),
      });
      if (res.ok) {
        setSelectedIds([]);
        toast.success(`${selectedIds.length} blogs ${newStatus ? 'approved' : 'marked as pending'}!`);
        fetchBlogs();
      } else {
        toast.error("Bulk update failed");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  const deleteBlogs = async (ids: number[]) => {
    if (!ids.length) return;

    try {
      await axios.delete(`/api/blogs/delete/${ids.join(',')}`);
      toast.success(
        ids.length > 1 ? "Selected blogs deleted!" : "Blog deleted successfully!"
      );
      setSelectedIds([]);
      fetchBlogs();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete blog(s).");
    } finally {
      setShowDeleteModal(false);
      setDeleteTargetIds([]);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: "csv",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter === "approved" ? "approved" : "pending");
      }
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const response = await fetch(`/api/blogs/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blogs-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Blogs exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export blogs");
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error("Please select a file");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("format", importFormat);
      formData.append("skipDuplicates", String(skipDuplicates));

      const response = await axios.post("/api/blogs/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setImportResult(response.data.results);
        toast.success(response.data.message);
        setShowImportModal(false);
        setImportFile(null);
        fetchBlogs();
      } else {
        toast.error(response.data.message || "Import failed");
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.response?.data?.message || "Failed to import blogs");
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, [pageIndex, pageSize, debouncedSearch, statusFilter, startDate, endDate]);

  const StatCard = ({ icon, title, count, color, bgColor }: any) => (
    <div className={`relative overflow-hidden rounded-2xl shadow-lg border transition-all duration-300 hover:shadow-xl hover:scale-105 ${
      isDark ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
    }`}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {title}
            </p>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {count}
            </p>
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <div className={`text-xl ${color}`}>
              {icon}
            </div>
          </div>
        </div>
      </div>
      <div className={`absolute inset-0 bg-gradient-to-r ${bgColor} opacity-5`}></div>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-black' : 'bg-gradient-to-br from-gray-50 via-white to-slate-100'}`}>
      <div className="p-6 md:p-8">
        {/* Dashboard Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<FaFileAlt />}
            title="Total Blogs"
            count={totalCount}
            color="text-blue-500"
            bgColor="bg-blue-50"
          />
          <StatCard
            icon={<FaCheckCircle />}
            title="Approved Blogs"
            count={approvedCount}
            color="text-green-500"
            bgColor="bg-green-50"
          />
          <StatCard
            icon={<FaClock />}
            title="Pending Blogs"
            count={pendingCount}
            color="text-amber-500"
            bgColor="bg-amber-50"
          />
        </div>

        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className={`text-3xl lg:text-4xl font-bold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Blog Management
            </h1>
            <p className={`text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Manage your blog posts, approve content, and track performance
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 cursor-pointer ${
                isDark 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'
              }`}
            >
              <FaFilter />
              Filters
            </button>
            
            <button
              onClick={handleExport}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 cursor-pointer ${
                isDark 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'
              }`}
            >
              <FaFileExport />
              Export
            </button>
            
            <button
              onClick={() => setShowImportModal(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 cursor-pointer ${
                isDark 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'
              }`}
            >
              <FaUpload />
              Import
            </button>
            
            <button
              onClick={() => router.push("/admin/blogs/create")}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
            >
              <FaPlus />
              Create Blog
            </button>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className={`p-6 rounded-2xl border mb-6 transition-all duration-300 ${
            isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200 shadow-sm'
          }`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search title/author..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate || ""}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate || ""}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className={`rounded-2xl border overflow-hidden shadow-xl ${
          isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
        }`}>
          {/* Table Header */}
          <div className={`px-6 py-4 border-b ${
            isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50/50'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {selectedIds.length} selected
                </span>
                {selectedIds.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => bulkUpdateStatus(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer"
                    >
                      <FaCheckCircle />
                      Approve
                    </button>
                    <button
                      onClick={() => bulkUpdateStatus(false)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer"
                    >
                      <FaClock />
                      Pending
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTargetIds(selectedIds);
                        setShowDeleteModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer"
                    >
                      <FaTrash />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                    isDark 
                      ? 'bg-gray-900 border-gray-600 text-gray-100' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${
                isDark ? 'bg-gray-900/30' : 'bg-gray-50'
              }`}>
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={blogs.length > 0 && selectedIds.length === blogs.length}
                      onChange={(e) => setSelectedIds(
                        e.target.checked ? blogs.map(b => b.id) : []
                      )}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Blog
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Author
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Date
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className={`ml-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Loading blogs...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : blogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <FaFileAlt className={`w-12 h-12 mb-4 ${
                          isDark ? 'text-gray-600' : 'text-gray-400'
                        }`} />
                        <p className={`text-lg font-medium ${
                          isDark ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          No blogs found
                        </p>
                        <p className={`text-sm ${
                          isDark ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                          Try adjusting your search criteria
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  blogs.map((blog, index) => {
                    const isSelected = selectedIds.includes(blog.id);
                    return (
                      <tr
                        key={blog.id}
                        className={`border-t transition-colors duration-200 ${
                          isDark ? 'border-gray-700 hover:bg-gray-800/30' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => setSelectedIds(
                              e.target.checked 
                                ? [...selectedIds, blog.id] 
                                : selectedIds.filter(id => id !== blog.id)
                            )}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                              <Image
                                src={blog.image}
                                alt={blog.title}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className={`font-medium truncate ${
                                isDark ? 'text-white' : 'text-gray-900'
                              }`}>
                                {blog.title}
                              </p>
                              <p className={`text-sm ${
                                isDark ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                ID: {blog.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${
                            isDark ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            {blog.author.username}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleStatus(blog.id, blog.status)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${
                              blog.status
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {blog.status ? <FaCheckCircle /> : <FaClock />}
                            {blog.status ? 'Approved' : 'Pending'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`text-sm ${
                            isDark ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            <div className="flex items-center gap-1">
                              <FaCalendarAlt className="w-3 h-3" />
                              {dayjs(blog.createdAt).format('MMM DD, YYYY')}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/blogs/edit/${blog.id}`}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                isDark 
                                  ? 'text-blue-400 hover:bg-blue-400/10 hover:text-blue-300' 
                                  : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                              }`}
                            >
                              <FaEdit />
                              Edit
                            </Link>
                            <button
                              onClick={() => {
                                setDeleteTargetIds([blog.id]);
                                setShowDeleteModal(true);
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 cursor-pointer ${
                                isDark 
                                  ? 'text-red-400 hover:bg-red-400/10 hover:text-red-300' 
                                  : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                              }`}
                            >
                              <FaTrash />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && blogs.length > 0 && (
            <div className={`px-6 py-4 border-t ${
              isDark ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, rowCount)} of {rowCount} results
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                    disabled={pageIndex === 0}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                      pageIndex === 0
                        ? isDark ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                        : isDark ? 'text-gray-300 hover:bg-gray-700 cursor-pointer' : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                    }`}
                  >
                    Previous
                  </button>
                  <span className={`px-3 py-1.5 text-sm ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Page {pageIndex + 1} of {Math.ceil(rowCount / pageSize)}
                  </span>
                  <button
                    onClick={() => setPageIndex(pageIndex + 1)}
                    disabled={pageIndex >= Math.ceil(rowCount / pageSize) - 1}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                      pageIndex >= Math.ceil(rowCount / pageSize) - 1
                        ? isDark ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 cursor-not-allowed'
                        : isDark ? 'text-gray-300 hover:bg-gray-700 cursor-pointer' : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowImportModal(false)} />
          <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDark ? 'bg-blue-900' : 'bg-blue-100'
              }`}>
                <FaUpload className={isDark ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <h3 className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Import Blogs
              </h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  File Format
                </label>
                <select
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value as "json" | "csv")}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Select File
                </label>
                <input
                  type="file"
                  accept={importFormat === "csv" ? ".csv" : ".json"}
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark 
                      ? 'bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="skipDuplicates"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="skipDuplicates" className={`text-sm ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Skip duplicate slugs (auto-generate unique slugs)
                </label>
              </div>

              {importResult && (
                <div className={`p-4 rounded-xl ${
                  isDark ? 'bg-gray-900' : 'bg-gray-50'
                }`}>
                  <p className={`text-sm font-medium mb-2 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Import Results:
                  </p>
                  <ul className={`text-sm space-y-1 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <li>Total: {importResult.total}</li>
                    <li className="text-green-600">Created: {importResult.created}</li>
                    <li className="text-yellow-600">Skipped: {importResult.skipped}</li>
                    <li className="text-red-600">Failed: {importResult.failed}</li>
                  </ul>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className={`text-xs font-medium mb-1 ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Errors:
                      </p>
                      <ul className={`text-xs max-h-32 overflow-y-auto ${
                        isDark ? 'text-red-400' : 'text-red-600'
                      }`}>
                        {importResult.errors.slice(0, 5).map((error: string, idx: number) => (
                          <li key={idx}>{error}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>... and {importResult.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportResult(null);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 cursor-pointer ${
                  isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl p-6 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <FaTrash className="text-red-600" />
              </div>
              <h3 className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Confirm Deletion
              </h3>
            </div>
            
            <p className={`mb-6 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {deleteTargetIds.length > 1
                ? `Are you sure you want to delete ${deleteTargetIds.length} blogs? This action cannot be undone.`
                : "Are you sure you want to delete this blog? This action cannot be undone."
              }
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 cursor-pointer ${
                  isDark 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() => deleteBlogs(deleteTargetIds)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-300 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}