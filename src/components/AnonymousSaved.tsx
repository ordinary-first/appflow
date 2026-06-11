"use client";

import { useEffect, useState } from "react";
import { SavedGrid, EmptySaved, type SavedCardData } from "@/components/SavedGrid";

const SAVES_KEY = "glim_saves";

function readIds(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVES_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Renders the anonymous user's bookmarks. Bookmarks live only in localStorage
 * until the user signs in, so we read them on mount and hydrate via the public
 * /api/apps?ids= batch endpoint. Reverses the array so most-recently-saved is first. */
export function AnonymousSaved() {
  const [state, setState] = useState<"loading" | "ready">("loading");
  const [apps, setApps] = useState<SavedCardData[]>([]);

  useEffect(() => {
    const ids = readIds().slice().reverse(); // newest-first
    if (ids.length === 0) {
      setState("ready");
      return;
    }
    let cancelled = false;
    fetch(`/api/apps?ids=${encodeURIComponent(ids.join(","))}`)
      .then(async (r): Promise<{ apps: SavedCardData[] }> => {
        if (!r.ok) return { apps: [] };
        return (await r.json()) as { apps: SavedCardData[] };
      })
      .then((data) => {
        if (cancelled) return;
        const byId = new Map(data.apps.map((a) => [a.id, a]));
        const ordered = ids
          .map((id) => byId.get(id))
          .filter((a): a is SavedCardData => Boolean(a));
        setApps(ordered);
        setState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setState("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <p className="mt-8 text-sm text-muted-foreground">Loading…</p>;
  }
  if (apps.length === 0) {
    return <EmptySaved />;
  }
  return <SavedGrid apps={apps} />;
}
