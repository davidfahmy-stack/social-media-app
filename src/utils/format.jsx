import React from "react";

export const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "just now";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "just now";
  
  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 0) return "just now";
  if (diffInSeconds < 60) return `${Math.max(1, diffInSeconds)}s`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo`;
  
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const renderWithMentions = (text, onMentionClick) => {
  if (!text) return null;
  const mentionRegex = /(^|[\s([{\-.,!?;:])(@[a-zA-Z0-9_]{2,30})/g;
  
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const prefix = match[1] || "";
    const mention = match[2] || "";
    const matchStart = match.index + prefix.length;

    if (matchStart > lastIndex) {
      elements.push(text.slice(lastIndex, matchStart));
    }

    if (prefix) {
      elements.push(prefix);
    }

    const username = mention.slice(1);
    if (onMentionClick) {
      elements.push(
        <button
          key={`mention-${match.index}`}
          type="button"
          className="inline font-bold text-[#1877f2] hover:underline cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onMentionClick(username);
          }}
        >
          {mention}
        </button>
      );
    } else {
      elements.push(
        <span key={`mention-${match.index}`} className="font-bold text-[#1877f2]">
          {mention}
        </span>
      );
    }

    lastIndex = matchStart + mention.length;
    if (fullMatch.length === 0) {
      mentionRegex.lastIndex++;
    }
  }

  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex));
  }

  return elements;
};
