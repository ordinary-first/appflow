"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function DescriptionExpander({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const shouldClamp = text.length > 150;
  return (
    <div className="mt-5">
      <p
        className={cn(
          "whitespace-pre-wrap text-sm leading-relaxed text-foreground/90",
          !expanded && shouldClamp && "line-clamp-3"
        )}
      >
        {text}
      </p>
      {shouldClamp && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? "접기" : "더 보기"}
        </button>
      )}
    </div>
  );
}
