"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import type { Event } from "@/types/event";

const EventsShowcase: React.FC = () => {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/events/upcoming?limit=2&featured=true");
        const fetchedEvents = res.data.events || [];
        console.log("[EventsShowcase] Fetched events:", fetchedEvents);
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysUntil = (dateString: string) => {
    const now = new Date();
    const eventDate = new Date(dateString);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <section className={`w-full py-12 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className={`h-64 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"} animate-pulse rounded-lg`} />
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    // Show section even if no events for debugging
    return (
      <section className={`w-full py-12 md:py-16 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            <span
              className="inline-block bg-clip-text text-transparent"
              style={{
                backgroundImage: colors.getGradient("primary", "secondary"),
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Upcoming Events
            </span>
          </h2>
          <div className={`text-center py-8 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"} border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
            <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              No upcoming featured events at the moment. Check back soon!
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`w-full py-12 md:py-16 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
          <span
            className="inline-block bg-clip-text text-transparent"
            style={{
              backgroundImage: colors.getGradient("primary", "secondary"),
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Upcoming Events
          </span>
        </h2>

        <div className="space-y-6">
          {events.map((event) => {
            const daysUntil = getDaysUntil(event.startDate);
            return (
              <div
                key={event.id}
                className={`rounded-2xl overflow-hidden border ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gradient-to-r from-purple-50 to-blue-50 border-gray-200"
                } shadow-lg`}
              >
                <div className="grid md:grid-cols-2 gap-6 p-6 md:p-8">
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{
                          background: colors.getGradient("primary", "secondary"),
                        }}
                      >
                        🎉 Upcoming Event
                      </span>
                      {daysUntil > 0 && (
                        <span
                          className={`text-sm font-medium ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {daysUntil} {daysUntil === 1 ? "day" : "days"} away
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-2xl md:text-3xl font-bold mb-3 ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {event.title}
                    </h3>

                    {event.description && (
                      <p
                        className={`mb-4 line-clamp-3 ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-col gap-2 mb-4">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span
                          className={`text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}
                        >
                          {formatDate(event.startDate)}
                          {event.endDate && ` - ${formatDate(event.endDate)}`}
                        </span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          <span
                            className={`text-sm ${
                              theme === "dark" ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {event.location}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {event.eventUrl && (
                        <Link
                          href={event.eventUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                          style={{
                            background: colors.getGradient("primary", "secondary"),
                          }}
                        >
                          Learn More
                        </Link>
                      )}
                      <Link
                        href="https://ipshopy.com/events"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-6 py-2 font-semibold rounded-lg border transition ${
                          theme === "dark"
                            ? "border-gray-600 hover:bg-gray-700"
                            : "border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        View All Events
                      </Link>
                    </div>
                  </div>

                  {event.image && (
                    <div className="relative w-full h-64 md:h-full rounded-lg overflow-hidden">
                      <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EventsShowcase;

