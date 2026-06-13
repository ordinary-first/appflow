"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/auth-client";
import type { FeedbackTag } from "@/db/schema";
import { cn } from "@/lib/utils";

const TAG_OPTIONS: { tag: FeedbackTag; label: string }[] = [
  { tag: "useful", label: "👍 Useful" },
  { tag: "interesting", label: "✨ Interesting" },
  { tag: "confusing", label: "😕 Confusing" },
  { tag: "buggy", label: "🐞 Buggy" },
  { tag: "login_blocked", label: "🚪 Login blocked me" },
  { tag: "too_slow", label: "🐢 Too slow" },
  { tag: "not_for_me", label: "❌ Not for me" },
];

/** The 3-second feedback UX: tap tags, optional one-liner, done. */
export function FeedbackModal({
  app,
  onClose,
  onSubmitted,
}: {
  app: { id: string; name: string } | null;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const { data: session } = useSession();
  const [selected, setSelected] = useState<FeedbackTag[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 'convert' = post-submit one-tap "publish as review" step (E3): the
  // feedback is already saved; the user explicitly opts into making the
  // comment a PUBLIC review post. Eligibility: logged in, positive tags,
  // comment ≥ 20 chars.
  const [phase, setPhase] = useState<"form" | "convert">("form");

  const toggle = (tag: FeedbackTag) =>
    setSelected((s) =>
      s.includes(tag) ? s.filter((t) => t !== tag) : [...s, tag]
    );

  const reset = () => {
    setSelected([]);
    setComment("");
    setError(null);
    setPhase("form");
  };

  const finish = () => {
    reset();
    onSubmitted?.();
    onClose();
  };

  const submit = async () => {
    if (busy) return; // Enter while in flight must not double-submit
    if (!app || (selected.length === 0 && !comment.trim())) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: app.id,
          tags: selected,
          comment: comment.trim() || undefined,
        }),
      });
      if (!res.ok) {
        setError("Couldn't send — please try again in a moment.");
        return; // keep the modal open — feedback must never be silently lost
      }
      const positive = selected.some((t) => t === "useful" || t === "interesting");
      if (session?.user && positive && comment.trim().length >= 20) {
        setPhase("convert"); // feedback saved — offer the public-review step
        return;
      }
      finish();
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const publishReview = async () => {
    if (!app || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: app.id, body: comment.trim() }),
      });
      if (!res.ok) {
        setError("Couldn't publish — your feedback is already saved though.");
        return;
      }
      finish();
    } catch {
      setError("Network error — your feedback is already saved though.");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "convert") {
    return (
      <Dialog open={!!app} onClose={finish}>
        <h2 className="text-lg font-semibold">Share it as a public review?</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your feedback is saved. Post this line publicly on {app?.name}&apos;s
          page, credited to you — you can delete it anytime.
        </p>
        <blockquote className="mt-3 rounded-xl border border-border bg-background px-4 py-3 text-sm">
          “{comment.trim()}”
        </blockquote>
        {error && (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <Button className="flex-1" disabled={busy} onClick={publishReview}>
            {busy ? "Publishing…" : "Post as review"}
          </Button>
          <Button variant="ghost" onClick={finish}>
            No thanks
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={!!app}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <h2 className="text-lg font-semibold">How was it?</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{app?.name}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TAG_OPTIONS.map(({ tag, label }) => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer",
              selected.includes(tag)
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:border-foreground/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Input
        className="mt-4"
        placeholder="Optional: Tell the maker one thing."
        aria-label="Feedback comment for the maker"
        value={comment}
        maxLength={280}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          // isComposing: Hangul/IME composition-confirm Enter must not submit
          if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
        }}
      />

      {error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          className="flex-1"
          disabled={busy || (selected.length === 0 && !comment.trim())}
          onClick={submit}
        >
          {busy ? "Sending…" : "Send feedback"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            reset();
            onClose();
          }}
        >
          Skip
        </Button>
      </div>
    </Dialog>
  );
}
