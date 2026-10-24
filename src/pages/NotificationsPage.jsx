import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCheck,
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Bell,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_PROFILE_IMAGE } from "../config/constants";
import { formatTimeAgo } from "../utils/format";
import toast from "react-hot-toast";

const getNotificationConfig = (type = "") => {
  if (type.includes("like")) {
    return {
      icon: <Heart size={12} className="fill-current" />,
      color: "text-rose-500",
      label: "liked your post.",
    };
  }
  if (type.includes("comment")) {
    return {
      icon: <MessageCircle size={12} className="fill-current" />,
      color: "text-[#1877f2]",
      label: "commented on your post.",
    };
  }
  if (type.includes("share")) {
    return {
      icon: <Share2 size={12} />,
      color: "text-emerald-600",
      label: "shared your post.",
    };
  }
  if (type.includes("follow")) {
    return {
      icon: <UserPlus size={12} />,
      color: "text-violet-600",
      label: "followed you.",
    };
  }
  return {
    icon: <Bell size={12} />,
    color: "text-slate-500",
    label: type.replaceAll("_", " "),
  };
};

export const NotificationsPage = () => {
  const { request, token } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const {
    data: notifsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["notifications", "list", token],
    enabled: !!token,
    queryFn: async () => {
      try {
        const res = await request({
          path: "/notifications",
          query: { page: "1", limit: "30" },
        });
        return res.data?.notifications || res.notifications || [];
      } catch {
        return [];
      }
    },
    staleTime: 5000,
    refetchInterval: 20000,
  });

  const notifications = notifsData || [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllReadMutation = useMutation({
    mutationFn: () => request({ path: "/notifications/read-all", method: "PATCH" }),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications", "list", token] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count", token] });
      refetch();
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: (id) => request({ path: `/notifications/${id}/read`, method: "PATCH" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list", token] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count", token] });
      refetch();
    },
  });

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead && notif._id) {
      markOneReadMutation.mutate(notif._id);
    }

    const postId = notif.post || notif.entity?.post?._id || notif.entity?.post;
    if (postId) {
      navigate(`/posts/${postId}`);
      return;
    }

    const actorId = notif.actor?._id || notif.actor?.id || notif.user?._id;
    if (actorId) {
      navigate(`/profile/${actorId}`);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
      {/* Header Container matching demo screenshot */}
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
              Notifications
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Realtime updates for likes, comments, shares, and follows.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto cursor-pointer"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || unreadCount === 0}
          >
            <CheckCheck size={15} />
            <span>Mark all as read</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition cursor-pointer ${
              filter === "all"
                ? "bg-[#1877f2] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition cursor-pointer ${
              filter === "unread"
                ? "bg-[#1877f2] text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  filter === "unread"
                    ? "bg-white/25 text-white"
                    : "bg-white text-[#1877f2]"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="m-4 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-600">
          {error instanceof Error ? error.message : "Failed to load notifications"}
        </div>
      )}

      {/* Notifications List / Empty State */}
      <div className="space-y-2 p-3 sm:p-4">
        {isLoading ? (
          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm font-semibold text-slate-500">
              No {filter === "unread" ? "unread " : ""}notifications yet.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const config = getNotificationConfig(notif.type);
            const actor = notif.actor || notif.user || {};
            const entityText =
              notif.entity?.body || notif.entity?.content || notif.entity?.name || "";

            return (
              <article
                key={notif._id}
                className={`group relative flex gap-3 rounded-xl border p-3 transition cursor-pointer sm:rounded-2xl sm:p-4 ${
                  notif.isRead
                    ? "border-slate-200 bg-white hover:bg-slate-50"
                    : "border-[#dbeafe] bg-[#edf4ff]"
                }`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className="relative shrink-0">
                  <button
                    type="button"
                    className="block cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      const actorId = actor._id || actor.id;
                      if (actorId) navigate(`/profile/${actorId}`);
                    }}
                  >
                    <img
                      src={actor.photo || DEFAULT_PROFILE_IMAGE}
                      alt={actor.name || "actor"}
                      className="h-11 w-11 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                      }}
                    />
                  </button>
                  <span
                    className={`absolute -bottom-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white ${config.color}`}
                  >
                    {config.icon}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-1.5 sm:gap-2">
                    <p className="text-sm leading-6 text-slate-800">
                      <span className="font-extrabold hover:text-[#1877f2] hover:underline">
                        {actor.name || (actor.username ? `@${actor.username}` : "Someone")}
                      </span>{" "}
                      <span>{config.label}</span>
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                      {!notif.isRead && (
                        <span className="h-2.5 w-2.5 rounded-full bg-[#1877f2]" />
                      )}
                    </div>
                  </div>

                  {entityText && (
                    <p className="mt-0.5 text-sm text-slate-600 line-clamp-2">
                      {entityText}
                    </p>
                  )}

                  <div className="mt-2 flex items-center gap-2">
                    {notif.isRead ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                        <Check size={13} />
                        <span>Read</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-[#1877f2] ring-1 ring-[#dbeafe] transition hover:bg-[#e7f3ff] cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          markOneReadMutation.mutate(notif._id);
                        }}
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
