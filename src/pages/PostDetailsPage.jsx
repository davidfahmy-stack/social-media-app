import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PostCard } from "../components/post/PostCard";

export const PostDetailsPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { request, token } = useAuth();

  const {
    data: postData,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["posts", "single", token, postId],
    enabled: !!(token && postId),
    queryFn: async () => {
      const res = await request({ path: `/posts/${postId}` });
      return res.data?.post || res.post || null;
    },
  });

  const handleDeletePost = (id) => {
    queryClient.invalidateQueries({ queryKey: ["posts", "feed", token] });
    navigate("/feed");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Loading post...
        </div>
      ) : postData ? (
        <PostCard
          post={postData}
          initialCommentsOpen={true}
          onPostUpdated={() => refetch()}
          onPostDeleted={handleDeletePost}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Post not found.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {error instanceof Error ? error.message : "Failed to load post"}
        </div>
      )}
    </div>
  );
};
