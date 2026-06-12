"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Bookmark, Share2, MessageSquare, Play, Plus, Check, ExternalLink } from "lucide-react";
import { track } from "@/lib/track";
import { youtubeVideoId, cn } from "@/lib/utils";
import { getTryTargets } from "@/lib/try-target";
import { TryLink } from "@/components/TryLink";
import type { FeedItem } from "@/lib/types";

/**
 * One full-viewport feed card: looping 15s demo (R2 mp4 preferred,
 * YouTube embed fallback) or screenshot slideshow, app info overlay,
 * Try CTA, action rail. Only the active card plays; only near cards
 * (active ± 1) mount a <video> at all — the rest show the poster, so a
 * 30-card feed doesn't hold 30 video decoders alive on a phone.
 */
export function AppCard({
  app,
  active,
  near,
  liked,
  saved,
  followed,
  onLike,
  onSave,
  onFollow,
  onShare,
  onComments,
  onVideoComplete,
}: {
  app: FeedItem;
  active: boolean;
  near: boolean;
  liked: boolean;
  saved: boolean;
  followed: boolean;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onShare: () => void;
  onComments: () => void;
  onVideoComplete: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const [muted, setMuted] = useState(true);
  // Center CTA goes from subtle to solid once the demo has been fully seen —
  // the moment the viewer has enough context to decide.
  const [ctaBoost, setCtaBoost] = useState(false);

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
      setCtaBoost(true);
      onVideoComplete();
    }
  };

  // Single source of truth for the Try action (platform × embeddable).
  const tryTargets = getTryTargets(app);
  const primaryTarget = tryTargets[0];

  const ytId = !app.demoVideoUrl && app.youtubeUrl ? youtubeVideoId(app.youtubeUrl) : null;
  const isSlideshow =
    app.mediaType === "images" && (app.imageUrls?.length ?? 0) > 0;

  return (
    <section className="relative h-dvh w-full overflow-hidden bg-black">
      {/* ---- media ---- */}
      {app.demoVideoUrl ? (
        near ? (
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
        ) : app.thumbnailUrl ? (
          // Far-away card: poster only — releases the video decoder/buffers.
          // eslint-disable-next-line @next/next/no-img-element -- R2/maker media
          <img
            src={app.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Play className="h-12 w-12 opacity-40" />
          </div>
        )
      ) : ytId && active ? (
        // YouTube fallback: may show ads/branding — R2 mp4 is the preferred path.
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${ytId}&rel=0&modestbranding=1`}
          allow="autoplay; encrypted-media; picture-in-picture"
          title={app.name}
        />
      ) : isSlideshow ? (
        <ImageSlideshow
          images={app.imageUrls!}
          captions={app.imageCaptions}
          alt={app.name}
          active={active}
          onViewedAll={() => {
            if (!completedRef.current) {
              completedRef.current = true;
              track(app.id, "video_complete", undefined, { once: true });
              setCtaBoost(true);
              onVideoComplete();
            }
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <Play className="h-12 w-12 opacity-40" />
        </div>
      )}

      {/* ---- top gradient: keeps the header/tabs legible on bright media ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />

      {/* ---- center Try CTA: subtle while watching, solid once the demo
           has been fully seen (the decision moment) ---- */}
      <div className="pointer-events-none absolute inset-x-0 top-[58%] flex justify-center">
        <TryLink
          appId={app.id}
          target={primaryTarget}
          className={cn(
            "pointer-events-auto inline-flex h-11 items-center justify-center gap-1.5 rounded-full px-6 text-sm font-semibold backdrop-blur-md transition-all duration-500",
            ctaBoost
              ? "scale-105 bg-white text-black shadow-lg shadow-black/30"
              : "border border-white/40 bg-white/15 text-white"
          )}
        >
          {primaryTarget.external && <ExternalLink className="h-4 w-4" />}
          {app.platform === "web" ? "Try it now →" : primaryTarget.label}
        </TryLink>
      </div>

      {/* ---- bottom gradient + info ---- */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      {/* pb-20 keeps the Try button clear of the fixed bottom nav */}
      <div className="absolute bottom-0 left-0 right-16 p-5 pb-20">
        <span className="inline-block rounded-full border border-white/15 bg-black/50 px-2.5 py-0.5 text-xs text-white/80">
          {app.category}
        </span>
        <Link href={`/app/${app.slug}`} className="mt-2 block">
          <h2 className="text-xl font-bold leading-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
            {app.name}
          </h2>
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
          {app.tagline}
        </p>
        <p className="mt-1 text-xs text-white/60 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
          by {app.makerName}
          {app.tryCount > 0 && <> · {app.tryCount} tried</>}
          {app.feedbackCount > 0 && <> · {app.feedbackCount} feedback</>}
        </p>

        <div className="mt-4 flex w-full max-w-xs gap-2">
          {tryTargets.map((target) => (
            <TryLink
              key={target.href}
              appId={app.id}
              target={target}
              className="inline-flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-foreground text-sm font-semibold text-background transition hover:bg-foreground/90"
            >
              {target.external && <ExternalLink className="h-4 w-4" />}
              {app.platform === "web" ? "Try" : target.label}
            </TryLink>
          ))}
        </div>
      </div>

      {/* ---- right action rail (TikTok-minimal: bare icons, no chrome) ---- */}
      <div className="absolute bottom-36 right-3 flex flex-col items-center gap-4">
        {/* App avatar + follow toggle (TikTok-style: avatar with a + badge) */}
        <div className="relative mb-1">
          <Link
            href={`/app/${app.slug}`}
            aria-label={`${app.name} page`}
            className="block h-11 w-11 overflow-hidden rounded-full border-2 border-white/80 bg-muted"
          >
            {app.iconUrl || app.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- R2/maker media
              <img
                src={app.iconUrl ?? app.thumbnailUrl ?? ""}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-bold">
                {app.name[0]?.toUpperCase()}
              </span>
            )}
          </Link>
          <button
            onClick={onFollow}
            aria-label={followed ? "Unfollow" : "Follow"}
            className={cn(
              "absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full transition cursor-pointer",
              followed ? "bg-muted text-foreground" : "bg-red-500 text-white"
            )}
          >
            {followed ? (
              <Check className="h-3 w-3" strokeWidth={3} />
            ) : (
              <Plus className="h-3 w-3" strokeWidth={3} />
            )}
          </button>
        </div>
        {/* Server count already includes my own like/save (SSR flags) — the
            optimistic delta only applies relative to that initial state. */}
        <RailButton
          label={String(app.likes + (liked ? 1 : 0) - (app.likedByMe ? 1 : 0))}
          onClick={onLike}
          icon={
            <Heart
              className={cn("h-6 w-6", liked && "fill-red-500 text-red-500")}
            />
          }
        />
        <RailButton
          label={String(app.saves + (saved ? 1 : 0) - (app.savedByMe ? 1 : 0))}
          onClick={onSave}
          icon={
            <Bookmark
              className={cn("h-6 w-6", saved && "fill-yellow-400 text-yellow-400")}
            />
          }
        />
        <RailButton
          label={String(app.commentCount)}
          onClick={onComments}
          icon={<MessageSquare className="h-6 w-6" />}
        />
        <RailButton label="Share" onClick={onShare} icon={<Share2 className="h-6 w-6" />} />
      </div>
    </section>
  );
}

/**
 * TikTok-photo-mode style slideshow: horizontal swipe (scroll-snap) plus
 * tap left/right thirds to navigate. Progress bars at the top. Calls
 * onViewedAll once every slide has been seen.
 */
function ImageSlideshow({
  images,
  captions,
  alt,
  active,
  onViewedAll,
}: {
  images: string[];
  captions?: string[] | null;
  alt: string;
  active: boolean;
  onViewedAll: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const seenRef = useRef<Set<number>>(new Set([0]));
  const firedRef = useRef(false);

  const markSeen = (i: number) => {
    setIndex(i);
    seenRef.current.add(i);
    if (!firedRef.current && seenRef.current.size >= images.length) {
      firedRef.current = true;
      onViewedAll();
    }
  };

  const goTo = (i: number) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(images.length - 1, i));
    // Instant jump: smooth scrollTo() gets cancelled by snap-mandatory in
    // Chromium (the snap pulls it back to the current slide). Direct
    // assignment lands exactly on the target snap point. State is updated
    // here too, so tap navigation never depends on scroll events.
    el.scrollLeft = clamped * el.clientWidth;
    markSeen(clamped);
  };

  // Handles user swipes (touch/trackpad); taps already update state in goTo.
  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) markSeen(i);
  };

  // Single image counts as fully viewed immediately when the card activates.
  useEffect(() => {
    if (active && images.length === 1 && !firedRef.current) {
      firedRef.current = true;
      onViewedAll();
    }
  }, [active, images.length, onViewedAll]);

  return (
    <div className="absolute inset-0">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scrollbar-none"
        style={{ scrollbarWidth: "none" }}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="flex h-full w-full flex-none snap-center items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- R2/maker-supplied media */}
            <img
              src={src}
              alt={`${alt} — ${i + 1}/${images.length}`}
              className="h-full w-full object-contain"
              loading={active || i === 0 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* tap zones: left third = prev, right third = next */}
      {images.length > 1 && (
        <>
          <button
            aria-label="Previous image"
            className="absolute inset-y-0 left-0 w-1/3"
            onClick={() => goTo(index - 1)}
          />
          <button
            aria-label="Next image"
            className="absolute inset-y-0 right-0 w-1/3"
            onClick={() => goTo(index + 1)}
          />
          {/* progress bars (TikTok photo-mode style) */}
          <div className="pointer-events-none absolute inset-x-4 top-3 z-10 flex gap-1.5">
            {images.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors",
                  i === index ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* per-slide feature caption: every swipe names the feature it shows */}
      {captions?.[index] && (
        <div className="pointer-events-none absolute inset-x-6 top-8 z-10 flex justify-center">
          <span className="max-w-full rounded-full bg-black/60 px-4 py-1.5 text-center text-sm font-medium text-white backdrop-blur">
            {captions[index]}
          </span>
        </div>
      )}
    </div>
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
  // Bare icons on a drop shadow (no pill chrome) — TikTok-style minimal rail.
  // p-1.5 keeps the touch target ~36px despite the smaller visual footprint.
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 text-white transition hover:opacity-80 cursor-pointer"
    >
      <span className="p-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">{icon}</span>
      <span className="text-[11px] font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        {label}
      </span>
    </button>
  );
}
