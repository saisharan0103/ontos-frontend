import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import FloatingChatbot from "@/components/FloatingChatbot";

export const metadata: Metadata = {
  title: "Ontos - EVON / Desert Cab | PE Deal Analysis",
  description: "PE deal analysis platform powered by ontological intelligence",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ontos-bg text-ontos-text font-sans antialiased">
        <AppShell>{children}</AppShell>
        <FloatingChatbot />
      </body>
    </html>
  );
}
