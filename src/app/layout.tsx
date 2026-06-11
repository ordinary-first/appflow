import type { Metadata } from "next";
import "./globals.css";
import { MergeOnLogin } from "@/components/MergeOnLogin";

export const metadata: Metadata = {
  title: "Glim — Discover what was built today.",
  description:
    "Watch 15-second demos, try apps instantly, and leave feedback in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
        <MergeOnLogin />
      </body>
    </html>
  );
}
