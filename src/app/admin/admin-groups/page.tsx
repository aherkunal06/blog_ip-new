"use client";
import { useState, useEffect } from "react";
import { useThemeContext } from "@/context/ThemeContext";
import { FaPlus, FaEdit, FaTrash, FaSave, FaTimes, FaCheck, FaLock } from "react-icons/fa";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AdminGroup {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
}

interface Permission {
  id?: number;
  route: string;
  method: string;
  allowed: boolean;
}

export default function AdminGroupsPage() {
  const { theme } = useThemeContext();
  const { data: session } = useSession();
  const router = useRouter();
  const isDark = theme === "dark";
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<AdminGroup | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  // Check if user is super-admin, redirect if not
  useEffect(() => {
    if (session && session.user?.role !== 'super-admin') {
      router.push('/admin');
      toast.error('Only super admins can access this page');
    }
  }, [session, router]);

  // Common routes for permissions
  const commonRoutes = [
    { route: "/admin", method: "GET" },
    { route: "/admin/blogs/list", method: "GET" },
    { route: "/admin/blogs/create", method: "GET" },
    { route: "/admin/blogs/edit", method: "GET" },
    { route: "/admin/blogs/categories", method: "GET" },
    { route: "/admin/blogs/media", method: "GET" },
    { route: "/admin/information/about", method: "GET" },
    { route: "/admin/information/privacy_policies", method: "GET" },
    { route: "/admin/information/terms", method: "GET" },
    { route: "/api/admin/blogs", method: "GET" },
    { route: "/api/admin/blogs", method: "POST" },
    { route: "/api/admin/blogs", method: "PATCH" },
    { route: "/api/admin/blogs", method: "DELETE" },
    { route: "/api/admin/categories", method: "GET" },
    { route: "/api/admin/categories", method: "POST" },
    { route: "/api/admin/categories", method: "PATCH" },
    { route: "/api/admin/categories", method: "DELETE" },
    { route: "/api/blogs", method: "GET" },
    { route: "/api/blogs", method: "POST" },
    { route: "/api/blogs/categories", method: "GET" },
    { route: "/api/blogs/categories", method: "POST" },
    { route: "/api/blogs/categories", method: "PUT" },
    { route: "/api/blogs/categories", method: "DELETE" },
    { route: "/api/blogs/media", method: "GET" },
    { route: "/api/blogs/media", method: "PATCH" },
    { route: "/api/information", method: "GET" },
    { route: "/api/information", method: "POST" },
    { route: "/api/information", method: "PUT" },
    { route: "/api/information", method: "DELETE" },
  ];

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchPermissions(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const res = await axios.get("/api/admin/groups");
      setGroups(res.data.groups || []);
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      if (error.response?.status === 403) {
        toast.error("You don't have permission to access this page");
        router.push('/admin');
      } else {
        toast.error("Failed to fetch groups");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async (groupId: number) => {
    try {
      const res = await axios.get(`/api/admin/groups/permissions?groupId=${groupId}`);
      const existingPerms = res.data.permissions || [];
      
      // Merge with common routes
      const mergedPerms = commonRoutes.map(route => {
        const existing = existingPerms.find(
          (p: Permission) => p.route === route.route && p.method === route.method
        );
        return existing || { ...route, allowed: false };
      });

      setPermissions(mergedPerms);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Failed to fetch permissions");
    }
  };

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      const res = await axios.post("/api/admin/groups", formData);
      toast.success("Group created successfully");
      setShowAddModal(false);
      setFormData({ name: "", description: "" });
      fetchGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create group");
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !formData.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      await axios.put("/api/admin/groups", {
        id: editingGroup.id,
        ...formData,
      });
      toast.success("Group updated successfully");
      setShowEditModal(false);
      setEditingGroup(null);
      setFormData({ name: "", description: "" });
      fetchGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update group");
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      await axios.delete(`/api/admin/groups?id=${groupId}`);
      toast.success("Group deleted successfully");
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setPermissions([]);
      }
      fetchGroups();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete group");
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedGroup) return;

    try {
      await axios.post("/api/admin/groups/permissions", {
        groupId: selectedGroup.id,
        permissions: permissions.filter(p => p.route && p.method),
      });
      toast.success("Permissions saved successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save permissions");
    }
  };

  const togglePermission = (index: number) => {
    setPermissions(prev =>
      prev.map((p, i) => (i === index ? { ...p, allowed: !p.allowed } : p))
    );
  };

  const openEditModal = (group: AdminGroup) => {
    setEditingGroup(group);
    setFormData({ name: group.name, description: group.description || "" });
    setShowEditModal(true);
  };

  // Don't render if not super-admin
  if (session && session.user?.role !== 'super-admin') {
    return null;
  }

  return (
    <div className={`min-h-screen p-6 md:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className={`text-3xl lg:text-4xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Admin Groups Management
          </h1>
          <p className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Create and manage admin groups with route permissions
          </p>
        </div>

        <div className="mt-4 lg:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:scale-105"
          >
            <FaPlus />
            Create Group
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className={`lg:col-span-1 rounded-2xl border overflow-hidden shadow-xl ${
          isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
        }`}>
          <div className={`p-4 border-b ${
            isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
          }`}>
            <h2 className={`font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Groups
            </h2>
          </div>
          <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : groups.length === 0 ? (
              <p className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                No groups found
              </p>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedGroup?.id === group.id
                      ? isDark
                        ? 'bg-blue-900/30 border border-blue-700'
                        : 'bg-blue-50 border border-blue-200'
                      : isDark
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>
                          {group.name}
                        </h3>
                        {group.isSystem && (
                          <FaLock className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        )}
                      </div>
                      {group.description && (
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {group.description}
                        </p>
                      )}
                    </div>
                    {!group.isSystem && (
                      <div className="flex gap-2 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(group);
                          }}
                          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
                            isDark ? 'text-blue-400' : 'text-blue-600'
                          }`}
                        >
                          <FaEdit className="text-sm" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                          className={`p-1.5 rounded hover:bg-gray-700 transition-colors ${
                            isDark ? 'text-red-400' : 'text-red-600'
                          }`}
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Permissions Panel */}
        <div className={`lg:col-span-2 rounded-2xl border overflow-hidden shadow-xl ${
          isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
        }`}>
          {selectedGroup ? (
            <>
              <div className={`p-4 border-b ${
                isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className={`font-semibold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      Permissions: {selectedGroup.name}
                    </h2>
                    {selectedGroup.description && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedGroup.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleSavePermissions}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <FaSave />
                    Save Permissions
                  </button>
                </div>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                <div className="space-y-2">
                  {permissions.map((perm, index) => (
                    <div
                      key={`${perm.route}-${perm.method}-${index}`}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isDark
                          ? 'border-gray-700 hover:bg-gray-700/30'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded font-mono ${
                            isDark
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {perm.method}
                          </span>
                          <span className={`font-medium ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {perm.route}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => togglePermission(index)}
                        className={`w-12 h-6 rounded-full transition-colors flex items-center ${
                          perm.allowed
                            ? 'bg-green-500'
                            : isDark
                              ? 'bg-gray-700'
                              : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full bg-white transition-transform ${
                            perm.allowed ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Select a group to manage permissions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Group Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Create New Group
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    isDark
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    isDark
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  rows={3}
                  placeholder="Enter group description"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: "", description: "" });
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditModal && editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Edit Group
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    isDark
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter group name"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-lg border ${
                    isDark
                      ? 'bg-gray-900 border-gray-600 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  rows={3}
                  placeholder="Enter group description"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingGroup(null);
                  setFormData({ name: "", description: "" });
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  isDark
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all"
              >
                Update Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

