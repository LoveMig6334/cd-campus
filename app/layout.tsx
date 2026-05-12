import type { Metadata } from "next";
import { ibmPlexMono, ibmPlexThai, instrumentSerif } from "@/lib/fonts";
import { cn } from "@/lib/cn";
import "./globals.css";

export const metadata: Metadata = {
  title: "CD Smart Campus — Chitralada 2026",
  description: "Chitralada 2026 smart-campus prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
      <body className="font-sans bg-cream text-ink min-h-full">{children}</body>
    </html>
  );
}
