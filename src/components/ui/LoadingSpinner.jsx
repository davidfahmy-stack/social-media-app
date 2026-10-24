import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingSpinner = ({ size = 24, className = "" }) => {
  return (
    <Loader2
      size={size}
      className={`animate-spin text-[#00298d] ${className}`}
    />
  );
};

export const PostSkeleton = () => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-200" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-32 rounded-sm bg-slate-200" />
          <div className="h-2.5 w-20 rounded-sm bg-slate-200" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full rounded-sm bg-slate-200" />
        <div className="h-3.5 w-3/4 rounded-sm bg-slate-200" />
      </div>
      <div className="h-48 w-full rounded-xl bg-slate-100" />
    </div>
  );
};
