import type { Metadata, Viewport } from "next";
import "@/styles/atelier-brand/atelier-brand.css";
import "./globals.css";
import { SimProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { ThemeScript } from "@/components/theme/ThemeScript";

export const metadata: Metadata = {
  title: "Atelier Ops Lab — simulation logistique",
  description: "Simulation d'un logiciel de transport piloté par un agent IA : dispatch, suivi en direct, détours et alertes chaîne du froid.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" data-atelier-app="ops" suppressHydrationWarning className="h-full antialiased">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full">
        <SimProvider>
          <AppShell>{children}</AppShell>
        </SimProvider>
      </body>
    </html>
  );
}
