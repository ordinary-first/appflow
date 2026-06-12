"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppCard } from "./AppCard";
import { BottomNav } from "@/components/BottomNav";
import { CommentsSheet } from "@/components/CommentsSheet";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Dialog } from "@/components/ui/dialog";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { useSession } from "@/lib/auth-client";
import { track } from "@/lib/track";
import { cn } from "@/lib/utils";
import type { FeedItem } from "@/lib/types";

type FeedTab = "foryou" | "following" | "categories";

const SAVES_KEY = "glim_saves";
const NUDGE_KEY = "glim_nudge_dismissed";

function saveSet(key: string, s: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...s]));
}

export function Feed({ apps }: { apps: FeedItem[] }) {
  const { data: session } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState<FeedTab>("foryou");
  const [category, setCategory] = useState<string | null>(null);
  // Like/save/follow state is server-hydrated via SSR flags (likedByMe etc.) —
  // localStorage is no longer an authority (it let toggles drift from the DB).
  // liked is keyed by postId (likes are per-post), saved/followed by appId.
  const [liked, setLiked] = useState<Set<string>>(
    () => new Set(apps.filter((a) => a.likedByMe).map((a) => a.postId))
  );
  const [saved, setSaved] = useState<Set<string>>(
    () => new Set(apps.filter((a) => a.savedByMe).map((a) => a.id))
  );
  const [followedApps, setFollowedApps] = useState<Set<string>>(
    () => new Set(apps.filter((a) => a.followedByMe).map((a) => a.id))
  );
  const [followingItems, setFollowingItems] = useState<FeedItem[] | null>(null);
  const [feedbackApp, setFeedbackApp] = useState<{ id: string; name: string } | null>(null);
  const [commentsPost, setCommentsPost] = useState<{ postId: string; appName: string } | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const completedRef = useRef<Set<string>>(new Set());
  const impressionsRef = useRef<Set<string>>(new Set());
  // In-flight toggle guard: rapid double-taps must not race the server.
  const pendingRef = useRef<Set<string>>(new Set());

  const categories = useMemo(
    () => [...new Set(apps.map((a) => a.category))].sort(),
    [apps]
  );
  // 'categories' filters the loaded feed client-side (v1); 'following'
  // renders the server feed fetched on tab switch.
  const visibleApps = useMemo(() => {
    if (tab === "categories" && category) {
      return apps.filter((a) => a.category === category);
    }
    if (tab === "following") return followingItems ?? [];
    return apps;
  }, [apps, tab, category, followingItems]);

  // Merge hydration flags from the following feed once it loads (those items
  // aren't part of the SSR props).
  useEffect(() => {
    if (!followingItems) return;
    setLiked((prev) => {
      const next = new Set(prev);
      for (const it of followingItems) if (it.likedByMe) next.add(it.postId);
      return next;
    });
    setSaved((prev) => {
      const next = new Set(prev);
      for (const it of followingItems) if (it.savedByMe) next.add(it.id);
      return next;
    });
  }, [followingItems]);

  // Refresh follow-button state once the session is known (covers follows
  // made on other pages after the SSR snapshot).
  useEffect(() => {
    if (!session?.user) return;
    let cancelled = false;
    fetch("/api/follows")
      .then(async (r): Promise<{ follows: { targetType: string; targetId: string }[] }> =>
        r.ok ? ((await r.json()) as { follows: { targetType: string; targetId: string }[] }) : { follows: [] }
      )
      .then((data) => {
        if (cancelled) return;
        setFollowedApps(
          new Set(
            data.follows.filter((f) => f.targetType === "app").map((f) => f.targetId)
          )
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  // Fetch the following feed when the tab opens (and after follow changes).
  useEffect(() => {
    if (tab !== "following" || !session?.user) return;
    let cancelled = false;
    fetch("/api/feed?type=following")
      .then(async (r): Promise<{ items: FeedItem[] }> =>
        r.ok ? ((await r.json()) as { items: FeedItem[] }) : { items: [] }
      )
      .then((data) => {
        if (!cancelled) setFollowingItems(data.items);
      })
      .catch(() => {
        if (!cancelled) setFollowingItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, session?.user, followedApps]);

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
              const prevApp = visibleApps[prev];
              if (prevApp && !completedRef.current.has(prevApp.id)) {
                track(prevApp.id, "skip", undefined, { once: true });
              }
            }
            return idx;
          });
          const app = visibleApps[idx];
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
  }, [visibleApps]);

  // Switching tab/category rebuilds the card list — reset scroll position.
  useEffect(() => {
    setActiveIndex(0);
    containerRef.current?.scrollTo({ top: 0 });
  }, [tab, category]);

  // Keyboard navigation (desktop). Bails out while a sheet/modal is open or
  // the user is typing — arrow keys must not scroll the feed behind them.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      if (commentsPost || feedbackApp || showNudge) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
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

  const maybeNudge = useCallback(
    (nextSaves: Set<string>, feedbackGiven = false) => {
      if (session?.user || localStorage.getItem(NUDGE_KEY)) return;
      if (nextSaves.size >= 1 || feedbackGiven) {
        setShowNudge(true);
      }
    },
    [session?.user]
  );

  const failToast = () => {
    setToast("Please try again in a moment");
    setTimeout(() => setToast(null), 1800);
  };

  // Likes are per-post and login-required (design decision: deliberate
  // asymmetry with saves). Anonymous tap → login prompt.
  const handleLike = async (app: FeedItem) => {
    if (!session?.user) {
      setShowNudge(true);
      return;
    }
    const key = `like:${app.postId}`;
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);
    const wasLiked = liked.has(app.postId);
    const next = new Set(liked);
    if (wasLiked) next.delete(app.postId);
    else next.add(app.postId);
    setLiked(next);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: app.postId, action: wasLiked ? "remove" : "add" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setLiked((prev) => {
        const revert = new Set(prev);
        if (wasLiked) revert.add(app.postId);
        else revert.delete(app.postId);
        return revert;
      });
      failToast();
    } finally {
      pendingRef.current.delete(key);
    }
  };

  // Saves are app-level and allow anonymous identity (signed cookie).
  // localStorage stays as an aux cache for the anonymous /saved page only.
  const handleSave = async (app: FeedItem) => {
    const key = `save:${app.id}`;
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);
    const wasSaved = saved.has(app.id);
    const next = new Set(saved);
    if (wasSaved) next.delete(app.id);
    else next.add(app.id);
    setSaved(next);
    saveSet(SAVES_KEY, next);
    maybeNudge(next);
    try {
      const res = await fetch("/api/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: app.id, action: wasSaved ? "remove" : "add" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSaved((prev) => {
        const revert = new Set(prev);
        if (wasSaved) revert.add(app.id);
        else revert.delete(app.id);
        saveSet(SAVES_KEY, revert);
        return revert;
      });
      failToast();
    } finally {
      pendingRef.current.delete(key);
    }
  };

  const handleFollow = async (app: FeedItem) => {
    if (!session?.user) {
      setShowNudge(true);
      return;
    }
    const key = `follow:${app.id}`;
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);
    // Optimistic toggle; revert on failure.
    const wasFollowing = followedApps.has(app.id);
    setFollowedApps((prev) => {
      const next = new Set(prev);
      if (wasFollowing) next.delete(app.id);
      else next.add(app.id);
      return next;
    });
    try {
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "app", targetId: app.id }),
      });
      if (!res.ok) throw new Error();
      if (!wasFollowing) {
        setToast(`Following ${app.name}`);
        setTimeout(() => setToast(null), 1800);
      }
    } catch {
      setFollowedApps((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.add(app.id);
        else next.delete(app.id);
        return next;
      });
      failToast();
    } finally {
      pendingRef.current.delete(key);
    }
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
      {/* Top: centered feed tabs (TikTok-style), logo tucked left. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-40 p-4">
        <div className="relative flex items-center justify-center">
          <span className="absolute left-0 text-xl font-extrabold tracking-tighter text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            Glim
          </span>
          <nav className="pointer-events-auto flex items-center gap-5 text-[15px] font-semibold drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            <TopTab active={tab === "foryou"} onClick={() => setTab("foryou")}>
              For You
            </TopTab>
            <TopTab
              active={tab === "following"}
              onClick={() => setTab("following")}
            >
              Following
            </TopTab>
            <TopTab
              active={tab === "categories"}
              onClick={() => setTab("categories")}
            >
              Categories
            </TopTab>
          </nav>
        </div>

        {/* Category chips — only on the Categories tab */}
        {tab === "categories" && (
          <div className="pointer-events-auto mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? null : c)}
                className={cn(
                  "flex-none rounded-full border px-3 py-1 text-xs font-medium transition cursor-pointer",
                  category === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-black/50 text-muted-foreground backdrop-blur hover:text-foreground"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* The vertical snap feed */}
      <div ref={containerRef} className="feed-snap h-dvh overflow-y-scroll">
        {visibleApps.map((app, i) => (
          <AppCard
            key={app.postId}
            app={app}
            active={i === activeIndex}
            near={Math.abs(i - activeIndex) <= 1}
            liked={liked.has(app.postId)}
            saved={saved.has(app.id)}
            followed={followedApps.has(app.id)}
            onLike={() => handleLike(app)}
            onSave={() => handleSave(app)}
            onFollow={() => handleFollow(app)}
            onShare={() => handleShare(app)}
            onComments={() => setCommentsPost({ postId: app.postId, appName: app.name })}
            onVideoComplete={() => completedRef.current.add(app.id)}
          />
        ))}
        {visibleApps.length === 0 && tab === "following" && (
          <div className="flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-lg font-semibold">
              {session?.user && followingItems === null
                ? "Loading…"
                : "Nothing here yet."}
            </p>
            {!(session?.user && followingItems === null) && (
              <p className="text-sm text-muted-foreground">
                {session?.user
                  ? "Follow apps with the + button on a card to see their updates here."
                  : "Sign in and follow apps to see their updates here."}
              </p>
            )}
            {!session?.user && (
              <div className="mt-2 w-full max-w-xs">
                <GoogleSignIn />
              </div>
            )}
          </div>
        )}
        {visibleApps.length === 0 && tab === "categories" && (
          <div className="flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-lg font-semibold">
              {category ? `No ${category} apps yet.` : "Pick a category above."}
            </p>
          </div>
        )}
        {visibleApps.length === 0 && tab === "foryou" && (
          <div className="flex h-dvh flex-col items-center justify-center gap-3 text-center">
            <p className="text-lg font-semibold">No apps yet.</p>
            <p className="text-sm text-muted-foreground">
              Run the seed script, or be the first to submit.
            </p>
          </div>
        )}
      </div>

      <BottomNav />

      <CommentsSheet post={commentsPost} onClose={() => setCommentsPost(null)} />

      <FeedbackModal
        app={feedbackApp}
        onClose={() => setFeedbackApp(null)}
        onSubmitted={() => {
          maybeNudge(saved, true);
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
        <div className="absolute bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background">
          {toast}
        </div>
      )}
    </div>
  );
}

function TopTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative pb-1 transition cursor-pointer",
        active
          ? "text-white after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-white"
          : "text-white/60 hover:text-white/80"
      )}
    >
      {children}
    </button>
  );
}
