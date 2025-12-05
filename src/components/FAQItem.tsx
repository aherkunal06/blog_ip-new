"use client";

import { useThemeContext } from "@/context/ThemeContext";
import BlogHeading from "./BlogHeading";
import BlogTextElement from "./BlogTextElement";

interface FAQItemProps {
  faq: {
    id: number;
    question: string;
    answer: string;
  };
  index: number;
}

export default function FAQItem({ faq, index }: FAQItemProps) {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const borderColor = isDark ? "border-gray-700" : "border-gray-200";

  return (
    <div className={`border-b ${borderColor} pb-6 last:border-b-0`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
          {index + 1}
        </div>
        <div className="flex-1">
          <BlogHeading level={3} className="mb-3">
            {faq.question}
          </BlogHeading>
          <BlogTextElement variant="secondary" className="leading-relaxed">
            {faq.answer}
          </BlogTextElement>
        </div>
      </div>
    </div>
  );
}

