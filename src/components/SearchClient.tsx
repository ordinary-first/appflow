"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type SearchApp = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  iconUrl: string | null;
  thumbnailUrl: string | null;
  status: string;
  makerName: string;
};

/** Debounced live search over /api/search. */
export function SearchClient() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchApp[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setResults(null);
      setError(false);
      setLoading(false);
      return;
    }
    // Show the in-flight state the moment a query exists, not just after the
    // debounce fires — otherwise the field reads blank for ~250ms+latency and
    // feels broken on the first keystroke.
    setLoading(true);
    const t = setTimeout(() => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then(async (r): Promise<{ apps: SearchApp[] }> =>
          r.ok ? ((await r.json()) as { apps: SearchApp[] }) : { apps: [] }
        )
        .then((data) => {
          setResults(data.apps);
          setError(false);
          setLoading(false);
        })
        .catch((e) => {
          if (e?.name !== "AbortError") {
            setError(true);
            setLoading(false);
          }
        });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mt-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={100}
          placeholder="Search apps by name…"
          aria-label="Search apps"
          className="h-12 w-full rounded-xl border border-border bg-muted pl-11 pr-4 text-base outline-none focus:border-foreground/40"
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-400" role="alert">
          Search failed — please try again.
        </p>
      )}

      {/* In-flight: only when we have nothing to show yet, so re-querying with
          existing results doesn't flicker the whole list to "Searching…". */}
      {loading && results === null && !error && (
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          Searching…
        </p>
      )}

      {results !== null && results.length === 0 && !error && (
        <div className="mt-10 text-center">
          <p className="text-base font-medium">No apps match “{q.trim()}”.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Built it yourself? Put it in front of people who try things.
          </p>
          <Link
            href="/submit"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-foreground px-6 text-sm font-semibold text-background hover:bg-foreground/90"
          >
            Submit your app
          </Link>
        </div>
      )}

      {results !== null && results.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {results.map((app) => (
            <li key={app.id}>
              <Link
                href={`/app/${app.slug}`}
                className="flex items-center gap-3 py-3 transition hover:bg-muted/40"
              >
                {app.iconUrl || app.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- R2/maker media
                  <img
                    src={app.iconUrl ?? app.thumbnailUrl ?? ""}
                    alt=""
                    className="h-11 w-11 flex-none rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-muted text-base font-bold">
                    {app.name[0]?.toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-semibold">
                    {app.name}
                    {app.status === "unclaimed" && (
                      <span className="flex-none rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        Unclaimed
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {app.tagline}
                  </p>
                </div>
                <span className="flex-none text-xs text-muted-foreground">
                  {app.category}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
