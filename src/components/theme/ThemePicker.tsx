"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useSim } from "@/lib/store";
import { THEME_MODES, themeStore, type ThemeMode } from "./theme";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * Choix Système / Clair / Sombre : préférence commune à la suite Atelier
 * (cookie atelier_theme sur le VPS, sinon cet appareil).
 * `compact` : icônes seules (pied de la barre latérale).
 */
export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { t } = useSim();
  const mode = useSyncExternalStore(themeStore.subscribe, themeStore.pref, () => "system" as ThemeMode);
  return (
    <div role="group" aria-label={t("theme.label")} className="seg">
      {THEME_MODES.map((m) => {
        const Icon = ICONS[m];
        const label = t(`theme.${m}`);
        return (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
            onClick={() => window.atelierTheme?.set(m)}
            className={compact ? "w-7 justify-center px-0" : ""}
          >
            <Icon className="size-3.5" aria-hidden strokeWidth={1.75} />
            {!compact && label}
          </button>
        );
      })}
    </div>
  );
}
