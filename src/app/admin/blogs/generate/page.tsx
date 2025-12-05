"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useThemeContext } from "@/context/ThemeContext";
import axios from "axios";
import toast from "react-hot-toast";
import { FaSpinner, FaCheckCircle, FaExclamationCircle, FaPlus, FaTrash } from "react-icons/fa";

export default function GenerateBlogsPage() {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const router = useRouter();

  const [productNames, setProductNames] = useState<string[]>([
    "ENSURE High Protein Health Drink, Chocolate 200g | Protein Drink for Active Adults | Muscle Recovery & Meal Replacement",
    "Ensure Chocolate Nutritional Supplement Drink | High Protein | 32 Nutrients | 950g | Adult Health",
  ]);
  const [newProductName, setNewProductName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const addProductName = () => {
    if (newProductName.trim()) {
      setProductNames([...productNames, newProductName.trim()]);
      setNewProductName("");
    }
  };

  const removeProductName = (index: number) => {
    setProductNames(productNames.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (productNames.length === 0) {
      toast.error("Please add at least one product name");
      return;
    }

    setGenerating(true);
    setResults(null);

    try {
      const response = await axios.post("/api/blogs/generate-for-products", {
        productNames: productNames,
      });

      if (response.data.success) {
        setResults(response.data);
        toast.success(
          `Generated ${response.data.summary.totalArticlesGenerated} articles for ${response.data.summary.found} products!`
        );
      } else {
        toast.error(response.data.error || "Generation failed");
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.response?.data?.error || "Failed to generate blogs");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-gradient-to-br from-gray-900 via-slate-900 to-black"
          : "bg-gradient-to-br from-gray-50 via-white to-slate-100"
      }`}
    >
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1
              className={`text-3xl lg:text-4xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Generate Blogs for Products
            </h1>
            <p
              className={`text-sm ${
                isDark ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Generate 10 article titles and 10 full articles for each product
            </p>
          </div>

          {/* Product Names Input */}
          <div
            className={`rounded-2xl border p-6 mb-6 ${
              isDark
                ? "bg-gray-800/50 border-gray-700"
                : "bg-white/80 border-gray-200 shadow-sm"
            }`}
          >
            <h2
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Product Names
            </h2>

            <div className="space-y-3 mb-4">
              {productNames.map((name, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    isDark ? "bg-gray-900/50" : "bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {name}
                    </p>
                  </div>
                  <button
                    onClick={() => removeProductName(index)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? "text-red-400 hover:bg-red-400/10"
                        : "text-red-600 hover:bg-red-50"
                    }`}
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addProductName()}
                placeholder="Enter product name..."
                className={`flex-1 px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                  isDark
                    ? "bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500"
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
              <button
                onClick={addProductName}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-300 flex items-center gap-2"
              >
                <FaPlus />
                Add
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={handleGenerate}
              disabled={generating || productNames.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Generate Blogs
                </>
              )}
            </button>
          </div>

          {/* Results */}
          {results && (
            <div
              className={`rounded-2xl border p-6 ${
                isDark
                  ? "bg-gray-800/50 border-gray-700"
                  : "bg-white/80 border-gray-200 shadow-sm"
              }`}
            >
              <h2
                className={`text-lg font-semibold mb-4 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Generation Results
              </h2>

              {/* Summary */}
              <div
                className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 ${
                  isDark ? "bg-gray-900/50" : "bg-gray-50"
                } p-4 rounded-xl`}
              >
                <div>
                  <p
                    className={`text-xs font-medium mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Total
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {results.summary.total}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs font-medium mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Found
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {results.summary.found}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs font-medium mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Articles
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {results.summary.totalArticlesGenerated}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-xs font-medium mb-1 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Hyperlinks
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {results.summary.totalHyperlinks}
                  </p>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-4">
                {results.results.map((result: any, index: number) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      result.status === "found"
                        ? isDark
                          ? "bg-green-900/20 border-green-700"
                          : "bg-green-50 border-green-200"
                        : isDark
                        ? "bg-red-900/20 border-red-700"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.status === "found" ? (
                        <FaCheckCircle className="text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <FaExclamationCircle className="text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`font-medium mb-2 ${
                            isDark ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {result.productName}
                        </p>
                        {result.status === "found" && result.generationResult && (
                          <div className="space-y-1">
                            <p
                              className={`text-sm ${
                                isDark ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Product ID: {result.productIndexId}
                            </p>
                            <p
                              className={`text-sm ${
                                isDark ? "text-gray-300" : "text-gray-700"
                              }`}
                            >
                              Titles: {result.generationResult.titlesGenerated} | Articles:{" "}
                              {result.generationResult.articlesGenerated} | Hyperlinks:{" "}
                              {result.generationResult.totalHyperlinks}
                            </p>
                            {result.generationResult.errors &&
                              result.generationResult.errors.length > 0 && (
                                <div className="mt-2">
                                  <p
                                    className={`text-xs font-medium mb-1 ${
                                      isDark ? "text-red-400" : "text-red-600"
                                    }`}
                                  >
                                    Errors:
                                  </p>
                                  <ul
                                    className={`text-xs space-y-1 ${
                                      isDark ? "text-red-300" : "text-red-700"
                                    }`}
                                  >
                                    {result.generationResult.errors
                                      .slice(0, 3)
                                      .map((err: string, idx: number) => (
                                        <li key={idx}>• {err}</li>
                                      ))}
                                  </ul>
                                </div>
                              )}
                          </div>
                        )}
                        {result.status !== "found" && (
                          <p
                            className={`text-sm ${
                              isDark ? "text-red-300" : "text-red-700"
                            }`}
                          >
                            {result.error || "Product not found"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

