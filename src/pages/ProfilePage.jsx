import React, { useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Trash2,
  Users,
  Check,
  UserPlus,
  Bookmark,
  FileText,
  Clock,
  ThumbsUp,
  Share2,
  MessageCircle,
  Mail,
  Expand,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PostSkeleton } from "../components/ui/LoadingSpinner";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ImageModal } from "../components/ui/ImageModal";
import { DEFAULT_PROFILE_IMAGE } from "../config/constants";
import { formatTimeAgo, renderWithMentions } from "../utils/format";
import toast from "react-hot-toast";

export const ProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    me,
    token,
    request,
    uploadPhoto,
    uploadCover,
    deleteCover,
  } = useAuth();

  const isOwnProfile = !userId || userId === me?._id;
  const targetUserId = isOwnProfile ? me?._id : userId;

  const [activeTab, setActiveTab] = useState("posts");
  const [deleteCoverModal, setDeleteCoverModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const photoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Fetch other user's profile if visiting /profile/:userId
  const { data: otherUserProfile, refetch: refetchOtherProfile } = useQuery({
    queryKey: ["users", "profile", token, targetUserId],
    enabled: !!(token && !isOwnProfile && targetUserId),
    queryFn: async () => {
      const res = await request({ path: `/users/${targetUserId}/profile` });
      const user = res.data?.user || res.user || {};
      setIsFollowing(Boolean(res.data?.isFollowing ?? user.isFollowing));
      return user;
    },
  });

  const profileUser = isOwnProfile ? me : otherUserProfile;

  // Fetch user posts
  const {
    data: myPostsData = [],
    isLoading: loadingMyPosts,
    refetch: refetchMyPosts,
  } = useQuery({
    queryKey: ["posts", "profile-posts", token, targetUserId],
    enabled: !!(token && targetUserId),
    queryFn: async () => {
      if (isOwnProfile) {
        const res = await request({
          path: "/posts/feed",
          query: { only: "me", page: "1", limit: "20" },
        });
        return res.data?.posts || res.posts || [];
      }
      const res = await request({
        path: `/users/${targetUserId}/posts`,
        query: { page: "1", limit: "20" },
      });
      return res.data?.posts || res.posts || [];
    },
  });

  // Fetch bookmarks
  const {
    data: savedPostsData = [],
    isLoading: loadingSavedPosts,
    refetch: refetchSavedPosts,
  } = useQuery({
    queryKey: ["posts", "profile-bookmarks", token],
    enabled: !!(token && isOwnProfile),
    queryFn: async () => {
      const res = await request({
        path: "/users/bookmarks",
        query: { page: "1", limit: "20" },
      });
      return res.data?.bookmarks || res.bookmarks || [];
    },
  });

  const displayedPosts = activeTab === "posts" ? myPostsData : savedPostsData;
  const loadingPosts = activeTab === "posts" ? loadingMyPosts : loadingSavedPosts;

  const followMutation = useMutation({
    mutationFn: () => request({ path: `/users/${targetUserId}/follow`, method: "PUT" }),
    onSuccess: (res) => {
      const nextFollowing = Boolean(res.data?.following ?? !isFollowing);
      setIsFollowing(nextFollowing);
      toast.success(nextFollowing ? "Followed user" : "Unfollowed user");
      queryClient.invalidateQueries({ queryKey: ["users", "suggestions", token] });
      refetchOtherProfile();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to toggle follow");
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await uploadPhoto(file);
      toast.success("Profile photo updated");
      refetchMyPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      await uploadCover(file);
      toast.success("Cover photo updated");
      refetchMyPosts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  const handleDeleteCover = async () => {
    try {
      await deleteCover();
      toast.success("Cover removed");
      setDeleteCoverModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {!isOwnProfile && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      )}

      {/* Profile Header & Cover Banner */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_10px_rgba(15,23,42,.06)] sm:rounded-[28px]">
        {/* Cover Photo */}
        <div
          className="group/cover relative h-44 bg-[linear-gradient(112deg,#0f172a_0%,#1e3a5f_36%,#2b5178_72%,#5f8fb8_100%)] sm:h-52 lg:h-60"
          style={
            profileUser?.cover
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.22), rgba(15, 23, 42, 0.4)), url(${profileUser.cover})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_24%,rgba(255,255,255,.14)_0%,rgba(255,255,255,0)_36%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,rgba(186,230,253,.22)_0%,rgba(186,230,253,0)_44%)]" />
          <div className="absolute -left-16 top-10 h-36 w-36 rounded-full bg-white/8 blur-3xl" />
          <div className="absolute right-8 top-6 h-48 w-48 rounded-full bg-[#c7e6ff]/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/25 to-transparent" />

          {/* Cover Action Controls */}
          {isOwnProfile && (
            <div className="pointer-events-none absolute right-2 top-2 z-10 flex max-w-[90%] flex-wrap items-center justify-end gap-1.5 opacity-100 transition duration-200 sm:right-3 sm:top-3 sm:max-w-none sm:gap-2 sm:opacity-0 sm:group-hover/cover:opacity-100 sm:group-focus-within/cover:opacity-100">
              {profileUser?.cover && (
                <button
                  type="button"
                  className="pointer-events-auto inline-flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-black/60 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs cursor-pointer"
                  onClick={() => setPreviewImage(profileUser.cover)}
                >
                  <Expand size={13} />
                  <span>View cover</span>
                </button>
              )}

              <label className="pointer-events-auto inline-flex cursor-pointer items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-black/60 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs">
                <Camera size={13} />
                <span>
                  {uploadingCover
                    ? "Uploading..."
                    : profileUser?.cover
                    ? "Change cover"
                    : "Add cover"}
                </span>
                <input
                  type="file"
                  ref={coverInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverUpload}
                />
              </label>

              {profileUser?.cover && (
                <button
                  type="button"
                  className="pointer-events-auto inline-flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-black/60 sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs cursor-pointer"
                  onClick={() => setDeleteCoverModal(true)}
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="relative -mt-12 px-3 pb-5 sm:-mt-16 sm:px-8 sm:pb-6">
          <div className="rounded-3xl border border-white/60 bg-white/92 p-5 backdrop-blur-xl sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-end gap-4">
                  {/* Avatar */}
                  <div className="group/avatar relative shrink-0">
                    <button
                      type="button"
                      className="cursor-zoom-in rounded-full"
                      onClick={() => setPreviewImage(profileUser?.photo || DEFAULT_PROFILE_IMAGE)}
                    >
                      <img
                        src={profileUser?.photo || DEFAULT_PROFILE_IMAGE}
                        alt={profileUser?.name}
                        className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-md ring-2 ring-[#dbeafe]"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
                        }}
                      />
                    </button>

                    {isOwnProfile && (
                      <>
                        <button
                          type="button"
                          className="absolute bottom-1 left-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-[#1877f2] opacity-100 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:bg-slate-50 sm:opacity-0 sm:group-hover/avatar:opacity-100 sm:group-focus-within/avatar:opacity-100"
                          onClick={() => setPreviewImage(profileUser?.photo || DEFAULT_PROFILE_IMAGE)}
                          title="View profile photo"
                        >
                          <Expand size={16} />
                        </button>

                        <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#1877f2] text-white opacity-100 shadow-sm transition duration-200 hover:bg-[#166fe5] sm:opacity-0 sm:group-hover/avatar:opacity-100 sm:group-focus-within/avatar:opacity-100">
                          {uploadingPhoto ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Camera size={17} />
                          )}
                          <input
                            type="file"
                            ref={photoInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handlePhotoUpload}
                          />
                        </label>
                      </>
                    )}
                  </div>

                  {/* Name, Handle, Badge */}
                  <div className="min-w-0 pb-1">
                    <h2 className="truncate text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">
                      {profileUser?.name}
                    </h2>
                    <p className="mt-1 text-lg font-semibold text-slate-500 sm:text-xl">
                      @{profileUser?.username || "user"}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d7e7ff] bg-[#eef6ff] px-3 py-1 text-xs font-bold text-[#0b57d0]">
                      <Users size={13} />
                      <span>Route Posts member</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => followMutation.mutate()}
                    disabled={followMutation.isPending}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold transition cursor-pointer disabled:opacity-50 ${
                      isFollowing
                        ? "bg-[#e9f7ef] text-[#1f9d55] border border-emerald-200"
                        : "bg-[#1877f2] text-white hover:bg-[#166fe5]"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <Check size={16} />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}

                {/* Exact 3 Stats: Followers, Following, Bookmarks */}
                <div className="grid w-full grid-cols-3 gap-2 lg:w-[520px]">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center sm:px-4 sm:py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
                      Followers
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                      {profileUser?.followersCount ?? profileUser?.followers?.length ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center sm:px-4 sm:py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
                      Following
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                      {profileUser?.followingCount ?? profileUser?.following?.length ?? 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center sm:px-4 sm:py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 sm:text-xs">
                      Bookmarks
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">
                      {profileUser?.bookmarksCount ?? savedPostsData.length ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Box & Stat Counters */}
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-extrabold text-slate-800">About</h3>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Mail size={15} className="text-slate-500" />
                    <span>{profileUser?.email || "No email"}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Users size={15} className="text-slate-500" />
                    <span>Active on Route Posts</span>
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-[#dbeafe] bg-[#f6faff] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1f4f96]">
                    My posts
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {myPostsData.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#dbeafe] bg-[#f6faff] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#1f4f96]">
                    Saved posts
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {savedPostsData.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profile Posts Tabs & Section */}
      <section className="space-y-4">
        {isOwnProfile && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="grid w-full grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1.5 sm:inline-flex sm:w-auto sm:gap-0">
              <button
                type="button"
                onClick={() => setActiveTab("posts")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition cursor-pointer ${
                  activeTab === "posts"
                    ? "bg-white text-[#1877f2] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText size={15} />
                <span>My Posts</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition cursor-pointer ${
                  activeTab === "saved"
                    ? "bg-white text-[#1877f2] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Bookmark size={15} />
                <span>Saved</span>
              </button>
            </div>

            <span className="rounded-full bg-[#e7f3ff] px-3 py-1 text-xs font-bold text-[#1877f2]">
              {displayedPosts.length}
            </span>
          </div>
        )}

        {/* Specialized Profile Post Cards matching demo */}
        <div className="space-y-3">
          {loadingPosts ? (
            <div className="space-y-3">
              <PostSkeleton />
              <PostSkeleton />
            </div>
          ) : displayedPosts.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              {activeTab === "posts" ? "You have not posted yet." : "No saved posts yet."}
            </p>
          ) : (
            displayedPosts.map((post) => (
              <article
                key={post._id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_6px_rgba(15,23,42,.05)] transition hover:shadow-sm"
              >
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <img
                        src={post.user?.photo || DEFAULT_PROFILE_IMAGE}
                        alt={post.user?.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {post.user?.name || profileUser?.name}
                        </p>
                        <p className="truncate text-xs font-semibold text-slate-500">
                          {post.user?.username ? `@${post.user.username}` : "@route"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-bold text-[#1877f2] transition hover:bg-[#e7f3ff] cursor-pointer"
                      onClick={() => navigate(`/posts/${post._id}`)}
                    >
                      View details
                    </button>
                  </div>

                  <div className="pt-3">
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
                      {post.body
                        ? renderWithMentions(post.body, (u) =>
                            navigate(`/suggestions?q=${u}`)
                          )
                        : "No text content"}
                    </p>
                  </div>
                </div>

                {post.image && (
                  <div className="border-y border-slate-200 bg-slate-950/95">
                    <button
                      type="button"
                      className="group relative flex w-full cursor-zoom-in items-center justify-center"
                      onClick={() => setPreviewImage(post.image)}
                    >
                      <img
                        src={post.image}
                        alt="post"
                        className="max-h-[560px] w-auto max-w-full object-contain"
                      />
                      <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <ThumbsUp size={14} className="text-[#1877f2]" />
                      <span>{post.likesCount ?? post.likes?.length ?? 0} likes</span>
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <Share2 size={14} className="text-[#1877f2]" />
                      <span>{post.sharesCount ?? 0} shares</span>
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <MessageCircle size={14} className="text-[#1877f2]" />
                      <span>
                        {post.commentsCount ?? post.comments?.length ?? 0} comments
                      </span>
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Clock size={13} />
                    <span>{formatTimeAgo(post.createdAt)}</span>
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Delete Cover Modal */}
      <ConfirmDialog
        open={deleteCoverModal}
        title="Remove cover photo?"
        description="Are you sure you want to remove your cover photo?"
        confirmLabel="Remove"
        confirmPendingLabel="Removing..."
        onConfirm={handleDeleteCover}
        onClose={() => setDeleteCoverModal(false)}
      />

      {previewImage && (
        <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </div>
  );
};
