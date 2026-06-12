"use client";

import Link from "next/link";
import { track } from "@/lib/track";
import type { TryTarget } from "@/lib/try-target";

/**
 * Renders one TryTarget with correct semantics: internal targets route to
 * /try (TryView records try_click), external targets open a new tab AND
 * record try_click here — external opens used to vanish from the stats.
 */
export function TryLink({
  appId,
  target,
  className,
  children,
}: {
  appId: string;
  target: TryTarget;
  className?: string;
  children: React.ReactNode;
}) {
  if (!target.external) {
    return (
      <Link href={target.href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={target.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(appId, "try_click")}
      className={className}
    >
      {children}
    </a>
  );
}
