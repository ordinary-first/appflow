"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2, Loader2 } from "lucide-react";

type AppStatus = "unclaimed" | "draft" | "published" | "hidden";

/**
 * Per-app maker actions on the dashboard: hide/unhide + delete.
 * Hits PATCH/DELETE /api/apps/[id], then `router.refresh()` to re-query
 * the (server-rendered) dashboard. Server enforces ownership.
 */
export function AppActions({
  appId,
  status,
}: {
  appId: string;
  status: AppStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => startTransition(() => router.refresh());

  const toggleStatus = async () => {
    setError(null);
    setBusy("toggle");
    const next: AppStatus = status === "hidden" ? "published" : "hidden";
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setError(`Failed to ${next === "hidden" ? "hide" : "unhide"} app.`);
        return;
      }
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const doDelete = async () => {
    setError(null);
    setBusy("delete");
    try {
      const res = await fetch(`/api/apps/${appId}`, { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to delete app.");
        return;
      }
      setConfirming(false);
      refresh();
    } finally {
      setBusy(null);
    }
  };

  const working = isPending || busy !== null;

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">
          Delete this app and all its feedback?
        </span>
        <button
          onClick={doDelete}
          disabled={working}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-500/20 px-3 text-xs text-red-200 hover:bg-red-500/30 disabled:opacity-50 cursor-pointer"
        >
          {busy === "delete" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={working}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={toggleStatus}
        disabled={working}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs hover:bg-muted disabled:opacity-50 cursor-pointer"
      >
        {busy === "toggle" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "hidden" ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
        {status === "hidden" ? "Unhide" : "Hide"}
      </button>
      <button
        onClick={() => setConfirming(true)}
        disabled={working}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50 cursor-pointer"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
      {error && (
        <span className="text-xs text-red-300" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
