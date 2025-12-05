"use client";

import { useState, useEffect, Fragment } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import TextEditor from "@/admin-components/TextEditor";
import { slugify } from "@/utils/slugify";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { useThemeContext } from "@/context/ThemeContext";

interface Category {
  id: number;
  name: string;
}

export default function CreateBlog() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSlugChecking, setIsSlugChecking] = useState(false);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const router = useRouter();

  // Fetch categories
  useEffect(() => {
    axios
      .get("/api/blogs/categories")
      .then((res) => setCategories(res.data))
      .catch(() => toast.error("Failed to fetch categories"));
  }, []);

  // Auto slugify
  useEffect(() => {
    if (!isSlugManuallyEdited) {
      setSlug(title ? slugify(title) : "");
    }
  }, [title, isSlugManuallyEdited]);

  // Slug check
  useEffect(() => {
    if (!slug) {
      setSlugError(null);
      return;
    }
    setIsSlugChecking(true);
    const handler = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/blogs/check-slug?slug=${slug}`);
        setSlugError(res.data.isUnique ? null : "This slug is already taken.");
      } catch {
        setSlugError("Error checking slug.");
      } finally {
        setIsSlugChecking(false);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [slug]);

  // Handle keywords
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = inputValue.trim();
      if (value && !metaKeywords.includes(value)) {
        setMetaKeywords((prev) => [...prev, value]);
      }
      setInputValue("");
    }
  };

  const handleDeleteKeyword = (chip: string) => {
    setMetaKeywords((prev) => prev.filter((k) => k !== chip));
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !slug || isSlugChecking || slugError) {
      toast.error("Please fix errors before submitting.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("slug", slug);
      formData.append("metaTitle", metaTitle);
      formData.append("metaDescription", metaDescription);
      formData.append("metaKeywords", metaKeywords.join(","));
      formData.append("content", content);
      formData.append("categoryIds", selectedCategories.join(","));
      formData.append("imageAlt", imageAlt);
      if (image) formData.append("image", image);

      const res = await axios.post("/api/blogs", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        toast.success("Blog created successfully!");
        router.push("/admin/blogs/list");
      } else {
        toast.error(res.data.message || "Failed to create blog");
      }
    } catch {
      toast.error("Failed to create blog.");
    }
  };

  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const textPrimary = isDark ? "text-gray-100" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-300" : "text-gray-700";
  const borderColor = isDark ? "border-gray-700" : "border-gray-300";
  const inputBg = isDark ? "bg-gray-700" : "bg-white";
  const inputText = isDark ? "text-gray-100 placeholder-gray-400" : "text-gray-900 placeholder-gray-500";

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}>
      <form
        onSubmit={handleSubmit}
        className={`max-w-4xl mx-auto ${cardBg} shadow-xl rounded-2xl p-8 flex flex-col gap-6 ${borderColor} border`}
      >
        <div className="border-b pb-4 border-gray-700">
          <h2 className={`text-3xl font-bold ${textPrimary}`}>
            Create Blog
          </h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            Fill in the details below to create a new blog post
          </p>
        </div>

      {/* Title */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={`w-full rounded-lg ${borderColor} border px-4 py-3 ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter blog title"
          required
        />
      </div>

      {/* Slug */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className={`w-full rounded-lg border px-4 py-3 ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
            slugError
              ? "border-red-500 focus:ring-red-500"
              : borderColor
          }`}
          value={slug}
          onChange={(e) => {
            setIsSlugManuallyEdited(true);
            setSlug(slugify(e.target.value));
          }}
          placeholder="blog-post-url-slug"
          required
        />
        <p className={`text-xs mt-2 ${isSlugChecking ? "text-blue-500" : slugError ? "text-red-500" : textSecondary}`}>
          {isSlugChecking
            ? "Checking slug availability..."
            : slugError
            ? slugError
            : "Unique part of the URL (auto-generated from title)"}
        </p>
      </div>

      {/* Meta Title */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Meta Title
        </label>
        <input
          type="text"
          className={`w-full rounded-lg ${borderColor} border px-4 py-3 ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
          value={metaTitle}
          onChange={(e) => setMetaTitle(e.target.value)}
          placeholder="SEO meta title (optional)"
        />
      </div>

      {/* Meta Keywords */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Meta Keywords
        </label>
        <input
          type="text"
          className={`w-full rounded-lg ${borderColor} border px-4 py-3 ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
          placeholder="Type keyword and press Enter"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <p className={`text-xs mt-1 ${textSecondary}`}>
          Press Enter or comma to add keywords
        </p>
        {metaKeywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {metaKeywords.map((keyword, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                  isDark 
                    ? "bg-blue-900 text-blue-200 border border-blue-700" 
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                }`}
              >
                {keyword}
                <button 
                  type="button" 
                  onClick={() => handleDeleteKeyword(keyword)}
                  className={`hover:opacity-70 transition-opacity ${isDark ? "text-blue-300" : "text-blue-600"}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Meta Description */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Meta Description
        </label>
        <textarea
          className={`w-full rounded-lg ${borderColor} border px-4 py-3 ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none`}
          rows={4}
          value={metaDescription}
          onChange={(e) => setMetaDescription(e.target.value)}
          placeholder="Brief description for SEO (optional)"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Featured Image
        </label>
        <div className={`border-2 border-dashed ${borderColor} rounded-lg p-6 text-center transition-colors hover:border-blue-500`}>
          <input
            type="file"
            accept="image/*"
            id="image-upload"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setImage(file);
                setImagePreview(URL.createObjectURL(file));
              }
            }}
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
                  className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors`}
                >
                  ✕
                </button>
              </div>
              <label
                htmlFor="image-upload"
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
                htmlFor="image-upload"
                className={`inline-block px-6 py-3 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                  isDark 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
              >
                Choose File
              </label>
              <p className={`text-xs mt-2 ${textSecondary}`}>
                No file chosen
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Image Alt Text */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Image Alt Text
        </label>
        <input
          type="text"
          className={`w-full rounded-lg ${borderColor} border px-4 py-3 ${inputBg} ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
          placeholder="Describe the image for accessibility"
          value={imageAlt}
          onChange={(e) => setImageAlt(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Categories
        </label>
        <Listbox value={selectedCategories} onChange={setSelectedCategories} multiple>
          <div className="relative">
            <Listbox.Button className={`relative w-full cursor-default rounded-lg ${borderColor} border ${inputBg} py-3 pl-4 pr-10 text-left shadow-sm ${inputText} focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}>
              <span className="block truncate">
                {selectedCategories.length > 0
                  ? `${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'} selected`
                  : "Select categories"}
              </span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <ChevronUpDownIcon className={`h-5 w-5 ${textSecondary}`} />
              </span>
            </Listbox.Button>
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className={`absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-lg ${cardBg} py-2 shadow-xl ring-1 ring-black/5 focus:outline-none border ${borderColor}`}>
                {categories.map((cat) => (
                  <Listbox.Option key={cat.id} value={cat.id} as={Fragment}>
                    {({ active }) => (
                      <li
                        onClick={() =>
                          setSelectedCategories((prev) =>
                            prev.includes(cat.id)
                              ? prev.filter((id) => id !== cat.id)
                              : [...prev, cat.id]
                          )
                        }
                        className={`relative cursor-pointer select-none py-2.5 pl-10 pr-4 ${
                          active
                            ? isDark
                              ? "bg-gray-700"
                              : "bg-gray-100"
                            : ""
                        } ${textPrimary}`}
                      >
                        <span
                          className={`block truncate ${
                            selectedCategories.includes(cat.id)
                              ? "font-semibold"
                              : "font-normal"
                          }`}
                        >
                          {cat.name}
                        </span>
                        {selectedCategories.includes(cat.id) && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-500">
                            <CheckIcon className="h-5 w-5" />
                          </span>
                        )}
                      </li>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </div>

      {/* Content */}
      <div>
        <label className={`block text-sm font-semibold mb-2 ${textPrimary}`}>
          Content <span className="text-red-500">*</span>
        </label>
        <TextEditor value={content} onChange={setContent} />
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4 border-t border-gray-700">
        <button
          type="button"
          onClick={() => router.back()}
          className={`flex-1 py-3 rounded-lg font-semibold transition-colors cursor-pointer ${
            isDark
              ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
              : "bg-gray-200 hover:bg-gray-300 text-gray-700"
          }`}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title || !content || !slug || isSlugChecking || slugError !== null}
          className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${
            !title || !content || !slug || isSlugChecking || slugError !== null
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl cursor-pointer"
          }`}
        >
          {isSlugChecking ? "Checking..." : "Create Blog"}
        </button>
      </div>
    </form>
    </div>
  );
}
