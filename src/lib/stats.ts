import { and, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

/** Canonical UTC YYYY-MM-DD — the app_daily_stats date key. */
export function utcDay(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * Lazy daily rollup (E2): for each app, recompute every day from its
 * MAX(date) (inclusive — the newest stored day may have been partial)
 * through today as a FULL day, and upsert. Full-day recompute is idempotent,
 * so concurrent dashboard loads race harmlessly; increments are forbidden
 * because deduped COUNT DISTINCT is not additive across windows.
 * Cost: one grouped query over the apps' interactions since the oldest
 * missing day — dashboards are per-maker, so the scope stays small.
 */
export async function rollupDailyStats(appIds: string[]): Promise<void> {
  if (appIds.length === 0) return;
  const db = await getDb();

  const maxRows = await db
    .select({
      appId: schema.appDailyStats.appId,
      maxDate: sql<string>`MAX(${schema.appDailyStats.date})`,
    })
    .from(schema.appDailyStats)
    .where(inArray(schema.appDailyStats.appId, appIds))
    .groupBy(schema.appDailyStats.appId);
  const maxByApp = new Map(maxRows.map((r) => [r.appId, r.maxDate]));

  const today = utcDay(Date.now());
  // Apps with no rows yet backfill their whole history (bounded: 90 days).
  const horizon = utcDay(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const fromDay = appIds
    .map((id) => maxByApp.get(id) ?? horizon)
    .reduce((a, b) => (a < b ? a : b), today);
  const fromTs = Date.parse(`${fromDay}T00:00:00Z`);

  const identity = sql`COALESCE('u:' || user_id, 'a:' || anonymous_id)`;
  const dayExpr = sql<string>`strftime('%Y-%m-%d', created_at / 1000, 'unixepoch')`;
  const grouped = await db
    .select({
      appId: schema.interactions.appId,
      day: dayExpr,
      viewers: sql<number>`COUNT(DISTINCT CASE WHEN type = 'impression' THEN ${identity} END)`,
      triers: sql<number>`COUNT(DISTINCT CASE WHEN type = 'try_click' THEN ${identity} END)`,
    })
    .from(schema.interactions)
    .where(
      and(
        inArray(schema.interactions.appId, appIds),
        gte(schema.interactions.createdAt, new Date(fromTs)),
        inArray(schema.interactions.type, ["impression", "try_click"])
      )
    )
    .groupBy(schema.interactions.appId, dayExpr);

  for (const row of grouped) {
    await db.run(sql`
      INSERT INTO app_daily_stats (app_id, date, viewers, triers)
      VALUES (${row.appId}, ${row.day}, ${row.viewers}, ${row.triers})
      ON CONFLICT(app_id, date) DO UPDATE SET
        viewers = excluded.viewers, triers = excluded.triers
    `);
  }
}

/** Last-N-days trend rows per app (after rollupDailyStats). */
export async function getDailyTrend(
  appIds: string[],
  days = 14
): Promise<Map<string, { date: string; viewers: number; triers: number }[]>> {
  const out = new Map<string, { date: string; viewers: number; triers: number }[]>();
  if (appIds.length === 0) return out;
  const db = await getDb();
  const from = utcDay(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select()
    .from(schema.appDailyStats)
    .where(
      and(
        inArray(schema.appDailyStats.appId, appIds),
        gte(schema.appDailyStats.date, from)
      )
    )
    .orderBy(schema.appDailyStats.date);
  for (const r of rows) {
    const list = out.get(r.appId) ?? [];
    list.push({ date: r.date, viewers: r.viewers, triers: r.triers });
    out.set(r.appId, list);
  }
  return out;
}

export type TrendingApp = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  iconUrl: string | null;
  thumbnailUrl: string | null;
  followerCount: number;
  saveCount: number;
  viewers: number;
  triers: number;
  score: number;
};

/**
 * Weekly trending: ONE deduped aggregate over the last 7 days of
 * interactions (identity-namespaced, score-allowlisted types only), joined
 * to apps. Deliberately NOT built on app_daily_stats — a public page must
 * never trigger per-app rollup backfills (batch job on a page hit).
 * Cached per isolate for 15 minutes; a cold isolate pays one query.
 */
type CacheEntry = { at: number; data: TrendingApp[] };
let cache: CacheEntry | null = null;
const TTL_MS = 15 * 60 * 1000;

export async function getTrending(limit = 10): Promise<TrendingApp[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data.slice(0, limit);

  const db = await getDb();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const identity = sql`COALESCE('u:' || i.user_id, 'a:' || i.anonymous_id)`;

  const rows = await db.all<TrendingApp>(sql`
    SELECT
      a.id, a.slug, a.name, a.tagline, a.category,
      a.icon_url AS iconUrl, a.thumbnail_url AS thumbnailUrl,
      a.follower_count AS followerCount, a.save_count AS saveCount,
      COUNT(DISTINCT CASE WHEN i.type = 'impression' THEN ${identity} END) AS viewers,
      COUNT(DISTINCT CASE WHEN i.type = 'try_click' THEN ${identity} END) AS triers,
      (COUNT(DISTINCT CASE WHEN i.type = 'try_click' THEN ${identity} END) * 5
        + COUNT(DISTINCT CASE WHEN i.type = 'save' THEN ${identity} END) * 2
        + COUNT(DISTINCT CASE WHEN i.type = 'impression' THEN ${identity} END)) AS score
    FROM apps a
    JOIN interactions i ON i.app_id = a.id
      AND i.created_at > ${sevenDaysAgo}
      AND i.type IN ('impression', 'try_click', 'save')
    WHERE a.status IN ('published', 'unclaimed')
    GROUP BY a.id
    HAVING score > 0
    ORDER BY score DESC
    LIMIT 25
  `);

  cache = { at: Date.now(), data: rows };
  return rows.slice(0, limit);
}
