import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Edit,
  Trash2,
  Globe,
  Users,
  Lock,
  Send,
  Image as ImageIcon,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PROFILE_IMAGE } from "../../config/constants";
import { formatTimeAgo, renderWithMentions } from "../../utils/format";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ImageModal } from "../ui/ImageModal";
import toast from "react-hot-toast";

const ActionButton = ({ label, disabled, active, icon, onClick }) => (
  <button
    type="button"
    className={`flex items-center justify-center gap-1.5 rounded-md p-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:text-sm cursor-pointer ${
      active ? "bg-[#e7f3ff] text-[#1877f2]" : "text-slate-600 hover:bg-slate-100"
    }`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export const PostCard = ({
  post,
  onPostUpdated,
  onPostDeleted,
  initialCommentsOpen = false,
  onViewDetails,
}) => {
  const { me, request } = useAuth();
  const navigate = useNavigate();

  const isPostOwner = Boolean(
    me?._id &&
      (post.user?._id || post.user) &&
      String(me._id) === String(post.user?._id || post.user)
  );
  const profileLink =
    post.user?._id && me?._id && String(post.user._id) === String(me._id)
      ? "/profile"
      : post.user?._id
      ? `/profile/${post.user._id}`
      : "/profile";

  // Menu & dropdown states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [privacyDropdownOpen, setPrivacyDropdownOpen] = useState(false);
  const [privacy, setPrivacy] = useState(post.privacy || "public");
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  // Modals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareComment, setShareComment] = useState("");
  const [sharing, setSharing] = useState(false);
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [likesList, setLikesList] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [likesNextPage, setLikesNextPage] = useState(null);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body || "");
  const [savingEdit, setSavingEdit] = useState(false);

  // Text expand / collapse
  const [isExpanded, setIsExpanded] = useState(false);

  // Likes & Bookmark state
  const initialLiked = Boolean(
    post.likes?.some((u) => (typeof u === "string" ? u === me?._id : u?._id === me?._id)) ||
    post.isLiked
  );
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? post.likes?.length ?? 0);
  const [liking, setLiking] = useState(false);

  const initialBookmarked = Boolean(post.bookmarked || post.isBookmarked);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [savingBookmark, setSavingBookmark] = useState(false);

  // Comments state
  const [commentsOpen, setCommentsOpen] = useState(initialCommentsOpen);
  const [comments, setComments] = useState(post.comments || []);
  const [commentsCount, setCommentsCount] = useState(
    post.commentsCount ?? post.comments?.filter((c) => !c.parentComment)?.length ?? 0
  );
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentSort, setCommentSort] = useState("relevant");
  const [newCommentText, setNewCommentText] = useState("");
  const [commentImageFile, setCommentImageFile] = useState(null);
  const [commentImagePreview, setCommentImagePreview] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);

  // Comment edit & reply state
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [replyingCommentId, setReplyingCommentId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyImageFile, setReplyImageFile] = useState(null);
  const [replyImagePreview, setReplyImagePreview] = useState(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [commentMenuOpenId, setCommentMenuOpenId] = useState(null);

  const dropdownRef = useRef(null);
  const privacyRef = useRef(null);
  const commentFileInputRef = useRef(null);
  const replyFileInputRef = useRef(null);
  const commentTextareaRef = useRef(null);

  useEffect(() => {
    setIsLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setIsBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  useEffect(() => {
    setEditBody(post.body || "");
    setIsEditing(false);
    setPrivacy(post.privacy || "public");
  }, [post._id, post.body, post.privacy]);

  // Click outside handlers
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (privacyRef.current && !privacyRef.current.contains(e.target)) {
        setPrivacyDropdownOpen(false);
      }
      if (!e.target.closest('[data-comment-menu-root="true"]')) {
        setCommentMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Top comment preview
  const topComment = useMemo(() => {
    if (comments.length > 0) return comments[0];
    return post.topComment || null;
  }, [comments, post.topComment]);

  // Special title for avatar/cover updates
  const postBody = isEditing ? editBody : post.body || "";
  const isSpecialUpdate =
    postBody.trim() === "updated profile picture."
      ? "profile"
      : postBody.trim() === "updated cover photo."
      ? "cover"
      : null;
  const specialText =
    isSpecialUpdate === "profile"
      ? "updated profile picture."
      : isSpecialUpdate === "cover"
      ? "updated cover photo."
      : "";

  const isLongText = postBody.length > 280;
  const displayedText = isLongText && !isExpanded ? `${postBody.slice(0, 280)}...` : postBody;

  // Sorting comments
  const sortedComments = useMemo(() => {
    const list = [...comments];
    if (commentSort === "newest") {
      return list.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
    return list;
  }, [comments, commentSort]);

  const fetchComments = async (page = 1) => {
    if (page === 1) setLoadingComments(true);
    else setLoadingMoreComments(true);

    try {
      const res = await request({
        path: `/posts/${post._id}/comments`,
        query: { limit: "10", page: String(page) },
      });
      const list = res.data?.comments || res.comments || [];
      const pagination = res.meta?.pagination;

      if (page === 1) {
        setComments(list);
      } else {
        setComments((prev) => [...prev, ...list]);
      }
      setCommentsCount(pagination?.total || list.length);
      setHasMoreComments(Boolean(pagination?.nextPage));
      setCommentPage(pagination?.nextPage || page);
    } catch {
      // ignore
    } finally {
      setLoadingComments(false);
      setLoadingMoreComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!commentsOpen && comments.length === 0) {
      fetchComments(1);
    }
    setCommentsOpen((prev) => !prev);
  };

  const handleLike = async () => {
    if (liking) return;
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));
    setLiking(true);

    try {
      await request({
        path: `/posts/${post._id}/like`,
        method: "PUT",
      });
    } catch {
      setIsLiked(!nextLiked);
      setLikesCount((prev) => (!nextLiked ? prev + 1 : Math.max(0, prev - 1)));
      toast.error("Failed to update like");
    } finally {
      setLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (savingBookmark) return;
    const nextBookmarked = !isBookmarked;
    setIsBookmarked(nextBookmarked);
    setSavingBookmark(true);

    try {
      await request({
        path: `/posts/${post._id}/bookmark`,
        method: "PUT",
      });
      toast.success(nextBookmarked ? "Post saved to bookmarks" : "Post removed from bookmarks");
    } catch {
      setIsBookmarked(!nextBookmarked);
      toast.error("Failed to bookmark post");
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleChangePrivacy = async (newPrivacy) => {
    setUpdatingPrivacy(true);
    setPrivacyDropdownOpen(false);
    try {
      await request({
        path: `/posts/${post._id}`,
        method: "PUT",
        body: { privacy: newPrivacy },
      });
      setPrivacy(newPrivacy);
      toast.success("Privacy updated");
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change privacy");
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editBody.trim()) return;
    setSavingEdit(true);
    try {
      await request({
        path: `/posts/${post._id}`,
        method: "PUT",
        body: { body: editBody.trim(), privacy },
      });
      setIsEditing(false);
      toast.success("Post updated");
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePost = async () => {
    setDeletingPost(true);
    try {
      await request({
        path: `/posts/${post._id}`,
        method: "DELETE",
      });
      toast.success("Post deleted");
      setDeleteModalOpen(false);
      if (onPostDeleted) onPostDeleted(post._id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setDeletingPost(false);
    }
  };

  const handleConfirmShare = async () => {
    setSharing(true);
    try {
      await request({
        path: `/posts/${post._id}/share`,
        method: "POST",
        body: shareComment.trim() ? { body: shareComment.trim() } : undefined,
      });
      toast.success("Post shared to your feed!");
      setShareModalOpen(false);
      setShareComment("");
      if (onPostUpdated) onPostUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to share post");
    } finally {
      setSharing(false);
    }
  };

  const fetchLikesList = async (page = 1) => {
    setLoadingLikes(true);
    try {
      const res = await request({
        path: `/posts/${post._id}/likes`,
        query: { page: String(page), limit: "20" },
      });
      const list = res.data?.likes || [];
      const nextPage = res.meta?.pagination?.nextPage ?? null;
      setLikesList((prev) => (page === 1 ? list : [...prev, ...list]));
      setLikesNextPage(nextPage);
    } catch {
      // ignore
    } finally {
      setLoadingLikes(false);
    }
  };

  const handleOpenLikesModal = () => {
    if (likesCount <= 0) return;
    setLikesModalOpen(true);
    fetchLikesList(1);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() && !commentImageFile) return;

    setSubmittingComment(true);
    try {
      if (commentImageFile) {
        const formData = new FormData();
        if (newCommentText.trim()) formData.set("content", newCommentText.trim());
        formData.set("image", commentImageFile);
        await request({
          path: `/posts/${post._id}/comments`,
          method: "POST",
          form: formData,
        });
      } else {
        await request({
          path: `/posts/${post._id}/comments`,
          method: "POST",
          body: { content: newCommentText.trim() },
        });
      }

      setNewCommentText("");
      setCommentImageFile(null);
      setCommentImagePreview(null);
      if (commentTextareaRef.current) commentTextareaRef.current.style.height = "40px";
      await fetchComments(1);
      setCommentsCount((prev) => prev + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveCommentEdit = async (commentId) => {
    if (!editingCommentText.trim()) return;
    try {
      await request({
        path: `/posts/${post._id}/comments/${commentId}`,
        method: "PUT",
        body: { content: editingCommentText.trim() },
      });
      setEditingCommentId(null);
      toast.success("Comment updated");
      await fetchComments(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update comment");
    }
  };

  const handleDeleteCommentConfirm = async () => {
    if (!deleteCommentId) return;
    setDeletingComment(true);
    try {
      await request({
        path: `/posts/${post._id}/comments/${deleteCommentId}`,
        method: "DELETE",
      });
      toast.success("Comment deleted");
      setDeleteCommentId(null);
      setComments((prev) => prev.filter((c) => c._id !== deleteCommentId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete comment");
    } finally {
      setDeletingComment(false);
    }
  };

  const handleAddReply = async (commentId) => {
    if (!replyText.trim() && !replyImageFile) return;
    setSubmittingReply(true);
    try {
      if (replyImageFile) {
        const formData = new FormData();
        if (replyText.trim()) formData.set("content", replyText.trim());
        formData.set("image", replyImageFile);
        await request({
          path: `/posts/${post._id}/comments/${commentId}/replies`,
          method: "POST",
          form: formData,
        });
      } else {
        await request({
          path: `/posts/${post._id}/comments/${commentId}/replies`,
          method: "POST",
          body: { content: replyText.trim() },
        });
      }
      toast.success("Reply added");
      setReplyText("");
      setReplyImageFile(null);
      setReplyImagePreview(null);
      setReplyingCommentId(null);
      await fetchComments(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <article className="overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        {/* Post Author Header */}
        <div className="flex items-center gap-3">
          <Link to={profileLink} className="shrink-0">
            <img
              src={post.user?.photo || DEFAULT_PROFILE_IMAGE}
              alt={post.user?.name}
              className="h-11 w-11 rounded-full object-cover"
              onError={(e) => {
                e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
              }}
            />
          </Link>
          <div className="min-w-0 flex-1">
            {isSpecialUpdate ? (
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <Link
                  to={profileLink}
                  className="font-extrabold text-slate-900 hover:underline"
                >
                  {post.user?.name}
                </Link>
                <span className="font-medium text-slate-500">{specialText}</span>
              </div>
            ) : (
              <Link
                to={profileLink}
                className="truncate text-sm font-bold text-slate-900 hover:underline block"
              >
                {post.user?.name || "Route user"}
              </Link>
            )}

            <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
              {!isSpecialUpdate && (
                <>
                  <span>
                    {post.user?.username ? `@${post.user.username}` : "route user"}
                  </span>
                  <span>·</span>
                </>
              )}
              <button
                type="button"
                className="rounded px-0.5 py-0.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 hover:underline cursor-pointer"
                onClick={() =>
                  onViewDetails ? onViewDetails(post._id) : navigate(`/posts/${post._id}`)
                }
              >
                {formatTimeAgo(post.createdAt)}
              </button>
              <span className="mx-0.5">·</span>

              {isPostOwner ? (
                <span ref={privacyRef} className="relative inline-flex items-center">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    onClick={() => setPrivacyDropdownOpen((prev) => !prev)}
                    disabled={updatingPrivacy}
                  >
                    {privacy === "following" ? (
                      <Users size={11} />
                    ) : privacy === "only_me" ? (
                      <Lock size={11} />
                    ) : (
                      <Globe size={11} />
                    )}
                    <span>
                      {privacy === "following"
                        ? "Followers"
                        : privacy === "only_me"
                        ? "Only me"
                        : "Public"}
                    </span>
                  </button>

                  {privacyDropdownOpen && (
                    <div className="absolute left-0 top-[calc(100%+6px)] z-30 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleChangePrivacy("public")}
                      >
                        <Globe size={13} />
                        <span>Public</span>
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleChangePrivacy("following")}
                      >
                        <Users size={13} />
                        <span>Followers</span>
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleChangePrivacy("only_me")}
                      >
                        <Lock size={13} />
                        <span>Only me</span>
                      </button>
                    </div>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  {privacy === "following" ? (
                    <Users size={11} />
                  ) : privacy === "only_me" ? (
                    <Lock size={11} />
                  ) : (
                    <Globe size={11} />
                  )}
                  <span>
                    {privacy === "following"
                      ? "Followers"
                      : privacy === "only_me"
                      ? "Only me"
                      : "Public"}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Options Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              onClick={() => setDropdownOpen((prev) => !prev)}
            >
              <MoreHorizontal size={18} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setDropdownOpen(false);
                    handleBookmark();
                  }}
                  disabled={savingBookmark}
                >
                  <Bookmark size={15} />
                  <span>
                    {savingBookmark
                      ? "Saving..."
                      : isBookmarked
                      ? "Unsave post"
                      : "Save post"}
                  </span>
                </button>

                {isPostOwner && !isEditing && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setDropdownOpen(false);
                      setEditBody(post.body || "");
                      setIsEditing(true);
                    }}
                  >
                    <Edit size={15} />
                    <span>Edit post</span>
                  </button>
                )}

                {isPostOwner && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                    onClick={() => {
                      setDropdownOpen(false);
                      setDeleteModalOpen(true);
                    }}
                    disabled={deletingPost}
                  >
                    <Trash2 size={15} />
                    <span>{deletingPost ? "Deleting..." : "Delete post"}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Post Text or Inline Edit Textarea */}
        {isEditing ? (
          <div className="mt-3">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              maxLength={5000}
              className="min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-[#1877f2]/20 focus:border-[#1877f2] focus:ring-2"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                onClick={() => {
                  setEditBody(post.body || "");
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-[#1877f2] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#166fe5] disabled:opacity-60 cursor-pointer"
                onClick={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : post.body && !isSpecialUpdate ? (
          <div className="mt-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
              {renderWithMentions(displayedText, (u) => navigate(`/suggestions?q=${u}`))}
            </p>
            {isLongText && (
              <button
                type="button"
                className="mt-1 text-sm font-bold text-[#1877f2] hover:underline cursor-pointer"
                onClick={() => setIsExpanded((prev) => !prev)}
              >
                {isExpanded ? "See less" : "See more"}
              </button>
            )}
          </div>
        ) : null}

        {/* Saved Badge */}
        {isBookmarked && (
          <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#e7f3ff] px-2.5 py-1 text-[11px] font-bold text-[#1877f2]">
            <Bookmark size={12} />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Post Image */}
      {post.image && (
        <div className="max-h-[620px] overflow-hidden border-y border-slate-200">
          <button
            type="button"
            className="group relative block w-full cursor-zoom-in"
            onClick={() => setPreviewImage(post.image)}
          >
            <img src={post.image} alt="post" className="w-full object-cover" />
            <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
          </button>
        </div>
      )}

      {/* Shared Post Container */}
      {(post.sharedPost || post.sharedPostUnavailable) && (
        <div className="mx-4 my-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {post.sharedPost ? (
            <>
              <div className="p-3">
                <div className="mb-2 flex items-center gap-2">
                  <img
                    src={post.sharedPost.user?.photo || DEFAULT_PROFILE_IMAGE}
                    alt={post.sharedPost.user?.name || "Shared user"}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {post.sharedPost.user?.name || "Unknown user"}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {post.sharedPost.user?.username
                        ? `@${post.sharedPost.user.username}`
                        : "Original post"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#1877f2] hover:bg-[#e7f3ff] cursor-pointer"
                    onClick={() => navigate(`/posts/${post.sharedPost._id}`)}
                  >
                    <span>Original Post</span>
                    <ExternalLink size={13} />
                  </button>
                </div>
                {post.sharedPost.body ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {renderWithMentions(post.sharedPost.body)}
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">Shared post content unavailable.</p>
                )}
              </div>
              {post.sharedPost.image && (
                <div className="border-t border-slate-200">
                  <img
                    src={post.sharedPost.image}
                    alt="Shared post media"
                    className="max-h-[300px] w-full object-cover"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="p-4 text-center text-sm font-medium text-slate-500">
              This shared post is no longer available.
            </div>
          )}
        </div>
      )}

      {/* Stats Counter Bar */}
      <div className="px-4 pb-2 pt-3 text-sm text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1877f2] text-white">
              <ThumbsUp size={12} />
            </span>
            <button
              type="button"
              className={`font-semibold transition ${
                likesCount > 0
                  ? "cursor-pointer hover:text-[#1877f2] hover:underline"
                  : "cursor-default"
              }`}
              onClick={handleOpenLikesModal}
            >
              {likesCount} likes
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            <span className="inline-flex items-center gap-1">
              <Share2 size={13} />
              {post.sharesCount ?? 0} shares
            </span>
            <span>{commentsCount} comments</span>
            {onViewDetails && (
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs font-bold text-[#1877f2] hover:bg-[#e7f3ff] cursor-pointer"
                onClick={() => onViewDetails(post._id)}
              >
                View details
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-200" />

      {/* Actions Grid */}
      <div className="grid grid-cols-3 gap-1 p-1">
        <ActionButton
          label={liking ? "Liking..." : "Like"}
          icon={<ThumbsUp size={18} fill={isLiked ? "currentColor" : "none"} />}
          active={isLiked}
          disabled={liking}
          onClick={handleLike}
        />
        <ActionButton
          label={loadingComments ? "Loading..." : "Comment"}
          icon={<MessageCircle size={18} />}
          disabled={loadingComments}
          onClick={handleToggleComments}
        />
        <ActionButton
          label={sharing ? "Sharing..." : "Share"}
          icon={<Share2 size={18} />}
          disabled={sharing}
          onClick={() => setShareModalOpen(true)}
        />
      </div>

      {/* Top Comment Preview Box (when comments are closed) */}
      {!commentsOpen && topComment && (
        <div className="mx-4 mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Top Comment
          </p>
          <div className="flex items-start gap-2">
            <img
              src={topComment.commentCreator?.photo || DEFAULT_PROFILE_IMAGE}
              alt={topComment.commentCreator?.name || "User"}
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2">
              <p className="truncate text-xs font-bold text-slate-900">
                {topComment.commentCreator?.name || "User"}
              </p>
              {topComment.content && (
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">
                  {renderWithMentions(topComment.content)}
                </p>
              )}
              {topComment.image && (
                <img
                  src={topComment.image}
                  alt="Top comment"
                  className="mt-2 max-h-44 w-full rounded-lg object-cover"
                />
              )}
            </div>
          </div>
          <button
            type="button"
            className="mt-2 text-xs font-bold text-[#1877f2] hover:underline cursor-pointer"
            onClick={handleToggleComments}
          >
            View all comments
          </button>
        </div>
      )}

      {/* Expanded Comments Thread */}
      {commentsOpen && (
        <div className="border-t border-slate-200 bg-[#f7f8fa] px-4 py-4">
          {/* Comments Sort Header */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-extrabold tracking-wide text-slate-700">Comments</p>
              <span className="rounded-full bg-[#e7f3ff] px-2 py-0.5 text-[11px] font-bold text-[#1877f2]">
                {commentsCount}
              </span>
            </div>

            <select
              value={commentSort}
              onChange={(e) => setCommentSort(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none ring-[#1877f2]/20 focus:border-[#1877f2] focus:bg-white focus:ring-2 cursor-pointer"
            >
              <option value="relevant">Most relevant</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {/* Comments List */}
          <div className="space-y-2">
            {loadingComments ? (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-4 text-center text-sm text-slate-500">
                Loading comments...
              </div>
            ) : sortedComments.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center">
                <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#eef3ff] text-[#1877f2]">
                  <MessageCircle size={22} />
                </div>
                <p className="text-lg font-extrabold text-slate-800">No comments yet</p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Be the first to comment.
                </p>
              </div>
            ) : (
              sortedComments.map((comment) => {
                const commentUser = comment.commentCreator || comment.user || {};
                const isCommentOwner = Boolean(
                  me?._id &&
                    (commentUser._id || commentUser) &&
                    String(me._id) === String(commentUser._id || commentUser)
                );
                const hasReplies = comment.replies && comment.replies.length > 0;

                return (
                  <div key={comment._id} className="relative flex items-start gap-2">
                    <Link
                      to={
                        commentUser._id === me?._id
                          ? "/profile"
                          : `/profile/${commentUser._id}`
                      }
                    >
                      <img
                        src={commentUser.photo || DEFAULT_PROFILE_IMAGE}
                        alt={commentUser.name}
                        className="mt-0.5 h-8 w-8 rounded-full object-cover"
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      {editingCommentId === comment._id ? (
                        <div className="rounded-2xl bg-white p-2 border border-slate-200">
                          <input
                            type="text"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            className="w-full text-xs text-slate-800 outline-none"
                            autoFocus
                          />
                          <div className="mt-2 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              className="rounded px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
                              onClick={() => setEditingCommentId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="rounded bg-[#1877f2] px-2 py-0.5 text-xs font-bold text-white hover:bg-[#166fe5]"
                              onClick={() => handleSaveCommentEdit(comment._id)}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative inline-block max-w-full rounded-2xl bg-[#f0f2f5] px-3 py-2">
                          <p className="text-xs font-bold text-slate-900">
                            {commentUser.name || "User"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {commentUser.username
                              ? `@${commentUser.username}`
                              : "member"}{" "}
                            · {formatTimeAgo(comment.createdAt)}
                          </p>
                          {comment.content && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                              {renderWithMentions(comment.content, (u) =>
                                navigate(`/suggestions?q=${u}`)
                              )}
                            </p>
                          )}
                          {comment.image && (
                            <img
                              src={comment.image}
                              alt="Comment media"
                              className="mt-2 max-h-52 w-full rounded-lg object-cover cursor-pointer"
                              onClick={() => setPreviewImage(comment.image)}
                            />
                          )}
                        </div>
                      )}

                      <div className="mt-1.5 flex items-center justify-between px-1">
                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                          <span>{formatTimeAgo(comment.createdAt)}</span>
                          <button
                            type="button"
                            className="hover:text-[#1877f2] hover:underline cursor-pointer"
                            onClick={async () => {
                              try {
                                await request({
                                  path: `/posts/${post._id}/comments/${comment._id}/like`,
                                  method: "PUT",
                                });
                                await fetchComments(1);
                              } catch {
                                // ignore
                              }
                            }}
                          >
                            Like {comment.likesCount ? `(${comment.likesCount})` : ""}
                          </button>
                          <button
                            type="button"
                            className="hover:text-[#1877f2] hover:underline cursor-pointer"
                            onClick={() =>
                              setReplyingCommentId(
                                replyingCommentId === comment._id ? null : comment._id
                              )
                            }
                          >
                            Reply {comment.replies?.length ? `(${comment.replies.length})` : ""}
                          </button>
                        </div>

                        {isCommentOwner && (
                          <div className="relative" data-comment-menu-root="true">
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-600"
                              onClick={() =>
                                setCommentMenuOpenId(
                                  commentMenuOpenId === comment._id ? null : comment._id
                                )
                              }
                            >
                              <MoreHorizontal size={14} />
                            </button>
                            {commentMenuOpenId === comment._id && (
                              <div className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                  onClick={() => {
                                    setCommentMenuOpenId(null);
                                    setEditingCommentId(comment._id);
                                    setEditingCommentText(comment.content || "");
                                  }}
                                >
                                  <Edit size={12} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[11px] font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  onClick={() => {
                                    setCommentMenuOpenId(null);
                                    setDeleteCommentId(comment._id);
                                  }}
                                >
                                  <Trash2 size={12} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reply Input Form */}
                      {replyingCommentId === comment._id && (
                        <div className="mt-2" data-reply-tools-root="true">
                          <p className="mb-1 text-[11px] font-semibold text-slate-500">
                            Replying to {commentUser?.name || "user"}
                          </p>
                          <div className="flex items-start gap-2">
                            <img
                              src={me?.photo || DEFAULT_PROFILE_IMAGE}
                              alt={me?.name || "You"}
                              className="mt-0.5 h-7 w-7 rounded-full object-cover"
                            />
                            <div className="w-full rounded-2xl border border-slate-200 bg-[#f0f2f5] px-2.5 py-1.5 focus-within:border-[#c7dafc] focus-within:bg-white">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddReply(comment._id);
                                  }
                                }}
                                rows={1}
                                placeholder="Write a reply..."
                                className="max-h-[120px] min-h-[38px] w-full resize-none bg-transparent px-2 py-1 text-xs leading-5 outline-none placeholder:text-slate-500"
                              />

                              {replyImagePreview && (
                                <div className="relative mt-1.5">
                                  <img
                                    src={replyImagePreview}
                                    alt="Reply preview"
                                    className="max-h-40 w-full rounded-md object-cover"
                                  />
                                  <button
                                    type="button"
                                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white cursor-pointer"
                                    onClick={() => {
                                      setReplyImageFile(null);
                                      setReplyImagePreview(null);
                                    }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}

                              <div className="mt-1 flex items-center justify-between">
                                <label className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-emerald-600">
                                  <ImageIcon size={14} />
                                  <input
                                    type="file"
                                    ref={replyFileInputRef}
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setReplyImageFile(file);
                                        const reader = new FileReader();
                                        reader.onloadend = () =>
                                          setReplyImagePreview(reader.result);
                                        reader.readAsDataURL(file);
                                      }
                                      e.currentTarget.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  disabled={
                                    submittingReply || (!replyText.trim() && !replyImageFile)
                                  }
                                  onClick={() => handleAddReply(comment._id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1877f2] text-white shadow-sm transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:bg-[#9ec5ff] disabled:opacity-100 cursor-pointer"
                                >
                                  {submittingReply ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  ) : (
                                    <Send size={14} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Replies List */}
                      {hasReplies && (
                        <div className="mt-2 space-y-2 pl-3">
                          {comment.replies.map((reply) => {
                            const replyUser = reply.user || {};
                            return (
                              <div key={reply._id} className="relative flex items-start gap-2">
                                <img
                                  src={replyUser.photo || DEFAULT_PROFILE_IMAGE}
                                  alt="Reply user"
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                                <div className="inline-block max-w-full rounded-2xl bg-[#f0f2f5] px-2.5 py-2">
                                  <p className="text-[11px] font-bold text-slate-900">
                                    {replyUser.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {formatTimeAgo(reply.createdAt)}
                                  </p>
                                  <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-700">
                                    {reply.content}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {!loadingComments && sortedComments.length > 0 && hasMoreComments && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 cursor-pointer"
                  onClick={() => fetchComments(commentPage)}
                  disabled={loadingMoreComments}
                >
                  {loadingMoreComments ? "Loading..." : "View more comments"}
                </button>
              </div>
            )}
          </div>

          {/* Bottom Comment Input Form */}
          <div className="mt-3">
            <div className="flex items-start gap-2">
              <img
                src={me?.photo || DEFAULT_PROFILE_IMAGE}
                alt={me?.name || "You"}
                className="h-9 w-9 rounded-full object-cover"
              />
              <div className="w-full rounded-2xl border border-slate-200 bg-[#f0f2f5] px-2.5 py-1.5 focus-within:border-[#c7dafc] focus-within:bg-white">
                <textarea
                  ref={commentTextareaRef}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment(e);
                    }
                  }}
                  onInput={(e) => {
                    e.currentTarget.style.height = "40px";
                    e.currentTarget.style.height = `${Math.min(
                      140,
                      e.currentTarget.scrollHeight
                    )}px`;
                  }}
                  placeholder={`Comment as ${me?.name || "you"}...`}
                  rows={1}
                  className="max-h-[140px] min-h-[40px] w-full resize-none bg-transparent px-2 py-1 text-xs leading-5 outline-none placeholder:text-slate-500"
                />

                {commentImagePreview && (
                  <div className="relative mt-1.5 inline-block">
                    <img
                      src={commentImagePreview}
                      alt="Attachment"
                      className="max-h-36 w-full rounded-md object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white cursor-pointer"
                      onClick={() => {
                        setCommentImageFile(null);
                        setCommentImagePreview(null);
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <div className="mt-1 flex items-center justify-between">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-full p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-emerald-600">
                    <ImageIcon size={15} />
                    <input
                      type="file"
                      ref={commentFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCommentImageFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setCommentImagePreview(reader.result);
                          reader.readAsDataURL(file);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    disabled={
                      submittingComment || (!newCommentText.trim() && !commentImageFile)
                    }
                    onClick={handleAddComment}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1877f2] text-white shadow-sm transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:bg-[#9ec5ff] disabled:opacity-100 cursor-pointer"
                  >
                    {submittingComment ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send size={14} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal Dialog */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/65 p-4"
          onClick={() => {
            if (!sharing) setShareModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h4 className="text-base font-extrabold text-slate-900">Share post</h4>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-60 cursor-pointer"
                onClick={() => setShareModalOpen(false)}
                disabled={sharing}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <textarea
                value={shareComment}
                onChange={(e) => setShareComment(e.target.value)}
                placeholder="Say something about this..."
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/20"
              />
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <img
                    src={post.user?.photo || DEFAULT_PROFILE_IMAGE}
                    alt={post.user?.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {post.user?.name || "User"}
                    </p>
                    <p className="truncate text-xs font-semibold text-slate-500">
                      {post.user?.username ? `@${post.user.username}` : "@route"}
                    </p>
                  </div>
                </div>
                {post.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                    {renderWithMentions(post.body)}
                  </p>
                )}
                {post.image && (
                  <img
                    src={post.image}
                    alt="post preview"
                    className="mt-2 max-h-[220px] w-full rounded-lg object-cover"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 cursor-pointer"
                onClick={() => setShareModalOpen(false)}
                disabled={sharing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#1877f2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#166fe5] disabled:opacity-60 cursor-pointer"
                onClick={handleConfirmShare}
                disabled={sharing}
              >
                {sharing ? "Sharing..." : "Share now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* People Who Reacted (Likes) Modal */}
      {likesModalOpen && (
        <div
          className="fixed inset-0 z-[71] flex items-center justify-center bg-slate-900/65 p-4"
          onClick={() => {
            if (!loadingLikes) setLikesModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-[520px] rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-[#1877f2]" />
                <h4 className="text-base font-extrabold text-slate-900">
                  People who reacted
                </h4>
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                onClick={() => setLikesModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto px-2 py-2">
              {loadingLikes && likesList.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                  Loading likes...
                </div>
              ) : likesList.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm font-semibold text-slate-500">
                  No likes yet.
                </div>
              ) : (
                <div className="space-y-1">
                  {likesList.map((user) => (
                    <Link
                      key={user._id}
                      to={`/profile/${user._id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-100"
                      onClick={() => setLikesModalOpen(false)}
                    >
                      <img
                        src={user.photo || DEFAULT_PROFILE_IMAGE}
                        alt={user.name || "User"}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {user.name || "User"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {user.username ? `@${user.username}` : "@route-user"}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {likesNextPage && (
              <div className="border-t border-slate-200 px-4 py-3">
                <button
                  type="button"
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                  onClick={() => fetchLikesList(likesNextPage)}
                  disabled={loadingLikes}
                >
                  {loadingLikes ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Post Confirm Dialog */}
      <ConfirmDialog
        open={deleteModalOpen}
        title="Delete this post?"
        description="This post will be permanently removed from your profile and feed."
        confirmLabel="Delete post"
        confirmPendingLabel="Deleting post..."
        confirming={deletingPost}
        onConfirm={handleDeletePost}
        onClose={() => setDeleteModalOpen(false)}
      />

      {/* Delete Comment Confirm Dialog */}
      <ConfirmDialog
        open={Boolean(deleteCommentId)}
        title="Delete this comment?"
        description="This comment will be permanently removed."
        confirmLabel="Delete comment"
        confirmPendingLabel="Deleting comment..."
        confirming={deletingComment}
        onConfirm={handleDeleteCommentConfirm}
        onClose={() => setDeleteCommentId(null)}
      />

      {/* Image Preview Lightbox */}
      {previewImage && (
        <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
      )}
    </article>
  );
};
