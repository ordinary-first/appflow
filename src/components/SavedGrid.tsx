"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";

export type SavedCardData = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  thumbnailUrl: string | null;
};

/** Compact grid of saved apps — used by both the logged-in SSR path and the
 * anonymous-localStorage client path. */
export function SavedGrid({ apps }: { apps: SavedCardData[] }) {
  if (apps.length === 0) {
    return <EmptySaved />;
  }
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {apps.map((app) => (
        <SavedCard key={app.id} app={app} />
      ))}
    </div>
  );
}

function SavedCard({ app }: { app: SavedCardData }) {
  return (
    <Link
      href={`/app/${app.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-muted transition hover:border-foreground/40"
    >
      <div className="relative aspect-[4/5]">
        {app.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- thumbnails are external (R2 or maker-supplied)
          <img
            src={app.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted via-background to-muted" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full border border-border bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
          {app.category}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-1 text-sm font-semibold leading-tight">{app.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {app.tagline}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function EmptySaved({ hasAccount = false }: { hasAccount?: boolean }) {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 text-center">
      <Bookmark className="h-10 w-10 text-muted-foreground/60" />
      <p className="text-base font-medium">Nothing saved yet.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasAccount
          ? "Tap the bookmark icon on a card to keep it for later. Your saves sync across devices."
          : "Tap the bookmark icon on a card to keep it on this device. Sign in to sync across devices."}
      </p>
      <Link href="/" className="mt-2 text-sm underline">
        Back to the feed →
      </Link>
    </div>
  );
}
