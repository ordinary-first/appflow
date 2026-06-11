"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Bookmark, Share2, MessageSquare, Play } from "lucide-react";
import { track } from "@/lib/track";
import { youtubeVideoId, cn } from "@/lib/utils";
import type { FeedItem } from "@/lib/types";

/**
 * One full-viewport feed card: looping 15s demo (R2 mp4 preferred,
 * YouTube embed fallback), app info overlay, Try CTA, action rail.
 * Only the active card plays/loads media.
 */
export function AppCard({
  app,
  active,
  liked,
  saved,
  onLike,
  onSave,
  onShare,
  onFeedback,
  onVideoComplete,
}: {
  app: FeedItem;
  active: boolean;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onFeedback: () => void;
  onVideoComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const [muted, setMuted] = useState(true);

  // Play/pause with activation; record video_start once.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
      if (!startedRef.current) {
        startedRef.current = true;
        track(app.id, "video_start", undefined, { once: true });
      }
    } else {
      v.pause();
    }
  }, [active, app.id]);

  // Detect a full loop as "completed view" (loop swallows the ended event).
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || completedRef.current || !v.duration) return;
    if (v.currentTime >= v.duration - 0.35) {
      completedRef.current = true;
      track(app.id, "video_complete", undefined, { once: true });
      onVideoComplete();
    }
  };

  const ytId = !app.demoVideoUrl && app.youtubeUrl ? youtubeVideoId(app.youtubeUrl) : null;

  return (
    <section className="relative h-dvh w-full overflow-hidden bg-black">
      {/* ---- media ---- */}
      {app.demoVideoUrl ? (
        <video
          ref={videoRef}
          src={app.demoVideoUrl}
          poster={app.thumbnailUrl ?? undefined}
          className="absolute inset-0 h-full w-full object-contain"
          muted={muted}
          loop
          playsInline
          preload={active ? "auto" : "none"}
          onTimeUpdate={onTimeUpdate}
          onClick={() => setMuted((m) => !m)}
        />
      ) : ytId && active ? (
        // YouTube fallback: may show ads/branding — R2 mp4 is the preferred path.
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${ytId}&rel=0&modestbranding=1`}
          allow="autoplay; encrypted-media; picture-in-picture"
          title={app.name}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Play className="h-12 w-12 opacity-40" />
        </div>
      )}

      {/* ---- bottom gradient + info ---- */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 to-transparent" />
      <div className="absolute bottom-0 left-0 right-16 p-5 pb-7">
        <span className="inline-block rounded-full border border-border bg-black/50 px-2.5 py-0.5 text-xs text-muted-foreground">
          {app.category}
        </span>
        <Link href={`/app/${app.slug}`} className="mt-2 block">
          <h2 className="text-xl font-bold leading-tight">{app.name}</h2>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {app.tagline}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">by {app.makerName}</p>

        <Link
          href={`/try/${app.id}`}
          className="mt-4 inline-flex h-12 w-full max-w-xs items-center justify-center rounded-xl bg-foreground text-base font-semibold text-background transition hover:bg-foreground/90"
        >
          Try
        </Link>
      </div>

      {/* ---- right action rail ---- */}
      <div className="absolute bottom-24 right-3 flex flex-col items-center gap-5">
        <RailButton
          label={String(app.likes + (liked ? 1 : 0))}
          onClick={onLike}
          icon={
            <Heart
              className={cn("h-7 w-7", liked && "fill-red-500 text-red-500")}
            />
          }
        />
        <RailButton
          label={String(app.saves + (saved ? 1 : 0))}
          onClick={onSave}
          icon={
            <Bookmark
              className={cn("h-7 w-7", saved && "fill-yellow-400 text-yellow-400")}
            />
          }
        />
        <RailButton
          label={String(app.feedbackCount)}
          onClick={onFeedback}
          icon={<MessageSquare className="h-7 w-7" />}
        />
        <RailButton label="Share" onClick={onShare} icon={<Share2 className="h-7 w-7" />} />
      </div>
    </section>
  );
}

function RailButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 text-foreground/90 transition hover:text-foreground cursor-pointer"
    >
      <span className="rounded-full bg-black/40 p-2.5">{icon}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  );
}
