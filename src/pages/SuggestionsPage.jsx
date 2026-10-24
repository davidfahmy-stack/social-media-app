import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Search, UserPlus, Check, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_PROFILE_IMAGE } from "../config/constants";
import toast from "react-hot-toast";

export const SuggestionsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const { request, token, me } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const [followingMap, setFollowingMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (me?.following) {
      const map = {};
      me.following.forEach((id) => {
        const key = typeof id === "object" ? id._id : String(id);
        map[key] = true;
      });
      setFollowingMap(map);
    }
  }, [me?.following]);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", "suggestions-page", token, debouncedSearch],
    enabled: !!token,
    queryFn: async () => {
      if (debouncedSearch) {
        const res = await request({
          path: "/users/search",
          query: { page: "1", limit: "30", q: debouncedSearch },
        });
        return res.data?.users || res.users || [];
      }
      const res = await request({
        path: "/users/suggestions",
        query: { page: "1", limit: "30" },
      });
      return res.data?.suggestions || res.suggestions || [];
    },
  });

  const usersList = usersData || [];

  const followMutation = useMutation({
    mutationFn: (userId) => request({ path: `/users/${userId}/follow`, method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "suggestions", token] });
      queryClient.invalidateQueries({ queryKey: ["posts", "feed", token] });
    },
  });

  const handleToggleFollow = async (userId) => {
    if (loadingMap[userId]) return;
    setLoadingMap((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await followMutation.mutateAsync(userId);
      const isNowFollowing = Boolean(res.data?.following ?? !followingMap[userId]);
      setFollowingMap((prev) => ({ ...prev, [userId]: isNowFollowing }));
      toast.success(isNowFollowing ? "Followed successfully" : "Unfollowed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Follow action failed");
    } finally {
      setLoadingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      {/* Main Container matching demo exactly */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[#1877f2]" />
            <h2 className="text-base font-extrabold text-slate-900">
              All Suggested Friends
            </h2>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
            {usersList.length}
          </span>
        </div>

        <label className="relative mb-4 block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or username..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-[#1877f2] focus:bg-white"
          />
        </label>

        {isLoading ? (
          <div className="space-y-3">
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : usersList.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            No users matched your search.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {usersList.map((user) => {
              const isFollowing = Boolean(followingMap[user._id]);
              const isActionLoading = Boolean(loadingMap[user._id]);

              return (
                <article
                  key={user._id}
                  className="rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 text-left transition hover:bg-slate-50 cursor-pointer"
                      onClick={() => navigate(`/profile/${user._id}`)}
                    >
                      <img
                        src={user.photo || DEFAULT_PROFILE_IMAGE}
                        alt={user.name || "User"}
                        className="h-12 w-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                        }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 hover:underline">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {user.username ? `@${user.username}` : "route user"}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleToggleFollow(user._id)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 cursor-pointer ${
                        isFollowing
                          ? "bg-[#e9f7ef] text-[#1f9d55]"
                          : "bg-[#e7f3ff] text-[#1877f2] hover:bg-[#d8ebff]"
                      }`}
                    >
                      {isActionLoading ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : isFollowing ? (
                        <>
                          <Check size={13} />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={13} />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
