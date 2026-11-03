"use client";

/** Cadre « téléphone » : plein écran sur mobile, centré et arrondi sur grand écran. */
export function PhoneFrame({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="min-h-screen bg-[#e7e7ee] sm:py-6">
      <div
        className={`mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden sm:min-h-[calc(100vh-48px)] sm:rounded-[36px] sm:border-[6px] sm:border-[#15151c] sm:shadow-2xl ${dark ? "bg-[#101015] text-white" : "bg-[var(--bg)]"}`}
      >
        {children}
      </div>
    </div>
  );
}
