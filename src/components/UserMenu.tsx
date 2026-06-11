"use client";

import { LogOut } from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

/**
 * Logged-in user chip + sign-out button.
 * - `overlay` variant: dark translucent pill for the home feed header
 *   (sits over the playing video). Compact — name is hidden.
 * - `inline` variant: regular pill for non-overlay pages like /dashboard.
 *
 * Renders nothing when there's no session, so it's safe to drop into any header.
 */
export function UserMenu({ variant = "inline" }: { variant?: "overlay" | "inline" }) {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const { name, image } = session.user;
  const initial = (name?.[0] ?? "?").toUpperCase();
  const overlay = variant === "overlay";

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={
          overlay
            ? "flex h-9 items-center gap-2 rounded-full border border-border bg-black/50 px-1.5 backdrop-blur"
            : "flex h-9 items-center gap-2 rounded-full border border-border bg-background px-1.5"
        }
        title={name}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar urls come from arbitrary OAuth providers
          <img src={image} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {initial}
          </span>
        )}
        {!overlay && (
          <span className="max-w-[140px] truncate pr-2 text-sm">{name}</span>
        )}
      </div>
      <button
        onClick={() => signOut()}
        aria-label="Sign out"
        title="Sign out"
        className={
          overlay
            ? "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/50 backdrop-blur transition hover:bg-muted cursor-pointer"
            : "flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm hover:bg-muted cursor-pointer"
        }
      >
        <LogOut className="h-4 w-4" />
        {!overlay && <span>Sign out</span>}
      </button>
    </div>
  );
}
