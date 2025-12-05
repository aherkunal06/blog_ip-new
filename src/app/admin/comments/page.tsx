"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { FaTrash, FaBan, FaCheck, FaTimes, FaUserSlash, FaUserCheck, FaReply, FaSearch, FaComment } from "react-icons/fa";

dayjs.extend(relativeTime);

interface Comment {
  id: number;
  content: string;
  status: string;
  isBlocked: boolean;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  blog: {
    id: number;
    title: string;
    slug: string;
  };
  user: {
    id: number;
    name: string;
    email: string;
    image: string | null;
  };
  replyCount: number;
}

interface CommentStats {
  total: number;
  approved: number;
  blocked: number;
}

export default function CommentsManagementPage() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const router = useRouter();

  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState<CommentStats>({ total: 0, approved: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "blocked">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [blockUserModal, setBlockUserModal] = useState<{ open: boolean; userId: number | null; userName: string }>({
    open: false,
    userId: null,
    userName: "",
  });
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    fetchComments();
  }, [currentPage, statusFilter, searchQuery]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        status: statusFilter,
      });
      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const res = await axios.get(`/api/admin/comments?${params.toString()}`);
      if (res.data.success) {
        setComments(res.data.comments || []);
        setStats(res.data.stats || { total: 0, approved: 0, blocked: 0 });
        setTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      toast.error(error.response?.data?.message || "Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await axios.delete(`/api/admin/comments/${commentId}`);
      if (res.data.success) {
        toast.success("Comment deleted successfully");
        fetchComments();
      }
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast.error(error.response?.data?.message || "Failed to delete comment");
    }
  };

  const handleBlock = async (commentId: number) => {
    try {
      const res = await axios.patch(`/api/admin/comments/${commentId}`, { action: "block" });
      if (res.data.success) {
        toast.success("Comment blocked successfully");
        fetchComments();
      }
    } catch (error: any) {
      console.error("Error blocking comment:", error);
      toast.error(error.response?.data?.message || "Failed to block comment");
    }
  };

  const handleUnblock = async (commentId: number) => {
    try {
      const res = await axios.patch(`/api/admin/comments/${commentId}`, { action: "unblock" });
      if (res.data.success) {
        toast.success("Comment unblocked successfully");
        fetchComments();
      }
    } catch (error: any) {
      console.error("Error unblocking comment:", error);
      toast.error(error.response?.data?.message || "Failed to unblock comment");
    }
  };

  const handleBlockUser = async () => {
    if (!blockUserModal.userId) return;

    try {
      const res = await axios.post("/api/admin/comments/block-user", {
        userId: blockUserModal.userId,
        reason: blockReason,
      });
      if (res.data.success) {
        toast.success("User blocked from commenting successfully");
        setBlockUserModal({ open: false, userId: null, userName: "" });
        setBlockReason("");
        fetchComments();
      }
    } catch (error: any) {
      console.error("Error blocking user:", error);
      toast.error(error.response?.data?.message || "Failed to block user");
    }
  };

  const handleUnblockUser = async (userId: number) => {
    try {
      const res = await axios.delete(`/api/admin/comments/block-user?userId=${userId}`);
      if (res.data.success) {
        toast.success("User unblocked from commenting successfully");
        fetchComments();
      }
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      toast.error(error.response?.data?.message || "Failed to unblock user");
    }
  };

  const handleApprove = async (commentId: number) => {
    try {
      const res = await axios.patch(`/api/admin/comments/${commentId}`, {
        action: "updateStatus",
        status: "approved",
      });
      if (res.data.success) {
        toast.success("Comment approved successfully");
        fetchComments();
      }
    } catch (error: any) {
      console.error("Error approving comment:", error);
      toast.error(error.response?.data?.message || "Failed to approve comment");
    }
  };

  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const textPrimary = isDark ? "text-gray-100" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-300" : "text-gray-700";
  const borderColor = isDark ? "border-gray-700" : "border-gray-300";
  const inputBg = isDark ? "bg-gray-700" : "bg-white";
  const inputText = isDark ? "text-gray-100" : "text-gray-900";

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`${cardBg} shadow-xl rounded-2xl p-6 mb-6 border ${borderColor}`}>
          <h1 className={`text-3xl font-bold mb-2 ${textPrimary}`}>Comment Management</h1>
          <p className={`text-sm ${textSecondary}`}>Manage and moderate all comments on your blog</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className={`${cardBg} rounded-xl p-6 border ${borderColor} shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${textSecondary} mb-1`}>Total Comments</p>
                <p className={`text-3xl font-bold ${textPrimary}`}>{stats.total}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? "bg-blue-900/30" : "bg-blue-100"}`}>
                <FaComment className={`text-xl ${isDark ? "text-blue-400" : "text-blue-600"}`} />
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl p-6 border ${borderColor} shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${textSecondary} mb-1`}>Approved</p>
                <p className={`text-3xl font-bold ${textPrimary}`}>{stats.approved}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? "bg-green-900/30" : "bg-green-100"}`}>
                <FaCheck className={`text-xl ${isDark ? "text-green-400" : "text-green-600"}`} />
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-xl p-6 border ${borderColor} shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${textSecondary} mb-1`}>Blocked</p>
                <p className={`text-3xl font-bold ${textPrimary}`}>{stats.blocked}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? "bg-red-900/30" : "bg-red-100"}`}>
                <FaBan className={`text-xl ${isDark ? "text-red-400" : "text-red-600"}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`${cardBg} rounded-xl p-6 mb-6 border ${borderColor} shadow-lg`}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
              <input
                type="text"
                placeholder="Search comments, users, or blogs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${borderColor} ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer`}
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {(["all", "approved", "blocked"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                    statusFilter === status
                      ? isDark
                        ? "bg-blue-600 text-white"
                        : "bg-blue-500 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className={`${cardBg} rounded-xl border ${borderColor} shadow-lg overflow-hidden`}>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className={`mt-4 ${textSecondary}`}>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="p-8 text-center">
              <p className={`text-lg ${textPrimary}`}>No comments found</p>
              <p className={`text-sm ${textSecondary} mt-2`}>Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {comments.map((comment) => (
                <div key={comment.id} className={`p-6 hover:${isDark ? "bg-gray-750" : "bg-gray-50"} transition-colors`}>
                  <div className="flex gap-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {comment.user.image ? (
                        <Image
                          src={comment.user.image}
                          alt={comment.user.name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${isDark ? "bg-gray-700" : "bg-gray-200"} ${textPrimary}`}>
                          {comment.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Comment Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`font-semibold ${textPrimary}`}>{comment.user.name}</p>
                            <span className={`text-xs ${textSecondary}`}>{comment.user.email}</span>
                            {comment.isBlocked && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600"}`}>
                                Blocked
                              </span>
                            )}
                            {comment.status === "approved" && !comment.isBlocked && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? "bg-green-900/30 text-green-400" : "bg-green-100 text-green-600"}`}>
                                Approved
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${textSecondary}`}>
                            {dayjs(comment.createdAt).fromNow()} • on{" "}
                            <button
                              onClick={() => router.push(`/${comment.blog.slug}`)}
                              className="text-blue-500 hover:underline cursor-pointer"
                            >
                              {comment.blog.title}
                            </button>
                            {comment.replyCount > 0 && (
                              <span className="ml-2">
                                • {comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <p className={`${textPrimary} mb-4 whitespace-pre-wrap`}>{comment.content}</p>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {!comment.isBlocked && comment.status !== "approved" && (
                          <button
                            onClick={() => handleApprove(comment.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                              isDark
                                ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                          >
                            <FaCheck className="inline mr-1" /> Approve
                          </button>
                        )}
                        {!comment.isBlocked ? (
                          <button
                            onClick={() => handleBlock(comment.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                              isDark
                                ? "bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50"
                                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            }`}
                          >
                            <FaBan className="inline mr-1" /> Block
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnblock(comment.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                              isDark
                                ? "bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            <FaCheck className="inline mr-1" /> Unblock
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            isDark
                              ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          <FaTrash className="inline mr-1" /> Delete
                        </button>
                        <button
                          onClick={() =>
                            setBlockUserModal({
                              open: true,
                              userId: comment.user.id,
                              userName: comment.user.name,
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                            isDark
                              ? "bg-orange-900/30 text-orange-400 hover:bg-orange-900/50"
                              : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                          }`}
                        >
                          <FaUserSlash className="inline mr-1" /> Block User
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`p-4 border-t ${borderColor} flex items-center justify-center gap-2`}>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPage === 1
                    ? isDark
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 cursor-not-allowed"
                    : isDark
                    ? "text-gray-300 hover:bg-gray-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Previous
              </button>
              <span className={`px-4 ${textSecondary}`}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                  currentPage === totalPages
                    ? isDark
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 cursor-not-allowed"
                    : isDark
                    ? "text-gray-300 hover:bg-gray-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Block User Modal */}
      {blockUserModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-xl p-6 max-w-md w-full border ${borderColor} shadow-2xl`}>
            <h2 className={`text-xl font-bold mb-4 ${textPrimary}`}>Block User from Commenting</h2>
            <p className={`text-sm ${textSecondary} mb-4`}>
              Are you sure you want to block <strong>{blockUserModal.userName}</strong> from commenting?
            </p>
            <div className="mb-4">
              <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>Reason (optional)</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Enter reason for blocking..."
                rows={3}
                className={`w-full rounded-lg border px-4 py-2 ${borderColor} ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setBlockUserModal({ open: false, userId: null, userName: "" });
                  setBlockReason("");
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                  isDark
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all cursor-pointer ${
                  isDark
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


