"use client";

import { useState, useEffect, FormEvent } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import TextEditor from "@/admin-components/TextEditor";
import { toast } from "react-hot-toast";
import { useThemeContext } from "@/context/ThemeContext";

export type InfoStatus = "PENDING" | "APPROVED" | "DISAPPROVED";

export interface InfoEntry {
  id: number;
  content: string;
  status: InfoStatus;
  createdAt: string;
  updatedAt: string;
}

interface InfoAdminProps {
  type: "ABOUT" | "PRIVACY_POLICIES" | "TERMS";
  title: string;
}

export default function InfoAdmin({ type, title }: InfoAdminProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  const [entries, setEntries] = useState<InfoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<InfoStatus>("PENDING");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Load entries
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/information?type=${type}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Load failed: ${res.status}`);
        const data = await res.json();
        if (alive) setEntries(Array.isArray(data) ? data : []);
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : `Failed to load ${title}`
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [type, title]);

  const addEntry = async (newContent: string) => {
    try {
      const res = await fetch("/api/information/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent, type, status: "APPROVED" }),
      });
      if (!res.ok) throw new Error(`Failed to add ${title}`);
      const newEntry = await res.json();

      // Set existing APPROVED entries to PENDING
      const updated = entries.map((e) => ({ ...e, status: "PENDING" }));
      setEntries([newEntry, ...updated]);

      for (const e of entries) {
        if (e.status === "APPROVED") {
          await updateEntry(e.id, e.content, "PENDING");
        }
      }

      toast.success(`${title} saved and approved`);
      setContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Error saving ${title}`);
    }
  };

  const updateEntry = async (
    id: number,
    newContent: string,
    newStatus?: InfoStatus
  ) => {
    try {
      const body: Partial<Pick<InfoEntry, "content" | "status">> = {
        content: newContent,
      };
      if (newStatus) body.status = newStatus;

      const res = await fetch(`/api/information/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed to update ${title}`);
      const updated = await res.json();
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Update failed for ${title}`
      );
    }
  };

  const deleteEntry = async (id: number) => {
    try {
      const res = await fetch(`/api/information/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete ${title}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success(`${title} deleted`);
      setDeleteId(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Delete failed for ${title}`
      );
      setDeleteId(null);
    }
  };

  const handleToggleStatus = async (id: number) => {
    const clicked = entries.find((e) => e.id === id);
    if (!clicked || clicked.status === "DISAPPROVED") return;
    const newStatus = clicked.status === "APPROVED" ? "PENDING" : "APPROVED";

    await updateEntry(id, clicked.content, newStatus);

    if (newStatus === "APPROVED") {
      for (const e of entries) {
        if (e.id !== id && e.status === "APPROVED") {
          await updateEntry(e.id, e.content, "PENDING");
        }
      }
    }

    setEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) return { ...e, status: newStatus };
        if (newStatus === "APPROVED") return { ...e, status: "PENDING" };
        return e;
      })
    );
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return toast.error("Content is required");
    addEntry(content.trim());
  };

  const handleEditSave = () => {
    if (!editContent.trim() || editId === null) return;
    updateEntry(editId, editContent, editStatus);
    setEditId(null);
  };

  const bgClass = isDark
    ? "bg-gray-900 text-gray-100"
    : "bg-white text-gray-900";
  const cardClass = isDark
    ? "bg-gray-800 text-gray-100"
    : "bg-white text-gray-900";

  return (
    <div className={`max-w-5xl mx-auto p-6 ${bgClass} min-h-screen`}>
      <h1 className="text-3xl font-bold mb-6">{title} Management</h1>

      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-4 border-t-4 border-gray-500 rounded-full animate-spin"></div>
          <span>Loading…</span>
        </div>
      ) : (
        <>
          {/* Existing Entries */}
          {entries.length > 0 && (
            <div className={`p-4 mb-6 rounded-lg shadow ${cardClass}`}>
              <h2 className="text-xl font-semibold mb-4">Existing {title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="font-bold border-b px-3 py-2">Content</th>
                      <th className="font-bold border-b px-3 py-2">
                        Created At
                      </th>
                      <th className="font-bold border-b px-3 py-2">
                        Last Updated
                      </th>
                      <th className="font-bold border-b px-3 py-2">Actions</th>
                      <th className="font-bold border-b px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr
                        key={e.id}
                        className={`${
                          isDark
                            ? "hover:bg-gray-700 bg-gray-800 text-gray-100"
                            : "bg-white hover:bg-gray-100 text-gray-900"
                        }`}
                      >
                        <td className="px-3 py-2 max-w-xs truncate">
                          <div
                            dangerouslySetInnerHTML={{ __html: e.content }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          {new Date(e.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          {e.updatedAt !== e.createdAt
                            ? new Date(e.updatedAt).toLocaleString()
                            : "—"}
                        </td>
                        <td className="px-3 py-2 flex gap-2">
                          {/* Edit button */}
                          <button
                            className={`p-1 rounded group ${
                              isDark ? "bg-gray-700" : "bg-white"
                            } hover:bg-blue-500`}
                            onClick={() => {
                              setEditId(e.id);
                              setEditContent(e.content);
                              setEditStatus(e.status);
                            }}
                          >
                            <FaEdit
                              className={`${
                                isDark ? "text-white" : "text-blue-500"
                              } group-hover:text-white`}
                            />
                          </button>

                          {/* Delete button */}
                          <button
                            className={`p-1 rounded group ${
                              isDark ? "bg-gray-700" : "bg-white"
                            } hover:bg-red-500`}
                            onClick={() => setDeleteId(e.id)}
                          >
                            <FaTrash
                              className={`${
                                isDark ? "text-white" : "text-red-500"
                              } group-hover:text-white`}
                            />
                          </button>
                        </td>

                        <td className="px-3 py-2">
                          <button
                            className={`px-3 py-1 rounded font-semibold text-white ${
                              e.status === "APPROVED"
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-yellow-500 hover:bg-yellow-600"
                            }`}
                            onClick={() => handleToggleStatus(e.id)}
                          >
                            {e.status}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add New Entry */}
          <div className={`p-4 rounded-lg shadow ${cardClass}`}>
            <h2 className="text-xl font-semibold mb-4">Add New {title}</h2>
            <TextEditor
              name={`add-${type}`}
              value={content}
              onChange={setContent}
              label={`${title} Content`}
            />
            <div className="mt-4 text-right">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={handleAddSubmit}
              >
                Create {title}
              </button>
            </div>
          </div>

          {/* Edit Dialog */}
          {editId !== null && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div
                className={`bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-xl`}
              >
                <h3 className="text-xl font-semibold mb-4">Edit {title}</h3>
                <TextEditor
                  name={`edit-${type}`}
                  value={editContent}
                  onChange={setEditContent}
                  label={`${title} Content`}
                />
                <div className="mt-2">
                  <button
                    className={`px-3 py-1 rounded font-semibold text-white ${
                      editStatus === "APPROVED"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-yellow-500 hover:bg-yellow-600"
                    }`}
                    onClick={() =>
                      setEditStatus(
                        editStatus === "APPROVED" ? "PENDING" : "APPROVED"
                      )
                    }
                  >
                    {editStatus}
                  </button>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setEditId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={handleEditSave}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Dialog */}
          {deleteId !== null && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div
                className={`bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md`}
              >
                <h3 className="text-xl font-semibold mb-4">Delete {title}</h3>
                <p>Are you sure you want to delete this {title}?</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="px-4 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-700"
                    onClick={() => setDeleteId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={() => {
                      if (deleteId) deleteEntry(deleteId);
                      setDeleteId(null);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

