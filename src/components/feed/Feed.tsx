"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, LayoutDashboard, Bookmark } from "lucide-react";
import { AppCard } from "./AppCard";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Dialog } from "@/components/ui/dialog";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { UserMenu } from "@/components/UserMenu";
import { useSession } from "@/lib/auth-client";
import { track } from "@/lib/track";
import type { FeedItem } from "@/lib/types";

const LIKES_KEY = "glim_likes";
const SAVES_KEY = "glim_saves";
const NUDGE_KEY = "glim_nudge_dismissed";

function loadSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]));
}

export function Feed({ apps }: { apps: FeedItem[] }) {
  const { data: session } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [feedbackApp, setFeedbackApp] = useState<{ id: string; name: string } | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const completedRef = useRef<Set<string>>(new Set());
  const impressionsRef = useRef<Set<string>>(new Set());
  const prevActiveRef = useRef(0);

  useEffect(() => {
    setLiked(loadSet(LIKES_KEY));
    setSaved(loadSet(SAVES_KEY));
  }, []);

  // Returning from Try view (?feedback=appId) → open the feedback modal immediately.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("feedback");
    if (id) {
      const app = apps.find((a) => a.id === id);
      if (app) setFeedbackApp({ id: app.id, name: app.name });
      window.history.replaceState({}, "", "/");
    }
  }, [apps]);

  // Track which card fills the viewport; record impressions + skips.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cards = Array.from(container.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < 0.6) continue;
          const idx = cards.indexOf(entry.target as HTMLElement);
          if (idx < 0) continue;
          setActiveIndex((prev) => {
            if (idx !== prev) {
              // Leaving a card before its video completed = skip signal.
              const prevApp = apps[prev];
              if (prevApp && !completedRef.current.has(prevApp.id)) {
                track(prevApp.id, "skip", undefined, { once: true });
              }
            }
            return idx;
          });
          const app = apps[idx];
          if (app && !impressionsRef.current.has(app.id)) {
            impressionsRef.current.add(app.id);
            track(app.id, "impression", undefined, { once: true });
          }
        }
      },
      { root: container, threshold: [0.6] }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [apps]);

  // Keyboard navigation (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      scrollToCard(activeIndex + (e.key === "ArrowDown" ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const scrollToCard = (idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const card = container.children[idx] as HTMLElement | undefined;
    card?.scrollIntoView({ behavior: "smooth" });
  };

  prevActiveRef.current = activeIndex;

  const maybeNudge = useCallback(
    (nextLikes: Set<string>, nextSaves: Set<string>, feedbackGiven = false) => {
      if (session?.user || localStorage.getItem(NUDGE_KEY)) return;
      if (nextLikes.size >= 3 || nextSaves.size >= 1 || feedbackGiven) {
        setShowNudge(true);
      }
    },
    [session?.user]
  );

  const handleLike = (app: FeedItem) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) {
        next.delete(app.id);
      } else {
        next.add(app.id);
        track(app.id, "like");
      }
      saveSet(LIKES_KEY, next);
      maybeNudge(next, saved);
      return next;
    });
  };

  const handleSave = (app: FeedItem) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(app.id)) {
        next.delete(app.id);
      } else {
        next.add(app.id);
        track(app.id, "save");
      }
      saveSet(SAVES_KEY, next);
      maybeNudge(liked, next);
      return next;
    });
  };

  const handleShare = async (app: FeedItem) => {
    const url = `${window.location.origin}/app/${app.slug}`;
    track(app.id, "share");
    try {
      if (navigator.share) {
        await navigator.share({ title: app.name, text: app.tagline, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast("Link copied!");
        setTimeout(() => setToast(null), 1800);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {/* Minimal top bar: just the logo + submit/dashboard. No landing copy. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between p-4">
        <span className="text-lg font-bold tracking-tight">Glim</span>
        <nav className="pointer-events-auto flex items-center gap-2">
          <Link
            href="/submit"
            className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-black/50 px-3 text-sm backdrop-blur transition hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> Submit
          </Link>
          <Link
            href="/saved"
            aria-label="Saved"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/50 backdrop-blur transition hover:bg-muted"
          >
            <Bookmark className="h-4 w-4" />
          </Link>
          {session?.user && (
            <>
              <Link
                href="/dashboard"
                aria-label="Dashboard"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-black/50 backdrop-blur transition hover:bg-muted"
              >
                <LayoutDashboard className="h-4 w-4" />
              </Link>
              <UserMenu variant="overlay" />
            </>
          )}
        </nav>
      </header>

      {/* The vertical snap feed */}
      <div ref={containerRef} className="feed-snap h-dvh overflow-y-scroll">
        {apps.map((app, i) => (
          <AppCard
            key={app.id}
            app={app}
            active={i === activeIndex}
            liked={liked.has(app.id)}
            saved={saved.has(app.id)}
            onLike={() => handleLike(app)}
            onSave={() => handleSave(app)}
            onShare={() => handleShare(app)}
            onFeedback={() => setFeedbackApp({ id: app.id, name: app.name })}
            onVideoComplete={() => completedRef.current.add(app.id)}
          />
        ))}
        {apps.length === 0 && (
          <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center">
            <p className="text-lg font-semibold">No apps yet.</p>
            <p className="text-sm text-muted-foreground">
              Run the seed script, or be the first to submit.
            </p>
            <Link href="/submit" className="underline">
              Submit your app →
            </Link>
          </div>
        )}
      </div>

      <FeedbackModal
        app={feedbackApp}
        onClose={() => setFeedbackApp(null)}
        onSubmitted={() => {
          maybeNudge(liked, saved, true);
          scrollToCard(activeIndex + 1); // flow straight into the next app
        }}
      />

      {/* Soft login nudge — value first, account later. */}
      <Dialog
        open={showNudge}
        onClose={() => {
          localStorage.setItem(NUDGE_KEY, "1");
          setShowNudge(false);
        }}
      >
        <h2 className="text-lg font-semibold">Save your discoveries with one click.</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your likes, saves and feedback across devices.
        </p>
        <div className="mt-4">
          <GoogleSignIn />
        </div>
        <button
          className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => {
            localStorage.setItem(NUDGE_KEY, "1");
            setShowNudge(false);
          }}
        >
          Maybe later
        </button>
      </Dialog>

      {toast && (
        <div className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
          {toast}
        </div>
      )}
    </div>
  );
}
