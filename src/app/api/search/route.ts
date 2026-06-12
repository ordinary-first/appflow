import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { escapeLike } from "@/lib/toggle";

/**
 * GET /api/search?q= — app search by name/tagline (the claim funnel depends
 * on this: a maker arriving from an outreach DM must be able to find their
 * curated app). LIKE is fine at catalog scale; FTS is the TODOS path.
 * Hardening: q capped at 100 chars, %/_ wildcards escaped.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (!q) {
    return NextResponse.json({ apps: [] });
  }

  const pattern = `%${escapeLike(q)}%`;
  const db = await getDb();
  const apps = await db
    .select({
      id: schema.apps.id,
      slug: schema.apps.slug,
      name: schema.apps.name,
      tagline: schema.apps.tagline,
      category: schema.apps.category,
      iconUrl: schema.apps.iconUrl,
      thumbnailUrl: schema.apps.thumbnailUrl,
      status: schema.apps.status,
      makerName: schema.apps.makerName,
    })
    .from(schema.apps)
    .where(
      sql`${schema.apps.status} IN ('published', 'unclaimed')
        AND (${schema.apps.name} LIKE ${pattern} ESCAPE '\\'
          OR ${schema.apps.tagline} LIKE ${pattern} ESCAPE '\\')`
    )
    .orderBy(sql`${schema.apps.name} LIKE ${pattern} ESCAPE '\\' DESC, ${schema.apps.followerCount} DESC`)
    .limit(20);

  return NextResponse.json({ apps });
}
