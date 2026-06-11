import { count, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { AppRow } from "@/db/schema";

export type AppStats = {
  views: number;
  completedViews: number;
  skips: number;
  tryClicks: number;
  tryReturns: number;
  likes: number;
  saves: number;
  shares: number;
  feedbackCount: number;
  loginBlocked: number;
  topFeedbackTags: Record<string, number>;
  score: number;
};

export type FeedApp = AppRow & { stats: AppStats };

function emptyStats(): AppStats {
  return {
    views: 0,
    completedViews: 0,
    skips: 0,
    tryClicks: 0,
    tryReturns: 0,
    likes: 0,
    saves: 0,
    shares: 0,
    feedbackCount: 0,
    loginBlocked: 0,
    topFeedbackTags: {},
    score: 0,
  };
}

/**
 * App Score (MVP):
 *   completion*2 + tryClickRate*5 + feedbackRate*3 + saveRate*2
 *   - immediateSkipRate*2 - loginBlockedRate*3
 * Apps that require login to try are penalized via login_blocked feedback.
 */
function computeScore(s: AppStats): number {
  const denom = Math.max(s.views, 1);
  return (
    (s.completedViews / denom) * 2 +
    (s.tryClicks / denom) * 5 +
    (s.feedbackCount / denom) * 3 +
    (s.saves / denom) * 2 -
    (s.skips / denom) * 2 -
    (s.loginBlocked / denom) * 3
  );
}

/** Aggregate interaction/feedback stats per app (D1 has no RLS/views — plain queries). */
export async function getAppStats(): Promise<Map<string, AppStats>> {
  const db = await getDb();

  const [interactionCounts, feedbackRows] = await Promise.all([
    db
      .select({
        appId: schema.interactions.appId,
        type: schema.interactions.type,
        n: count(),
      })
      .from(schema.interactions)
      .groupBy(schema.interactions.appId, schema.interactions.type),
    db
      .select({
        appId: schema.feedback.appId,
        tags: schema.feedback.tags,
      })
      .from(schema.feedback),
  ]);

  const map = new Map<string, AppStats>();
  const get = (id: string) => {
    let s = map.get(id);
    if (!s) {
      s = emptyStats();
      map.set(id, s);
    }
    return s;
  };

  for (const row of interactionCounts) {
    const s = get(row.appId);
    switch (row.type) {
      case "impression":
        s.views = row.n;
        break;
      case "video_complete":
        s.completedViews = row.n;
        break;
      case "skip":
        s.skips = row.n;
        break;
      case "try_click":
        s.tryClicks = row.n;
        break;
      case "try_return":
        s.tryReturns = row.n;
        break;
      case "like":
        s.likes = row.n;
        break;
      case "save":
        s.saves = row.n;
        break;
      case "share":
        s.shares = row.n;
        break;
    }
  }

  for (const row of feedbackRows) {
    const s = get(row.appId);
    s.feedbackCount += 1;
    for (const tag of row.tags ?? []) {
      s.topFeedbackTags[tag] = (s.topFeedbackTags[tag] ?? 0) + 1;
      if (tag === "login_blocked") s.loginBlocked += 1;
    }
  }

  for (const s of map.values()) s.score = computeScore(s);
  return map;
}

/**
 * MVP feed mix: 30% popular (by App Score) + 30% recent + 40% random,
 * interleaved and deduped. No personalization/ML — interaction logs are
 * structured so it can be added later.
 */
export async function getFeedApps(limit = 40): Promise<FeedApp[]> {
  const db = await getDb();
  const [published, statsMap] = await Promise.all([
    db
      .select()
      .from(schema.apps)
      .where(eq(schema.apps.status, "published"))
      .orderBy(sql`${schema.apps.createdAt} desc`),
    getAppStats(),
  ]);

  const withStats: FeedApp[] = published.map((a) => ({
    ...a,
    stats: statsMap.get(a.id) ?? emptyStats(),
  }));

  const popular = [...withStats].sort((a, b) => b.stats.score - a.stats.score);
  const recent = withStats; // already newest-first
  const random = [...withStats].sort(() => Math.random() - 0.5);

  const n = Math.min(limit, withStats.length);
  const quota = {
    popular: Math.round(n * 0.3),
    recent: Math.round(n * 0.3),
    random: n, // random fills the rest
  };

  const out: FeedApp[] = [];
  const used = new Set<string>();
  const take = (pool: FeedApp[], max: number) => {
    let taken = 0;
    for (const app of pool) {
      if (out.length >= n || taken >= max) break;
      if (used.has(app.id)) continue;
      used.add(app.id);
      out.push(app);
      taken++;
    }
  };

  take(popular, quota.popular);
  take(recent, quota.recent);
  take(random, quota.random);

  // Light shuffle so the feed doesn't always open with the same #1,
  // but keep the first slot biased to a high-score app.
  const [first, ...rest] = out;
  return first ? [first, ...rest.sort(() => Math.random() - 0.5)] : out;
}
