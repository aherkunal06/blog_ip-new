"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import Image from "next/image";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { FaReply, FaPaperPlane, FaSpinner } from "react-icons/fa";
import Link from "next/link";

dayjs.extend(relativeTime);

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    image: string | null;
  };
  replies: Reply[];
}

interface Reply {
  id: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    image: string | null;
  };
  isAdminReply: boolean;
}

interface BlogCommentsProps {
  blogId: number;
}

export default function BlogComments({ blogId }: BlogCommentsProps) {
  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const isDark = theme === "dark";

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchComments();
  }, [blogId, currentPage]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/comments?blogId=${blogId}&page=${currentPage}&limit=10`);
      if (res.data.success) {
        setComments(res.data.comments || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalComments(res.data.pagination?.total || 0);
      }
    } catch (error: any) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      toast.error("Please login to comment");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post("/api/comments", {
        blogId,
        content: newComment.trim(),
      });

      if (res.data.success) {
        toast.success("Comment posted successfully");
        setNewComment("");
        fetchComments();
      }
    } catch (error: any) {
      console.error("Error posting comment:", error);
      toast.error(error.response?.data?.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (commentId: number) => {
    if (!session) {
      toast.error("Please login to reply");
      return;
    }

    const content = replyContent[commentId]?.trim();
    if (!content) {
      toast.error("Reply cannot be empty");
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post("/api/comments", {
        blogId,
        content,
        parentId: commentId,
      });

      if (res.data.success) {
        toast.success("Reply posted successfully");
        setReplyContent((prev) => ({ ...prev, [commentId]: "" }));
        setReplyingTo(null);
        fetchComments();
      }
    } catch (error: any) {
      console.error("Error posting reply:", error);
      toast.error(error.response?.data?.message || "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const textPrimary = isDark ? "text-gray-100" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-300" : "text-gray-700";
  const borderColor = isDark ? "border-gray-700" : "border-gray-300";
  const inputBg = isDark ? "bg-gray-700" : "bg-white";
  const inputText = isDark ? "text-gray-100" : "text-gray-900";

  return (
    <div className={`mt-16 ${cardBg} rounded-2xl shadow-xl p-6 md:p-8 border ${borderColor}`}>
      <h2 className={`text-3xl font-bold mb-6 ${textPrimary}`}>
        Comments ({totalComments})
      </h2>

      {/* Comment Form */}
      {session ? (
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="flex gap-3 mb-3">
            {session.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={40}
                height={40}
                className="rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${isDark ? "bg-gray-700" : "bg-gray-200"} ${textPrimary}`}>
                {(session.user?.name || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your comment..."
                rows={4}
                className={`w-full rounded-lg border px-4 py-3 ${borderColor} ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none`}
                disabled={submitting}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className={`px-6 py-2 rounded-lg font-medium text-white transition-all cursor-pointer ${
                submitting || !newComment.trim()
                  ? "bg-gray-500 cursor-not-allowed"
                  : isDark
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {submitting ? (
                <>
                  <FaSpinner className="inline mr-2 animate-spin" /> Posting...
                </>
              ) : (
                <>
                  <FaPaperPlane className="inline mr-2" /> Post Comment
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className={`mb-8 p-4 rounded-lg border ${borderColor} ${isDark ? "bg-gray-900/50" : "bg-gray-50"}`}>
          <p className={`${textSecondary} mb-3`}>Please login to leave a comment</p>
          <Link
            href="/auth/user/login"
            className={`inline-block px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
              isDark
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            Login
          </Link>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <FaSpinner className="inline-block animate-spin text-2xl text-blue-500 mb-2" />
          <p className={textSecondary}>Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💬</div>
          <p className={`text-lg font-medium ${textPrimary} mb-2`}>No comments yet</p>
          <p className={`text-sm ${textSecondary}`}>Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className={`border-l-4 ${isDark ? "border-blue-600" : "border-blue-500"} pl-6 py-4 ${isDark ? "bg-gray-900/50" : "bg-gray-50"} rounded-r-xl`}>
              {/* Comment Header */}
              <div className="flex items-center gap-3 mb-3">
                {comment.user.image ? (
                  <Image
                    src={comment.user.image}
                    alt={comment.user.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${isDark ? "bg-gray-700" : "bg-gray-200"} ${textPrimary}`}>
                    {comment.user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${textPrimary}`}>{comment.user.name}</p>
                    {comment.user.email && session?.user?.email === comment.user.email && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? "bg-blue-900/30 text-blue-400" : "bg-blue-100 text-blue-600"}`}>
                        You
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${textSecondary}`}>{dayjs(comment.createdAt).fromNow()}</p>
                </div>
              </div>

              {/* Comment Content */}
              <p className={`${textPrimary} mb-4 whitespace-pre-wrap leading-relaxed`}>{comment.content}</p>

              {/* Reply Button */}
              {session && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className={`mb-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isDark
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  }`}
                >
                  <FaReply className="inline mr-1" /> Reply
                </button>
              )}

              {/* Reply Form */}
              {replyingTo === comment.id && session && (
                <div className="mb-4 ml-12">
                  <div className="flex gap-3 mb-3">
                    {session.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        width={32}
                        height={32}
                        className="rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${isDark ? "bg-gray-700" : "bg-gray-200"} ${textPrimary}`}>
                        {(session.user?.name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <textarea
                        value={replyContent[comment.id] || ""}
                        onChange={(e) =>
                          setReplyContent((prev) => ({ ...prev, [comment.id]: e.target.value }))
                        }
                        placeholder="Write your reply..."
                        rows={3}
                        className={`w-full rounded-lg border px-3 py-2 text-sm ${borderColor} ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none`}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent((prev) => ({ ...prev, [comment.id]: "" }));
                      }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        isDark
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                          : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={submitting || !replyContent[comment.id]?.trim()}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-all cursor-pointer ${
                        submitting || !replyContent[comment.id]?.trim()
                          ? "bg-gray-500 cursor-not-allowed"
                          : isDark
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-blue-500 hover:bg-blue-600"
                      }`}
                    >
                      {submitting ? (
                        <>
                          <FaSpinner className="inline mr-1 animate-spin" /> Posting...
                        </>
                      ) : (
                        <>
                          <FaPaperPlane className="inline mr-1" /> Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="mt-4 ml-12 space-y-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className={`border-l-2 ${isDark ? "border-gray-600" : "border-gray-300"} pl-4 py-3 ${isDark ? "bg-gray-800/50" : "bg-white"} rounded-r-lg`}>
                      <div className="flex items-center gap-2 mb-2">
                        {reply.user.image ? (
                          <Image
                            src={reply.user.image}
                            alt={reply.user.name}
                            width={32}
                            height={32}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${isDark ? "bg-gray-700" : "bg-gray-200"} ${textPrimary}`}>
                            {reply.user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm ${textPrimary}`}>{reply.user.name}</p>
                            {reply.isAdminReply && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? "bg-purple-900/30 text-purple-400" : "bg-purple-100 text-purple-600"}`}>
                                Admin
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${textSecondary}`}>{dayjs(reply.createdAt).fromNow()}</p>
                        </div>
                      </div>
                      <p className={`text-sm ${textPrimary} whitespace-pre-wrap leading-relaxed`}>{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={`mt-8 pt-6 border-t ${borderColor} flex items-center justify-center gap-2`}>
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
  );
}


