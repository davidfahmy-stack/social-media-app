import React from "react";
import { X, AlertTriangle } from "lucide-react";

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Delete",
  confirmPendingLabel = "Deleting...",
  cancelLabel = "Cancel",
  confirming = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4"
      onClick={() => {
        if (!confirming) onClose();
      }}
    >
      <div
        className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h4 className="text-base font-extrabold text-slate-900">Confirm action</h4>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            disabled={confirming}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h5 className="text-sm font-extrabold text-slate-900">{title}</h5>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onClose}
            disabled={confirming}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? confirmPendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
