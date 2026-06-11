"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAnonymousId } from "@/lib/anon";
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
  const [selected, setSelected] = useState<FeedbackTag[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (tag: FeedbackTag) =>
    setSelected((s) =>
      s.includes(tag) ? s.filter((t) => t !== tag) : [...s, tag]
    );

  const reset = () => {
    setSelected([]);
    setComment("");
  };

  const submit = async () => {
    if (!app || (selected.length === 0 && !comment.trim())) return;
    setBusy(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appId: app.id,
          tags: selected,
          comment: comment.trim() || undefined,
          anonymousId: getAnonymousId(),
        }),
      });
      reset();
      onSubmitted?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

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
        value={comment}
        maxLength={280}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />

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
