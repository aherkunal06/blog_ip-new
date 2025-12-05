"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dayjs from "dayjs";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaExternalLinkAlt,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { useThemeContext } from "@/context/ThemeContext";
import Link from "next/link";
import axios from "axios";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

type Event = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  eventUrl: string | null;
  status: "upcoming" | "live" | "past";
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    image: "",
    startDate: "",
    endDate: "",
    location: "",
    eventUrl: "",
    status: "upcoming" as Event["status"],
    featured: false,
  });

  const { theme } = useThemeContext();
  const isDark = theme === "dark";
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/events");
      setEvents(res.data.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      title: "",
      slug: "",
      description: "",
      image: "",
      startDate: "",
      endDate: "",
      location: "",
      eventUrl: "",
      status: "upcoming",
      featured: false,
    });
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      slug: event.slug,
      description: event.description || "",
      image: event.image || "",
      startDate: dayjs(event.startDate).format("YYYY-MM-DDTHH:mm"),
      endDate: event.endDate ? dayjs(event.endDate).format("YYYY-MM-DDTHH:mm") : "",
      location: event.location || "",
      eventUrl: event.eventUrl || "",
      status: event.status,
      featured: event.featured,
    });
    setShowAddModal(false);
    setShowEditModal(true);
  };

  const handleSave = async () => {
    try {
      if (editingEvent) {
        await axios.put(`/api/events/${editingEvent.id}`, formData);
        toast.success("Event updated successfully");
        setShowEditModal(false);
      } else {
        await axios.post("/api/events", formData);
        toast.success("Event created successfully");
        setShowAddModal(false);
      }
      setEditingEvent(null);
      fetchEvents();
    } catch (error: any) {
      console.error("Error saving event:", error);
      toast.error(error.response?.data?.error || "Failed to save event");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await axios.delete(`/api/events/${id}`);
      toast.success("Event deleted successfully");
      fetchEvents();
    } catch (error: any) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleToggleFeatured = async (event: Event) => {
    try {
      await axios.put(`/api/events/${event.id}`, { featured: !event.featured });
      toast.success(`Event ${!event.featured ? "featured" : "unfeatured"} successfully`);
      fetchEvents();
    } catch (error: any) {
      console.error("Error toggling featured:", error);
      toast.error("Failed to update event");
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
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1
              className={`text-3xl lg:text-4xl font-bold mb-2 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              Events Management
            </h1>
            <p
              className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
            >
              Manage upcoming events and promotions for the homepage
            </p>
          </div>

          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer mt-4 lg:mt-0"
          >
            <FaPlus />
            Create Event
          </button>
        </div>

        {/* Events List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : events.length === 0 ? (
          <div
            className={`rounded-2xl border p-12 text-center ${
              isDark
                ? "bg-gray-800/50 border-gray-700"
                : "bg-white/80 border-gray-200 shadow-sm"
            }`}
          >
            <FaCalendarAlt
              className={`w-16 h-16 mx-auto mb-4 ${
                isDark ? "text-gray-600" : "text-gray-400"
              }`}
            />
            <p
              className={`text-lg font-medium mb-2 ${
                isDark ? "text-gray-300" : "text-gray-700"
              }`}
            >
              No events found
            </p>
            <p
              className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}
            >
              Create your first event to display on the homepage
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className={`rounded-2xl border overflow-hidden shadow-lg ${
                  isDark
                    ? "bg-gray-800/50 border-gray-700"
                    : "bg-white border-gray-200"
                } hover:shadow-xl transition-all duration-300`}
              >
                {event.image && (
                  <div className="relative w-full h-48">
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                    {event.featured && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded">
                        Featured
                      </div>
                    )}
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3
                      className={`text-xl font-bold line-clamp-2 ${
                        isDark ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {event.title}
                    </h3>
                    <button
                      onClick={() => handleToggleFeatured(event)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        event.featured
                          ? "text-yellow-500"
                          : isDark
                          ? "text-gray-500 hover:bg-gray-700"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={event.featured ? "Unfeature" : "Feature"}
                    >
                      {event.featured ? <FaEye /> : <FaEyeSlash />}
                    </button>
                  </div>

                  {event.description && (
                    <p
                      className={`text-sm mb-4 line-clamp-2 ${
                        isDark ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {event.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt
                        className={`w-4 h-4 ${
                          isDark ? "text-gray-400" : "text-gray-500"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {dayjs(event.startDate).format("MMM DD, YYYY")}
                        {event.endDate &&
                          ` - ${dayjs(event.endDate).format("MMM DD, YYYY")}`}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt
                          className={`w-4 h-4 ${
                            isDark ? "text-gray-400" : "text-gray-500"
                          }`}
                        />
                        <span
                          className={`text-xs ${
                            isDark ? "text-gray-400" : "text-gray-600"
                          }`}
                        >
                          {event.location}
                        </span>
                      </div>
                    )}
                    <div
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        event.status === "upcoming"
                          ? "bg-blue-100 text-blue-800"
                          : event.status === "live"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {event.status === "live" ? "Live" : event.status === "past" ? "Past" : "Upcoming"}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <FaEdit className="inline mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
            }}
          />
          <div
            className={`relative w-full max-w-2xl rounded-2xl shadow-2xl p-6 ${
              isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-6 ${
                isDark ? "text-white" : "text-gray-900"
              }`}
            >
              {editingEvent ? "Edit Event" : "Create Event"}
            </h2>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark
                      ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  required
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark
                      ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  required
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark
                      ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark
                      ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Start Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                      isDark
                        ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    required
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                      isDark
                        ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark
                      ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Event URL
                </label>
                <input
                  type="url"
                  value={formData.eventUrl}
                  onChange={(e) => setFormData({ ...formData, eventUrl: e.target.value })}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                    isDark
                      ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                      : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as Event["status"] })
                    }
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                      isDark
                        ? "bg-gray-900 border-gray-600 text-gray-100 focus:border-blue-500"
                        : "bg-white border-gray-300 text-gray-900 focus:border-blue-500"
                    } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="past">Past</option>
                  </select>
                </div>
                <div className="flex items-center pt-8">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) =>
                        setFormData({ ...formData, featured: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`text-sm font-medium ${
                        isDark ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
                      Featured (Show on Homepage)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 cursor-pointer ${
                  isDark
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-300 cursor-pointer"
              >
                {editingEvent ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

