"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useThemeContext } from "@/context/ThemeContext";
import { useDynamicColors } from "@/utils/useDynamicColors";
import type { Event } from "@/types/event";

export default function EventsPage() {
  const { theme } = useThemeContext();
  const colors = useDynamicColors();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "past">("all");

  useEffect(() => {
    fetchEvents();
  }, [filter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await axios.get(`/api/events${params}`);
      setEvents(res.data.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

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

  const getStatusBadge = (event: Event) => {
    if (event.status === "live") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
          🔴 Live Now
        </span>
      );
    } else if (event.status === "past") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500 text-white">
          Past Event
        </span>
      );
    } else {
      const daysUntil = getDaysUntil(event.startDate);
      return (
        <span
          className="px-3 py-1 rounded-full text-xs font-semibold text-white"
          style={{
            background: colors.getGradient("primary", "secondary"),
          }}
        >
          {daysUntil > 0 ? `${daysUntil} days away` : "Upcoming"}
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen py-12 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-64 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"} animate-pulse rounded-lg`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 ${theme === "dark" ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl md:text-5xl font-bold mb-4"
            style={{
              background: colors.getGradient("primary", "secondary"),
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Events
          </h1>
          <p className={`text-lg ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Discover upcoming events, live sessions, and past highlights
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {(["all", "upcoming", "live", "past"] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === filterOption
                  ? "text-white"
                  : theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-gray-800"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
              style={
                filter === filterOption
                  ? {
                      background: colors.getGradient("primary", "secondary"),
                    }
                  : {}
              }
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className={`text-center py-16 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white"} border ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
            <p className={`text-lg ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              No {filter !== "all" ? filter : ""} events found. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className={`rounded-2xl overflow-hidden border shadow-lg transition-transform hover:scale-105 ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Event Image */}
                {event.image && (
                  <div className="relative w-full h-48">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                    {event.featured && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded">
                          Featured
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Event Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    {getStatusBadge(event)}
                  </div>

                  <h3
                    className={`text-xl font-bold mb-2 ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {event.title}
                  </h3>

                  {event.description && (
                    <p
                      className={`text-sm mb-4 line-clamp-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      {event.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
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
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {formatDate(event.startDate)}
                        {event.endDate && ` - ${formatDate(event.endDate)}`}
                      </span>
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
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
                          className={`text-xs ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {event.location}
                        </span>
                      </div>
                    )}
                  </div>

                  {event.eventUrl && (
                    <Link
                      href={event.eventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center px-4 py-2 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      style={{
                        background: colors.getGradient("primary", "secondary"),
                      }}
                    >
                      Learn More
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

