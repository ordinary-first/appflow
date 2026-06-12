import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { APP_PLATFORMS } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { slugify } from "@/lib/utils";

/**
 * GET /api/apps?ids=id1,id2,... — public batch lookup of published apps.
 * Used by the anonymous /saved view to hydrate localStorage-only bookmarks.
 * Hidden/draft apps are excluded; max 100 ids per call.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 100);
  if (ids.length === 0) {
    return NextResponse.json({ apps: [] });
  }
  const db = await getDb();
  const rows = await db
    .select({
      id: schema.apps.id,
      slug: schema.apps.slug,
      name: schema.apps.name,
      tagline: schema.apps.tagline,
      category: schema.apps.category,
      thumbnailUrl: schema.apps.thumbnailUrl,
    })
    .from(schema.apps)
    .where(
      and(
        // Unclaimed (curated) apps are public — anonymous saves must hydrate them.
        inArray(schema.apps.status, ["published", "unclaimed"]),
        inArray(schema.apps.id, ids)
      )
    );
  return NextResponse.json({ apps: rows });
}

const CATEGORIES = [
  "AI",
  "Productivity",
  "DevTools",
  "Finance",
  "Health",
  "Content",
  "Education",
  "Game",
  "Other",
];

/** Create an app. Login required (this is the one allowed login gate). */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "login required" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const tagline = String(body.tagline ?? "").trim();
  const url = String(body.url ?? "").trim();
  const category = String(body.category ?? "").trim();
  if (!name || !tagline || !url || !CATEGORIES.includes(category)) {
    return NextResponse.json(
      { error: "name, tagline, url, category are required" },
      { status: 400 }
    );
  }
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "invalid app url" }, { status: 400 });
  }

  const rawPlatform = String(body.platform ?? "web");
  const platform = (APP_PLATFORMS as readonly string[]).includes(rawPlatform)
    ? (rawPlatform as typeof APP_PLATFORMS[number])
    : "web";

  // Validate store URLs for native platforms
  const rawIos = body.storeUrlIos ? String(body.storeUrlIos).trim() : "";
  const rawAndroid = body.storeUrlAndroid ? String(body.storeUrlAndroid).trim() : "";
  const validateStoreUrl = (u: string) => {
    try { return /^https?:/.test(new URL(u).protocol) ? u : ""; } catch { return ""; }
  };
  const iosUrl = validateStoreUrl(rawIos);
  const androidUrl = validateStoreUrl(rawAndroid);
  const storeUrls =
    iosUrl || androidUrl ? { ios: iosUrl || undefined, android: androidUrl || undefined } : null;

  const demoVideoUrl = body.demoVideoUrl ? String(body.demoVideoUrl) : null;
  const youtubeUrl = body.youtubeUrl ? String(body.youtubeUrl) : null;
  const imageUrls = Array.isArray(body.imageUrls)
    ? (body.imageUrls as unknown[])
        .map((u) => String(u).trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];
  // Per-image captions, index-aligned with imageUrls. Empty strings are kept
  // so alignment survives (slide 3 captioned, slide 2 not).
  const imageCaptions = Array.isArray(body.imageCaptions)
    ? (body.imageCaptions as unknown[])
        .map((c) => String(c ?? "").trim().slice(0, 80))
        .slice(0, imageUrls.length)
    : [];
  if (!demoVideoUrl && !youtubeUrl && imageUrls.length === 0) {
    return NextResponse.json(
      { error: "a demo video (upload or YouTube URL) or 1–5 screenshots are required" },
      { status: 400 }
    );
  }
  const mediaType: "video" | "images" =
    demoVideoUrl || youtubeUrl ? "video" : "images";

  const db = await getDb();

  // Unique slug
  const base = slugify(name);
  let slug = base;
  for (let i = 2; ; i++) {
    const existing = await db
      .select({ id: schema.apps.id })
      .from(schema.apps)
      .where(eq(schema.apps.slug, slug))
      .limit(1);
    if (existing.length === 0) break;
    slug = `${base}-${i}`;
  }

  const now = new Date();
  const id = crypto.randomUUID();
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
    : [];

  const thumbnailUrl = body.thumbnailUrl
    ? String(body.thumbnailUrl)
    : imageUrls[0] ?? null; // slideshow: first screenshot doubles as thumbnail

  await db.insert(schema.apps).values({
    id,
    slug,
    name: name.slice(0, 80),
    tagline: tagline.slice(0, 120),
    description: body.description ? String(body.description).slice(0, 2000) : null,
    url,
    demoVideoUrl,
    youtubeUrl,
    thumbnailUrl,
    category,
    tags,
    makerId: user.id, // ownership comes from the verified session, never the body
    makerName: body.makerName ? String(body.makerName).slice(0, 60) : user.name,
    makerLinks: {
      website: body.makerWebsite ? String(body.makerWebsite) : undefined,
      x: body.makerX ? String(body.makerX) : undefined,
      github: body.makerGithub ? String(body.makerGithub) : undefined,
    },
    guestModeAvailable: Boolean(body.guestModeAvailable),
    noLoginTrialAvailable: Boolean(body.noLoginTrialAvailable),
    embeddable: platform === "web" ? (body.embeddable === undefined ? true : Boolean(body.embeddable)) : false,
    platform,
    storeUrls,
    status: "published",
    createdAt: now,
    updatedAt: now,
  });

  // Every app is born with its first official post — the feed card.
  // (Posts model: apps are identity, posts are content.)
  await db.insert(schema.posts).values({
    id: `post-${id}`,
    appId: id,
    authorId: user.id,
    type: "official",
    status: "published",
    mediaType,
    videoUrl: demoVideoUrl,
    imageUrls: mediaType === "images" ? imageUrls : null,
    imageCaptions:
      mediaType === "images" && imageCaptions.some(Boolean) ? imageCaptions : null,
    thumbnailUrl,
    caption: tagline.slice(0, 120),
    createdAt: now,
  });

  return NextResponse.json({ ok: true, id, slug });
}
