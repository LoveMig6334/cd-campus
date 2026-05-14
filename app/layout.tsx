import type { Metadata } from "next";
import { preconnect } from "react-dom";
import { ibmPlexMono, ibmPlexThai, instrumentSerif } from "@/lib/fonts";
import { cn } from "@/lib/cn";
import "./globals.css";

export const metadata: Metadata = {
  title: "CD Smart Campus — Chitralada 2026",
  description: "Chitralada 2026 smart-campus prototype",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (SUPABASE_URL) preconnect(SUPABASE_URL);
  return (
    <html
      lang="th"
      className={cn(
        instrumentSerif.variable,
        ibmPlexThai.variable,
        ibmPlexMono.variable,
        "h-full antialiased",
      )}
    >
      <body className="bg-cream text-ink min-h-full font-sans">{children}</body>
    </html>
  );
}
