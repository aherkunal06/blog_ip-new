// src/admin-components/BlogForm.tsx
"use client";
import { useState, useEffect, Fragment } from "react";
import axios from "axios";
import TextEditor from "@/admin-components/TextEditor";
import { toast } from "react-hot-toast";
import { slugify } from "@/utils/slugify";
import { useRouter } from "next/navigation";
import { useThemeContext } from "@/context/ThemeContext";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import Image from "next/image";

interface Category {
  id: number;
  name: string;
}

interface BlogDetails {
  id: number;
  title: string;
  slug: string;
  content: string;
  image: string | null;
  imageAlt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  authorId: number;
  author: { id: number; username: string; name?: string };
  categories?: Array<{ category: Category }>;
  createdAt: string;
  updatedAt: string;
}

interface BlogFormProps {
  blogId?: number;
}

export default function BlogForm({ blogId }: BlogFormProps) {
  const router = useRouter();
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Slug-related state
  const [isSlugChecking, setIsSlugChecking] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const isEditMode = typeof blogId === "number";

  // Fetch categories
  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        const res = await axios.get<Category[]>(
          "/api/blogs/categories"
        );
        setCategories(res.data || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to fetch categories list.");
      }
    };
    fetchAllCategories();
  }, []);

  // Fetch blog data if editing
  useEffect(() => {
    async function fetchBlogData() {
      if (isEditMode) {
        setIsLoading(true);
        setFetchError(null);
        try {
          const res = await axios.get<{ blog: BlogDetails }>(
            `/api/blogs/edit/${blogId}`
          );
          const blogData: BlogDetails = res.data.blog;

          setTitle(blogData.title || "");
          setSlug(blogData.slug || "");
          setMetaTitle(blogData.metaTitle || "");
          setMetaDescription(blogData.metaDescription || "");
          // Parse metaKeywords if it's a string
          if (blogData.metaKeywords) {
            if (typeof blogData.metaKeywords === 'string') {
              setMetaKeywords(blogData.metaKeywords.split(',').map(k => k.trim()).filter(Boolean));
            } else if (Array.isArray(blogData.metaKeywords)) {
              setMetaKeywords(blogData.metaKeywords);
            }
          }
          setContent(blogData.content || "");
          setImagePreview(blogData.image || null);
          setImageAlt(blogData.imageAlt || "");
          setSelectedCategories(
            blogData.categories?.map((bc) => bc.category?.id).filter((id): id is number => id !== undefined) || []
          );
          setIsSlugManuallyEdited(true);
        } catch (error) {
          console.error("Error fetching blog for edit:", error);
          setFetchError("Failed to load blog data. Please try again.");
          toast.error("Failed to load blog data.");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }
    fetchBlogData();
  }, [blogId, isEditMode]);

  // Auto-generate slug from title unless user manually edited
  useEffect(() => {
    if (!isSlugManuallyEdited && !isEditMode) {
      setSlug(title ? slugify(title) : "");
    }
  }, [title, isSlugManuallyEdited, isEditMode]);

  // Slug uniqueness check with debounce
  useEffect(() => {
    if (!slug) return setSlugError(null);
    setIsSlugChecking(true);
    const handler = setTimeout(async () => {
      try {
        const excludeIdParam = isEditMode ? `&excludeId=${blogId}` : "";
        const res = await axios.get(
          `/api/blogs/check-slug?slug=${slug}${excludeIdParam}`
        );
        setSlugError(
          res.data.isUnique
            ? null
            : "This slug is already taken. Please choose a different one."
        );
      } catch {
        setSlugError("Error checking slug uniqueness.");
      } finally {
        setIsSlugChecking(false);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [slug, isEditMode, blogId]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(slugify(e.target.value));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = inputValue.trim();
      if (value && !metaKeywords.includes(value)) {
        setMetaKeywords([...metaKeywords, value]);
        setInputValue("");
      }
    }
  };

  const handleDeleteKeyword = (keyword: string) => {
    setMetaKeywords(metaKeywords.filter((k) => k !== keyword));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!title || !content || !slug || isSlugChecking || slugError) {
      toast.error(
        "Please complete all required fields and fix any slug errors before submitting."
      );
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug);
    formData.append("content", content);
    formData.append("metaTitle", metaTitle);
    formData.append("metaDescription", metaDescription);
    formData.append("metaKeywords", metaKeywords.join(","));
    formData.append("imageAlt", imageAlt);
    selectedCategories.forEach((id) =>
      formData.append("categoryIds", String(id))
    );

    // Image: send file if chosen, else signal removal or keep current
    if (image) {
      formData.append("image", image);
    } else if (imagePreview === null && isEditMode) {
      formData.append("imageRemoved", "true");
    } else if (imagePreview && isEditMode) {
      formData.append("currentImage", imagePreview);
    }

    try {
      const url = isEditMode ? `/api/blogs/edit/${blogId}` : "/api/blogs";
      const res = await axios.request({
        method: isEditMode ? "put" : "post",
        url,
        data: formData,
      });

      if (res.data.success) {
        toast.success(
          `Blog ${isEditMode ? "updated" : "created"} successfully!`
        );
        router.push("/admin/blogs/list");
      } else {
        toast.error(
          `Failed to ${isEditMode ? "update" : "create"} blog: ${
            res.data.message || "Unknown error"
          }`
        );
        if (res.data.message?.includes("Unique constraint failed") || res.data.message?.includes("already exists"))
          setSlugError("This slug is already taken.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Something went wrong!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    !title ||
    !content ||
    !slug ||
    isSlugChecking ||
    !!slugError ||
    isSubmitting ||
    isLoading;

  const cardBg = isDark ? "bg-gray-800" : "bg-white";
  const textPrimary = isDark ? "text-gray-100" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-300" : "text-gray-700";
  const borderColor = isDark ? "border-gray-700" : "border-gray-300";
  const inputBg = isDark ? "bg-gray-700" : "bg-white";
  const inputText = isDark ? "text-gray-100 placeholder-gray-400" : "text-gray-900 placeholder-gray-500";

  if (isLoading)
    return (
      <div className={`flex justify-center items-center h-64 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className={`ml-3 ${textPrimary}`}>Loading blog data...</span>
      </div>
    );

  if (fetchError)
    return (
      <div className={`max-w-2xl mx-auto p-4 text-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <p className="text-red-500">{fetchError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"} p-6`}>
      <form
        onSubmit={handleSubmit}
        className={`max-w-4xl mx-auto ${cardBg} shadow-xl rounded-2xl p-8 flex flex-col gap-6 ${borderColor} border`}
      >
        <div className="border-b pb-4 border-gray-700">
          <h2 className={`text-3xl font-bold ${textPrimary}`}>
            {isEditMode ? "Edit Blog" : "Create Blog"}
          </h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            {isEditMode ? "Update the blog post details below" : "Fill in the details below to create a new blog post"}
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
            onChange={handleTitleChange}
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
            onChange={handleSlugChange}
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
            disabled={isSubmitDisabled}
            className={`flex-1 py-3 rounded-lg font-semibold text-white transition-all ${
              isSubmitDisabled
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl cursor-pointer"
            }`}
          >
            {isSubmitting ? "Saving..." : isSlugChecking ? "Checking..." : isEditMode ? "Update Blog" : "Create Blog"}
          </button>
        </div>
      </form>
    </div>
  );
}

