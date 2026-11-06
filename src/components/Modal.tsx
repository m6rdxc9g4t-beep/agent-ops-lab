"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useSim } from "@/lib/store";

export function Modal({ open, onClose, children, width = 460, label }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number; label?: string }) {
  const { t } = useSim();
  const closeLabel = t("common.close");
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[rgb(10_11_13/0.45)] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-card p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-pop sm:rounded-2xl sm:pb-5"
        style={{ maxWidth: width }}
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 grid size-7 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink" aria-label={closeLabel}>
          <X className="size-4" aria-hidden />
        </button>
        {children}
      </div>
    </div>
  );
}
