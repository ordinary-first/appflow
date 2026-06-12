"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Bookmark, Plus, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TikTok-style bottom tab bar: Home / Saved / + / Inbox / Profile.
 * Overlays the feed (translucent over black); solid on regular pages.
 * Hidden on /try (immersion) and /submit (creation flow) — those pages
 * simply don't render it.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex items-stretch justify-around border-t border-border bg-black/85 backdrop-blur supports-[backdrop-filter]:bg-black/60"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Tab href="/" label="Home" active={pathname === "/"}>
        <Home className="h-6 w-6" />
      </Tab>
      <Tab href="/saved" label="Saved" active={pathname === "/saved"}>
        <Bookmark className="h-6 w-6" />
      </Tab>

      {/* Center: submit CTA — bigger, high-contrast, TikTok-plus style */}
      <Link
        href="/submit"
        aria-label="Submit your app"
        className="flex items-center justify-center px-4 py-2"
      >
        <span className="flex h-9 w-12 items-center justify-center rounded-xl bg-foreground text-background transition hover:opacity-90">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </span>
      </Link>

      <Tab
        href="/notifications"
        label="Inbox"
        active={pathname === "/notifications"}
      >
        <Bell className="h-6 w-6" />
      </Tab>
      <Tab href="/profile" label="Profile" active={pathname === "/profile"}>
        <User className="h-6 w-6" />
      </Tab>
    </nav>
  );
}

function Tab({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
