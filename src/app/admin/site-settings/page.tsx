"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";

interface SiteSetting {
  id: number;
  key_name: string;
  value: string;
  type: string;
  description: string | null;
}

export default function SiteSettingsPage() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  const [settings, setSettings] = useState<SiteSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/admin/site-settings");
      if (res.data.success) {
        setSettings(res.data.settings || []);
        const initialValues: Record<string, string> = {};
        (res.data.settings || []).forEach((setting: SiteSetting) => {
          initialValues[setting.key_name] = setting.value || "";
        });
        setEditedValues(initialValues);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load site settings");
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await axios.put("/api/admin/site-settings", { settings: editedValues });
      if (res.data.success) {
        toast.success("Site settings saved successfully!");
        fetchSettings();
      } else {
        toast.error(res.data.message || "Failed to save settings");
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.response?.data?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultValues: Record<string, string> = {};
    settings.forEach((setting) => {
      defaultValues[setting.key_name] = setting.value || "";
    });
    setEditedValues(defaultValues);
    toast.success("Settings reset to saved values");
  };

  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const textPrimary = isDark ? "text-gray-100" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-300" : "text-gray-700";
  const borderColor = isDark ? "border-gray-700" : "border-gray-300";
  const inputBg = isDark ? "bg-gray-700" : "bg-white";
  const inputText = isDark ? "text-gray-100" : "text-gray-900";

  // Group settings by category
  const colorSettings = settings.filter((s) => s.type === "color");
  const otherSettings = settings.filter((s) => s.type !== "color");

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-64 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className={`ml-3 ${textPrimary}`}>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}>
      <div className={`max-w-6xl mx-auto ${cardBg} shadow-xl rounded-2xl p-8 border ${borderColor}`}>
        {/* Header */}
        <div className="border-b pb-6 mb-8 border-gray-700">
          <h1 className={`text-3xl font-bold mb-2 ${textPrimary}`}>Site Settings</h1>
          <p className={`text-sm ${textSecondary}`}>
            Manage your site colors, themes, and appearance settings
          </p>
        </div>

        {/* Color Settings */}
        {colorSettings.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${textPrimary}`}>Color Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {colorSettings.map((setting) => (
                <div key={setting.id}>
                  <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                    {setting.key_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </label>
                  {setting.description && (
                    <p className={`text-xs mb-2 ${textSecondary}`}>{setting.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editedValues[setting.key_name] || "#000000"}
                      onChange={(e) => handleValueChange(setting.key_name, e.target.value)}
                      className="w-16 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editedValues[setting.key_name] || ""}
                      onChange={(e) => handleValueChange(setting.key_name, e.target.value)}
                      className={`flex-1 rounded-lg border px-4 py-2 ${borderColor} ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                      placeholder={setting.value || "Enter color value"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Settings */}
        {otherSettings.length > 0 && (
          <div className="mb-8">
            <h2 className={`text-xl font-semibold mb-4 ${textPrimary}`}>General Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherSettings.map((setting) => (
                <div key={setting.id}>
                  <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
                    {setting.key_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </label>
                  {setting.description && (
                    <p className={`text-xs mb-2 ${textSecondary}`}>{setting.description}</p>
                  )}
                  {setting.key_name === "default_theme" ? (
                    <select
                      value={editedValues[setting.key_name] || "light"}
                      onChange={(e) => handleValueChange(setting.key_name, e.target.value)}
                      className={`w-full rounded-lg border px-4 py-2 ${borderColor} ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer`}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editedValues[setting.key_name] || ""}
                      onChange={(e) => handleValueChange(setting.key_name, e.target.value)}
                      className={`w-full rounded-lg border px-4 py-2 ${borderColor} ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
                      placeholder={setting.value || "Enter value"}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-700">
          <button
            onClick={handleReset}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors cursor-pointer ${
              isDark
                ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all cursor-pointer ${
              saving
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl"
            }`}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

