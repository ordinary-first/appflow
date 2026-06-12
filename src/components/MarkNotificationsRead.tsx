"use client";

import { useEffect } from "react";

/** Fires once when the inbox opens: marks all notifications read and stamps
 * the lastNotifCheckAt badge baseline. Renders nothing. */
export function MarkNotificationsRead() {
  useEffect(() => {
    fetch("/api/notifications", { method: "POST" }).catch(() => {});
  }, []);
  return null;
}
