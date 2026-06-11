"use client";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function GoogleSignIn({
  callbackURL = "/",
  label = "Continue with Google",
}: {
  callbackURL?: string;
  label?: string;
}) {
  return (
    <Button
      size="lg"
      className="w-full"
      onClick={() => signIn.social({ provider: "google", callbackURL })}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1H12v2.9h5.35c-.5 2.4-2.55 3.9-5.35 3.9a5.9 5.9 0 1 1 0-11.8c1.5 0 2.85.55 3.9 1.45l2.15-2.15A8.86 8.86 0 0 0 12 3a9 9 0 1 0 0 18c5.2 0 8.65-3.65 8.65-8.8 0-.4-.1-.75-.3-1.1Z"
        />
      </svg>
      {label}
    </Button>
  );
}
