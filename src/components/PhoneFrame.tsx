"use client";

/** Cadre « téléphone » : plein écran sur mobile, centré et arrondi sur grand écran.
 *  `dark` : l'écran cabine reste sombre quel que soit le thème (conduite de nuit). */
export function PhoneFrame({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div className="min-h-screen bg-side sm:py-6">
      <div
        className={`mx-auto flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-bg text-ink sm:min-h-[calc(100vh-48px)] sm:rounded-[28px] sm:border sm:border-line-strong ${dark ? "dark" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
