"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { slugify } from "@/utils/slugify";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";

export default function CreateCategory() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSlugChecking, setIsSlugChecking] = useState(false);
  const [ipshopyConflict, setIpshopyConflict] = useState<string | null>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isHelpCategory, setIsHelpCategory] = useState(false);

  // Auto-generate slug
  useEffect(() => {
    if (!isSlugManuallyEdited) setSlug(name ? slugify(name) : "");
  }, [name, isSlugManuallyEdited]);

  // Check slug uniqueness and ipshopy conflicts
  useEffect(() => {
    if (!slug && !name) {
      setSlugError(null);
      setIpshopyConflict(null);
      setIsSlugChecking(false);
      setIsCheckingConflict(false);
      return;
    }

    // Check slug uniqueness
    if (slug) {
      setIsSlugChecking(true);
      const slugHandler = setTimeout(async () => {
        try {
          const res = await axios.get(`/api/blogs/check-slug?slug=${slug}`);
          const { isUnique, error } = res.data;
          if (error) setSlugError("Could not validate slug. Please try again.");
          else if (!isUnique) setSlugError("This slug is already taken.");
          else setSlugError(null);
        } catch {
          setSlugError("Error checking slug.");
        } finally {
          setIsSlugChecking(false);
        }
      }, 500);

      // Check ipshopy conflicts
      setIsCheckingConflict(true);
      const conflictHandler = setTimeout(async () => {
        try {
          const res = await axios.get(
            `/api/blogs/categories/check-ipshopy-conflict?name=${encodeURIComponent(name || "")}&slug=${encodeURIComponent(slug)}`
          );
          if (res.data.hasConflict) {
            setIpshopyConflict(res.data.conflicts[0] || "Conflict with ipshopy.com");
          } else {
            setIpshopyConflict(null);
          }
        } catch {
          setIpshopyConflict(null); // Don't block on error
        } finally {
          setIsCheckingConflict(false);
        }
      }, 500);

      return () => {
        clearTimeout(slugHandler);
        clearTimeout(conflictHandler);
      };
    }
  }, [slug, name]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setTags(tags.filter((tag) => tag !== tagToDelete));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug || slugError || isSlugChecking || ipshopyConflict || isCheckingConflict) {
      toast.error("Please fix errors before submitting.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("slug", slug);
    formData.append("description", description);
    formData.append("tags", JSON.stringify(tags));
    formData.append("isHelpCategory", String(isHelpCategory));
    if (image) formData.append("image", image);

    try {
      const res = await fetch("/api/blogs/categories", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Category created successfully!");
        setName("");
        setSlug("");
        setIsSlugManuallyEdited(false);
        setDescription("");
        setTags([]);
        setTagInput("");
        setImage(null);
        setImagePreview(null);
      } else {
        toast.error(result.message || "Failed to create category");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong!");
    }
  };

  const isSubmitDisabled = !name || !slug || !!slugError || isSlugChecking || !!ipshopyConflict || isCheckingConflict;

  return (
    <form
      onSubmit={handleSubmit}
      className={`max-w-md mx-auto p-6 flex flex-col gap-4 rounded-lg ${
        isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"
      }`}
    >
      <h2 className="text-xl font-bold">Create Category</h2>

      {/* Name */}
      <div className="flex flex-col">
        <label className="mb-1 font-medium">Category Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={`border rounded px-3 py-2 ${
            isDark ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-300"
          }`}
        />
      </div>

      {/* Slug */}
      <div className="flex flex-col">
        <label className="mb-1 font-medium">Category Slug</label>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setIsSlugManuallyEdited(true);
            setSlug(slugify(e.target.value));
          }}
          required
          className={`border rounded px-3 py-2 ${
            isDark ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-300"
          } ${slugError || ipshopyConflict ? "border-red-500" : ""}`}
        />
        <span className={`text-sm mt-1 ${
          slugError || ipshopyConflict ? "text-red-500" : isDark ? "text-gray-400" : "text-gray-600"
        }`}>
          {isSlugChecking || isCheckingConflict
            ? "Checking..."
            : slugError
            ? slugError
            : ipshopyConflict
            ? ipshopyConflict
            : "Unique slug for the category (used in URL)"}
        </span>
      </div>

      {/* Description */}
      <div className="flex flex-col">
        <label className="mb-1 font-medium">Category Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className={`border rounded px-3 py-2 resize-none ${
            isDark ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-300"
          }`}
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col">
        <label className="mb-1 font-medium">Tags</label>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Press Enter or comma to add tag"
          className={`border rounded px-3 py-2 mb-2 ${
            isDark ? "bg-gray-800 border-gray-700 text-gray-100" : "bg-white border-gray-300"
          }`}
        />
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded bg-blue-600 text-white cursor-pointer"
              onClick={() => handleDeleteTag(tag)}
            >
              {tag} &times;
            </span>
          ))}
        </div>
      </div>

      {/* Image */}
      <div className="flex flex-col">
        <label className={`mb-2 text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>
          Category Image
        </label>
        <div className={`border-2 border-dashed ${isDark ? "border-gray-700" : "border-gray-300"} rounded-lg p-6 text-center transition-colors hover:border-blue-500`}>
          <input
            type="file"
            accept="image/*"
            id="category-image-upload"
            className="hidden"
            onChange={handleImageChange}
          />
          {imagePreview ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={200}
                  height={200}
                  className="rounded-lg object-cover border-2 border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <label
                htmlFor="category-image-upload"
                className={`inline-block px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                  isDark 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Change Image
              </label>
            </div>
          ) : (
            <div>
              <label
                htmlFor="category-image-upload"
                className={`inline-block px-6 py-3 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                  isDark 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Choose File
              </label>
              <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                No file chosen
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Help Category Toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isHelpCategory"
          checked={isHelpCategory}
          onChange={(e) => setIsHelpCategory(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor="isHelpCategory"
          className={`text-sm font-medium cursor-pointer ${
            isDark ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Show in Help & Support Section (Section 4 on Homepage)
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitDisabled}
        className={`px-4 py-2 rounded transition-colors ${
          isSubmitDisabled
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        }`}
      >
        Create Category
      </button>
    </form>
  );
}
