"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({ open, onClose, children, width = 460, label }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number; label?: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#15151c]/30 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
        style={{ maxWidth: width }}
      >
        <button onClick={onClose} className="absolute right-4 top-4 grid size-7 place-items-center rounded-full text-muted hover:bg-[#f0f0f4]" aria-label="close">
          <X className="size-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
