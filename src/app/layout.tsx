import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { SimProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Agent Ops Lab — simulation logistique",
  description: "Simulation d'un logiciel de transport piloté par un agent IA : dispatch, suivi en direct, détours et alertes chaîne du froid.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f5f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">
        <SimProvider>
          <AppShell>{children}</AppShell>
        </SimProvider>
      </body>
    </html>
  );
}
