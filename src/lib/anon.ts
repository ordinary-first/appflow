"use client";

const KEY = "glim_anon_id";

/** Stable anonymous id: localStorage + cookie (cookie lets the server merge on login). */
export function getAnonymousId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  document.cookie = `${KEY}=${id}; path=/; max-age=31536000; SameSite=Lax`;
  return id;
}
