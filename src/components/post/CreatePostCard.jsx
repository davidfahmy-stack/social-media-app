import React, { useState, useRef, useEffect } from "react";
import { Image, Globe, Users, Lock, X, Smile, Send } from "lucide-react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_PROFILE_IMAGE } from "../../config/constants";
import toast from "react-hot-toast";

const getMentionQuery = (text, cursor) => {
  const r = Math.max(0, Math.min(cursor, text.length));
  const l = text.slice(0, r);
  const u = l.match(/(?:^|[\s([{\-.,!?;:])@([a-zA-Z0-9_]*)$/);
  if (!u) return null;
  const c = l.lastIndexOf("@");
  return c < 0 ? null : { query: u[1] || "", start: c, end: r };
};

const applyMention = (text, mention, username) => {
  const l = text.slice(0, mention.start);
  const u = text.slice(mention.end);
  const c = `@${username} `;
  return { text: `${l}${c}${u}`, caret: l.length + c.length };
};

export const CreatePostCard = ({ onPostCreated }) => {
  const { me, request } = useAuth();
  const [body, setBody] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState(null);
  const [showMention, setShowMention] = useState(false);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Search users for mention autocomplete
  useEffect(() => {
    if (!showMention || !mentionQuery) return;
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await request({
          path: "/users/search",
          query: { q: mentionQuery.query, page: "1", limit: "6" },
        });
        setMentionUsers(res.data?.users || res.users || []);
        setActiveMentionIndex(0);
      } catch {
        setMentionUsers([]);
      } finally {
        setSearchingUsers(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [showMention, mentionQuery, request]);

  const handleTextChange = (e) => {
    const val = e.target.value.slice(0, 500);
    setBody(val);
    const cursor = e.target.selectionStart ?? val.length;
    const match = getMentionQuery(val, cursor);
    if (match) {
      setMentionQuery(match);
      setShowMention(true);
    } else {
      setShowMention(false);
      setMentionQuery(null);
    }
  };

  const handleKeyDown = (e) => {
    if (!showMention || mentionUsers.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveMentionIndex((prev) => (prev + 1) % mentionUsers.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveMentionIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const selected = mentionUsers[activeMentionIndex];
      if (selected?.username) handleSelectMention(selected.username);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setShowMention(false);
    }
  };

  const handleSelectMention = (username) => {
    if (!username || !mentionQuery) return;
    const next = applyMention(body, mentionQuery, username);
    setBody(next.text);
    setShowMention(false);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(next.caret, next.caret);
      }
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please choose a valid image file");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEmojiSelect = (emoji) => {
    const emojiChar = emoji.native || emoji;
    setBody((prev) => `${prev}${emojiChar}`);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim() && !imageFile) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (body.trim()) formData.set("body", body.trim().slice(0, 500));
      if (imageFile) formData.set("image", imageFile);
      formData.set("privacy", privacy);

      await request({
        path: "/posts",
        method: "POST",
        form: formData,
      });

      setBody("");
      removeImage();
      setShowEmojiPicker(false);
      setShowMention(false);
      setMentionQuery(null);
      if (onPostCreated) onPostCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setSubmitting(false);
    }
  };

  const firstName = me?.name ? me.name.split(" ")[0] : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="mb-3 flex items-start gap-3">
          <img
            src={me?.photo || DEFAULT_PROFILE_IMAGE}
            alt={me?.name || "user"}
            className="h-11 w-11 rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = DEFAULT_PROFILE_IMAGE;
            }}
          />
          <div className="flex-1">
            <p className="text-base font-extrabold text-slate-900">{me?.name || "You"}</p>
            <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {privacy === "public" ? (
                <Globe size={12} />
              ) : privacy === "following" ? (
                <Users size={12} />
              ) : (
                <Lock size={12} />
              )}
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                className="bg-transparent outline-none cursor-pointer"
              >
                <option value="public">Public</option>
                <option value="following">Followers</option>
                <option value="only_me">Only me</option>
              </select>
            </div>
          </div>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder={`What's on your mind, ${firstName}?`}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[17px] leading-relaxed text-slate-800 outline-none transition focus:border-[#1877f2] focus:bg-white"
          />

          {showMention && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {searchingUsers ? (
                <p className="px-3 py-2 text-sm font-semibold text-slate-500">Searching users...</p>
              ) : mentionUsers.length === 0 ? (
                <p className="px-3 py-2 text-sm font-semibold text-slate-500">No users found.</p>
              ) : (
                mentionUsers.map((user, idx) => (
                  <button
                    key={user._id}
                    type="button"
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                      activeMentionIndex === idx ? "bg-[#e7f3ff]" : "hover:bg-slate-50"
                    }`}
                    onClick={() => handleSelectMention(user.username)}
                  >
                    <img
                      src={user.photo || DEFAULT_PROFILE_IMAGE}
                      alt={user.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{user.name}</p>
                      <p className="truncate text-xs font-semibold text-[#1877f2]">
                        @{user.username || "user"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {imagePreview && (
          <div className="relative mt-2">
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-60 w-full rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white backdrop-blur-sm hover:bg-black/80 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="relative flex items-center gap-2" ref={emojiPickerRef}>
            {/* Photo / Video Button */}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">
              <Image size={18} className="text-emerald-600" />
              <span className="hidden sm:inline">Photo/video</span>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            {/* Feeling / Activity Button */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <Smile size={18} className="text-amber-500" />
              <span className="hidden sm:inline">Feeling/activity</span>
            </button>

            {/* Comprehensive Emoji Mart Picker matching demo */}
            {showEmojiPicker && (
              <div className="absolute left-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150">
                <Picker
                  data={data}
                  theme="light"
                  set="native"
                  previewPosition="none"
                  skinTonePosition="search"
                  navPosition="bottom"
                  perLine={8}
                  maxFrequentRows={2}
                  onEmojiSelect={handleEmojiSelect}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {body.length > 420 && (
              <span className="text-xs text-slate-500">{body.length}/500</span>
            )}
            <button
              type="submit"
              disabled={submitting || (!body.trim() && !imageFile)}
              className="flex items-center gap-2 rounded-lg bg-[#1877f2] px-5 py-2 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-[#166fe5] disabled:opacity-60 cursor-pointer"
            >
              <span>{submitting ? "Posting..." : "Post"}</span>
              <Send size={16} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
