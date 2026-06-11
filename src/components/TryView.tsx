"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Heart, MessageSquare, Share2 } from "lucide-react";
import { track } from "@/lib/track";
import { FeedbackModal } from "@/components/FeedbackModal";

type TryApp = {
  id: string;
  name: string;
  slug: string;
  url: string;
  embeddable: boolean;
};

/**
 * In-platform trial: external app inside an iframe under a persistent Glim bar.
 * Fallback: if the app refuses framing (X-Frame-Options/CSP) or never paints,
 * offer "open in new tab" while keeping the user anchored to Glim.
 */
export function TryView({ app }: { app: TryApp }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(!app.embeddable);
  const [loaded, setLoaded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const likedRef = useRef(false);

  // Entering Try = the strongest interest signal.
  useEffect(() => {
    track(app.id, "try_click", undefined, { once: true });
  }, [app.id]);

  // If the iframe hasn't loaded after a grace period, assume it's blocked.
  useEffect(() => {
    if (blocked) return;
    const t = setTimeout(() => {
      if (!loaded) setBlocked(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [blocked, loaded]);

  const goBack = () => {
    track(app.id, "try_return", undefined, { once: true });
    setFeedbackOpen(true);
  };

  const afterFeedback = () => {
    router.push(`/`);
  };

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Persistent Glim bar — the user should always feel inside Glim. */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-muted px-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium hover:bg-background cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Glim
        </button>
        <span className="mx-auto truncate text-sm font-semibold">{app.name}</span>
        <div className="flex items-center gap-1">
          <BarIcon
            onClick={() => {
              if (!likedRef.current) {
                likedRef.current = true;
                track(app.id, "like");
              }
            }}
          >
            <Heart className="h-4 w-4" />
          </BarIcon>
          <BarIcon onClick={() => setFeedbackOpen(true)}>
            <MessageSquare className="h-4 w-4" />
          </BarIcon>
          <BarIcon
            onClick={() => {
              track(app.id, "share");
              navigator.clipboard
                .writeText(`${window.location.origin}/app/${app.slug}`)
                .catch(() => {});
            }}
          >
            <Share2 className="h-4 w-4" />
          </BarIcon>
        </div>
      </div>

      {/* Trial surface */}
      <div className="relative min-h-0 flex-1">
        {!blocked ? (
          <>
            <iframe
              src={app.url}
              title={app.name}
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              onLoad={() => setLoaded(true)}
            />
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-background">
                <p className="animate-pulse text-sm text-muted-foreground">
                  Loading {app.name}…
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-lg font-semibold">
              This app opens in a new window.
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {app.name} doesn&apos;t allow embedding. Try it in a new tab — then come
              back to Glim and tell the maker what you think.
            </p>
            <a
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-foreground px-6 font-semibold text-background hover:bg-foreground/90"
            >
              Open {app.name} <ExternalLink className="h-4 w-4" />
            </a>
            <button
              onClick={goBack}
              className="text-sm text-muted-foreground underline hover:text-foreground cursor-pointer"
            >
              I&apos;m done — leave feedback
            </button>
          </div>
        )}
      </div>

      <FeedbackModal
        app={feedbackOpen ? { id: app.id, name: app.name } : null}
        onClose={() => {
          setFeedbackOpen(false);
          afterFeedback();
        }}
        onSubmitted={afterFeedback}
      />
    </div>
  );
}

function BarIcon({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-2 text-muted-foreground transition hover:bg-background hover:text-foreground cursor-pointer"
    >
      {children}
    </button>
  );
}
