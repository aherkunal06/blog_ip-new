"use client";
import { useState, useEffect } from "react";
import { FaCheck, FaTimes, FaSpinner, FaPlus } from "react-icons/fa";
import { useThemeContext } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminUser {
  id: string;
  username: string;
  status: string;
  isSuper: boolean;
  role: string;
}

export default function AdminUserManagement() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<{
    id: string;
    loading: boolean;
  } | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const response = await fetch("/api/admin/get-admins");
      if (!response.ok) {
        throw new Error("Failed to fetch admin users");
      }
      const data = await response.json();
      setAdmins(data.admins);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    setUpdateStatus({ id, loading: true });
    
    try {
      const response = await fetch("/api/admin/update-admin-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update admin status");
      }
      
      // Update local state
      setAdmins(admins.map(admin => 
        admin.id === id ? { ...admin, status: newStatus } : admin
      ));
    } catch (error) {
      console.error("Error updating admin status:", error);
    } finally {
      setUpdateStatus(null);
    }
  };

  return (
    <div className={`min-h-screen p-6 md:p-8 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className={`text-3xl lg:text-4xl font-bold mb-2 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Admin User Management
          </h1>
          <p className={`text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Manage admin users, roles, and permissions
          </p>
        </div>

        <div className="mt-4 lg:mt-0">
          <Link
            href="/admin/add-admin"
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:scale-105"
          >
            <FaPlus />
            Add User
          </Link>
        </div>
      </div>

      {loading ? (
        <div className={`flex justify-center items-center h-64 rounded-2xl ${
          isDark ? 'bg-gray-800' : 'bg-white'
        }`}>
          <FaSpinner className="animate-spin text-3xl text-blue-500" />
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden shadow-xl ${
          isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${
                isDark ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <tr>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Username
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Role
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Super Admin
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-4 text-left text-sm font-semibold ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className={`text-lg font-medium ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        No admin users found
                      </p>
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr
                      key={admin.id}
                      className={`border-t transition-colors duration-200 ${
                        isDark
                          ? 'border-gray-700 hover:bg-gray-800/30'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <td className={`px-6 py-4 ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {admin.username}
                      </td>
                      <td className={`px-6 py-4 ${
                        isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {admin.role || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {admin.isSuper ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isDark
                              ? 'bg-green-900/50 text-green-300'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            Yes
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isDark
                              ? 'bg-gray-700 text-gray-400'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            admin.status === "approved" || admin.status === "active"
                              ? isDark
                                ? 'bg-green-900/50 text-green-300'
                                : 'bg-green-100 text-green-800'
                              : isDark
                                ? 'bg-red-900/50 text-red-300'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {admin.status === "approved" ? "Approved" : admin.status === "active" ? "Active" : admin.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleAdminStatus(admin.id, admin.status)}
                          disabled={updateStatus?.id === admin.id || admin.isSuper}
                          className={`p-2 rounded-full transition-all duration-300 ${
                            admin.status === "approved" || admin.status === "active"
                              ? isDark
                                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                              : isDark
                                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                          } ${
                            admin.isSuper ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          title={admin.isSuper ? "Cannot modify super admin status" : ""}
                        >
                          {updateStatus?.id === admin.id ? (
                            <FaSpinner className="animate-spin" />
                          ) : admin.status === "approved" || admin.status === "active" ? (
                            <FaTimes />
                          ) : (
                            <FaCheck />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}