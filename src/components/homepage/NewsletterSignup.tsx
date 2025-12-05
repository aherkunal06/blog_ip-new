"use client";

import React, { useState } from "react";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import toast from "react-hot-toast";

const NewsletterSignup: React.FC = () => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      // TODO: Implement newsletter API endpoint
      // await axios.post("/api/newsletter/subscribe", { email });
      toast.success("Thank you for subscribing! Check your email for confirmation.");
      setEmail("");
    } catch (error: any) {
      console.error("Error subscribing:", error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={`w-full py-12 md:py-16 ${theme === "dark" ? "bg-gradient-to-b from-gray-900 to-black" : "bg-gradient-to-b from-gray-50 to-white"}`}>
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div
          className={`rounded-2xl p-8 md:p-12 ${
            theme === "dark"
              ? "bg-gray-900 border border-gray-800"
              : "bg-white border border-gray-200"
          } shadow-xl`}
        >
          <div className="text-center mb-8">
            <h2
              className={`text-3xl md:text-4xl font-bold mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Stay Updated with Latest Products & Blogs
            </h2>
            <p
              className={`text-lg ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Get exclusive deals, product updates, and helpful guides delivered to your inbox.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className={`flex-1 px-4 py-3 rounded-lg border ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{
                  background: colors.getGradient("primary", "secondary"),
                }}
              >
                {loading ? "Subscribing..." : "Subscribe Now"}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              "Weekly product highlights",
              "Exclusive discounts",
              "New blog posts",
              "Event announcements",
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {benefit}
                </span>
              </div>
            ))}
          </div>

          <p
            className={`text-center text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Join 10,000+ subscribers • Unsubscribe anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSignup;

