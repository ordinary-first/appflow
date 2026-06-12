import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** XML-escape every user-influenced text node — SVG is an XML document and
 * app names come from the submit form (markup injection vector otherwise). */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * GET /api/badge/[slug] — "Live on Glim" embed badge (SVG). Makers paste
 * this on their site; every render is a free inbound channel. Cached 1h so
 * badge traffic can't hammer D1; Referer is logged as badge_view analytics
 * (excluded from the App Score allowlist).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = await getDb();
  const [app] = await db
    .select({
      id: schema.apps.id,
      name: schema.apps.name,
      followerCount: schema.apps.followerCount,
      status: schema.apps.status,
    })
    .from(schema.apps)
    .where(eq(schema.apps.slug, slug))
    .limit(1);

  if (!app || app.status === "hidden") {
    return new Response("not found", { status: 404 });
  }

  // Badge analytics (referrer = which site embeds us). Best-effort — a
  // failed insert must never break the badge render. Cached 1h upstream,
  // so this insert runs at most ~hourly per edge cache.
  const referer = req.headers.get("referer")?.slice(0, 300) ?? null;
  try {
    await db.insert(schema.interactions).values({
      id: crypto.randomUUID(),
      appId: app.id,
      type: "badge_view",
      userId: null,
      anonymousId: null,
      metadata: referer ? { referer } : null,
      createdAt: new Date(),
    });
  } catch {
    /* analytics only */
  }

  const name = esc(app.name);
  const followers =
    app.followerCount > 0 ? `${app.followerCount} followers` : "Live on Glim";
  const label = esc(followers);
  const width = 24 + name.length * 7 + label.length * 6 + 40;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28" role="img" aria-label="${name} — ${label}">
  <rect width="${width}" height="28" rx="6" fill="#09090b"/>
  <rect x="1" y="1" width="${width - 2}" height="26" rx="5" fill="none" stroke="#27272a"/>
  <circle cx="16" cy="14" r="4" fill="#f43f5e"/>
  <text x="28" y="18" font-family="system-ui,Segoe UI,sans-serif" font-size="12" font-weight="600" fill="#fafafa">${name}</text>
  <text x="${28 + name.length * 7 + 8}" y="18" font-family="system-ui,Segoe UI,sans-serif" font-size="11" fill="#a1a1aa">${label}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
