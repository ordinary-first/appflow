import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SearchClient } from "@/components/SearchClient";

export const dynamic = "force-dynamic";

/**
 * App search — the claim funnel's front door: makers arriving from outreach
 * DMs search for their app here, land on its page, and hit the claim CTA.
 */
export default function SearchPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-6 pb-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Glim
      </Link>
      <h1 className="mt-5 text-2xl font-bold">Search</h1>
      <SearchClient />
      <BottomNav />
    </main>
  );
}
