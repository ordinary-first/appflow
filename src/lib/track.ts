"use client";

import { getAnonymousId } from "./anon";
import type { InteractionType } from "@/db/schema";

const seen = new Set<string>();

/**
 * Fire-and-forget interaction tracking.
 * `once` dedupes per (appId,type) for the current page session (impressions etc.).
 */
export function track(
  appId: string,
  type: InteractionType,
  metadata?: Record<string, unknown>,
  opts?: { once?: boolean }
) {
  if (opts?.once) {
    const k = `${appId}:${type}`;
    if (seen.has(k)) return;
    seen.add(k);
  }
  const body = JSON.stringify({
    appId,
    type,
    metadata,
    anonymousId: getAnonymousId(),
  });
  // keepalive so skips/page-leaves still get recorded
  fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
