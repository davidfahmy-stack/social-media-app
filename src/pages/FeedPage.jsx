import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Newspaper,
  Sparkles,
  Globe,
  Bookmark,
  Users,
  Search,
  Check,
  UserPlus,
  Loader2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { CreatePostCard } from "../components/post/CreatePostCard";
import { PostCard } from "../components/post/PostCard";
import { PostSkeleton } from "../components/ui/LoadingSpinner";
import { DEFAULT_PROFILE_IMAGE } from "../config/constants";
import toast from "react-hot-toast";

export const FeedPage = () => {
  const { request, token, me } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("following");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [followingMap, setFollowingMap] = useState({});
  const [actionLoadingMap, setActionLoadingMap] = useState({});
  const [showSuggestedMobile, setShowSuggestedMobile] = useState(false);

  const loadMoreRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const {
    data: postsData,
    isLoading: loadingPosts,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchPosts,
  } = useInfiniteQuery({
    queryKey: ["posts", "feed", token, activeTab],
    enabled: !!token,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      if (activeTab === "saved") {
        const res = await request({
          path: "/users/bookmarks",
          query: { limit: "20", page: String(pageParam) },
        });
        const nextPage = res.meta?.pagination?.nextPage;
        return {
          posts: res.data?.bookmarks || res.bookmarks || [],
          nextPage,
        };
      }

      if (activeTab === "all") {
        // Community Tab: fetches public feed or all posts
        try {
          const res = await request({
            path: "/posts/feed",
            query: { only: "all", limit: "20", page: String(pageParam) },
          });
          const posts = res.data?.posts || res.posts || [];
          if (posts.length > 0) {
            return {
              posts,
              nextPage: res.meta?.pagination?.nextPage,
            };
          }
        } catch {}

        // Fallback to /posts
        try {
          const res = await request({
            path: "/posts",
            query: { limit: "20", page: String(pageParam) },
          });
          const posts = res.data?.posts || res.posts || [];
          return {
            posts,
            nextPage: res.meta?.pagination?.nextPage,
          };
        } catch {}
      }

      const res = await request({
        path: "/posts/feed",
        query: {
          only: activeTab === "all" ? "all" : activeTab,
          limit: "20",
          page: String(pageParam),
        },
      });

      const nextPage = res.meta?.pagination?.nextPage;
      return {
        posts: res.data?.posts || res.posts || [],
        nextPage,
      };
    },
    getNextPageParam: (lastPage) => lastPage?.nextPage,
  });

  const allPosts = useMemo(() => {
    return (postsData?.pages || []).flatMap((p) => p.posts);
  }, [postsData]);

  // Infinite Scroll Trigger
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage && !loadingPosts) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, loadingPosts, fetchNextPage]);

  // Suggested Users Query
  const { data: suggestionsData, isLoading: loadingSuggestions } = useQuery({
    queryKey: ["users", debouncedQuery ? "search" : "suggestions", token, debouncedQuery],
    enabled: !!token,
    queryFn: async () => {
      if (debouncedQuery) {
        const res = await request({
          path: "/users/search",
          query: { page: "1", limit: "8", q: debouncedQuery },
        });
        return res.data?.users || res.users || [];
      }
      const res = await request({
        path: "/users/suggestions",
        query: { page: "1", limit: "5" },
      });
      return res.data?.suggestions || res.suggestions || [];
    },
  });

  const suggestionsList = useMemo(() => {
    return (suggestionsData || []).slice(0, 5);
  }, [suggestionsData]);

  const followMutation = useMutation({
    mutationFn: (userId) => request({ path: `/users/${userId}/follow`, method: "PUT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "suggestions", token] });
      queryClient.invalidateQueries({ queryKey: ["posts", "feed", token] });
    },
  });

  const handleToggleFollow = async (userId) => {
    if (actionLoadingMap[userId]) return;
    setActionLoadingMap((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await followMutation.mutateAsync(userId);
      const isNowFollowing = Boolean(res.data?.following ?? !followingMap[userId]);
      setFollowingMap((prev) => ({ ...prev, [userId]: isNowFollowing }));
      toast.success(isNowFollowing ? "Followed successfully" : "Unfollowed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Follow action failed");
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleTabChange = (newTab) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (newTab === activeTab) {
      queryClient.resetQueries({ queryKey: ["posts", "feed", token, newTab], exact: true });
      return;
    }
    setActiveTab(newTab);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      {/* Left Navigation Sidebar matching Demo Screenshot 1 */}
      <aside className="hidden h-fit space-y-3 xl:sticky xl:top-[84px] xl:block">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <button
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition cursor-pointer ${
              activeTab === "following"
                ? "bg-[#e7f3ff] text-[#1877f2]"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => handleTabChange("following")}
          >
            <Newspaper size={17} />
            <span>Feed</span>
          </button>

          <button
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition cursor-pointer ${
              activeTab === "me"
                ? "bg-[#e7f3ff] text-[#1877f2]"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => handleTabChange("me")}
          >
            <Sparkles size={17} />
            <span>My Posts</span>
          </button>

          <button
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition cursor-pointer ${
              activeTab === "all"
                ? "bg-[#e7f3ff] text-[#1877f2]"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => handleTabChange("all")}
          >
            <Globe size={17} />
            <span>Community</span>
          </button>

          <button
            className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition cursor-pointer ${
              activeTab === "saved"
                ? "bg-[#e7f3ff] text-[#1877f2]"
                : "text-slate-700 hover:bg-slate-100"
            }`}
            onClick={() => handleTabChange("saved")}
          >
            <Bookmark size={17} />
            <span>Saved</span>
          </button>
        </div>
      </aside>

      {/* Middle Feed Column */}
      <section className="space-y-4">
        {/* Mobile Tabs for < xl screens */}
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm xl:hidden">
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "following"
                  ? "bg-[#e7f3ff] text-[#1877f2]"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => handleTabChange("following")}
            >
              <Newspaper size={16} />
              <span>Feed</span>
            </button>
            <button
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "me"
                  ? "bg-[#e7f3ff] text-[#1877f2]"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => handleTabChange("me")}
            >
              <Sparkles size={16} />
              <span>My Posts</span>
            </button>
            <button
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "all"
                  ? "bg-[#e7f3ff] text-[#1877f2]"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => handleTabChange("all")}
            >
              <Globe size={16} />
              <span>Community</span>
            </button>
            <button
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition cursor-pointer ${
                activeTab === "saved"
                  ? "bg-[#e7f3ff] text-[#1877f2]"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => handleTabChange("saved")}
            >
              <Bookmark size={16} />
              <span>Saved</span>
            </button>
          </div>
        </div>

        {/* Mobile Suggested Friends Accordion Toggle */}
        <div className="space-y-3 xl:hidden">
          <button
            type="button"
            className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm cursor-pointer"
            onClick={() => setShowSuggestedMobile((prev) => !prev)}
          >
            <span className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Users size={17} className="text-[#1877f2]" />
              <span>Suggested Friends</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                {suggestionsList.length}
              </span>
              <span className="text-xs font-bold text-[#1877f2]">
                {showSuggestedMobile ? "Hide" : "Show"}
              </span>
            </span>
          </button>

          {showSuggestedMobile && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-in fade-in duration-150">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-[#1877f2]" />
                  <h3 className="text-base font-extrabold text-slate-900">Suggested Friends</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {suggestionsList.length}
                </span>
              </div>

              <div className="mb-3">
                <label className="relative block">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search friends..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#1877f2] focus:bg-white"
                  />
                </label>
              </div>

              {loadingSuggestions ? (
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : suggestionsList.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {debouncedQuery
                    ? "No users matched your search."
                    : "No friend suggestions right now."}
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestionsList.map((user) => {
                    const isFollowing = Boolean(followingMap[user._id]);
                    const isActionLoading = Boolean(actionLoadingMap[user._id]);

                    return (
                      <div key={user._id} className="rounded-xl border border-slate-200 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-slate-50 cursor-pointer"
                            onClick={() => navigate(`/profile/${user._id}`)}
                          >
                            <img
                              src={user.photo || DEFAULT_PROFILE_IMAGE}
                              alt={user.name}
                              className="h-10 w-10 rounded-full object-cover"
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
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Create Post Box */}
        <CreatePostCard onPostCreated={() => refetchPosts()} />

        {/* Posts List */}
        {loadingPosts ? (
          <div className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : allPosts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            {activeTab === "saved"
              ? "You haven't saved any posts yet."
              : "No posts yet. Follow people or write a post!"}
          </div>
        ) : (
          <div className="space-y-4">
            {allPosts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onPostUpdated={() => refetchPosts()}
                onPostDeleted={() => refetchPosts()}
              />
            ))}

            <div ref={loadMoreRef} className="py-2 text-center">
              {isFetchingNextPage ? (
                <p className="text-xs font-semibold text-slate-400">Loading more posts...</p>
              ) : hasNextPage ? (
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer"
                >
                  Load more
                </button>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {/* Right Sidebar: Suggested Friends for Desktop */}
      <aside className="hidden h-fit space-y-3 xl:sticky xl:top-[84px] xl:block">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#1877f2]" />
              <h3 className="text-base font-extrabold text-slate-900">Suggested Friends</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {suggestionsList.length}
            </span>
          </div>

          <div className="mb-3">
            <label className="relative block">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search friends..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-[#1877f2] focus:bg-white"
              />
            </label>
          </div>

          {loadingSuggestions ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : suggestionsList.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-2">
              {debouncedQuery
                ? "No users matched your search."
                : "No friend suggestions right now."}
            </p>
          ) : (
            <div className="space-y-3">
              {suggestionsList.map((user) => {
                const isFollowing = Boolean(followingMap[user._id]);
                const isActionLoading = Boolean(actionLoadingMap[user._id]);

                return (
                  <div key={user._id} className="rounded-xl border border-slate-200 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/profile/${user._id}`)}
                      >
                        <img
                          src={user.photo || DEFAULT_PROFILE_IMAGE}
                          alt={user.name}
                          className="h-10 w-10 rounded-full object-cover"
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
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
            onClick={() => navigate("/suggestions")}
          >
            View more
          </button>
        </div>
      </aside>
    </div>
  );
};
