import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { AppRow, PostRow } from "@/db/schema";

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

/** Viewer identity for per-row hydration flags (likedByMe etc.). */
export type ViewerIdentity = { userId: string | null; anonId: string | null };

/** A feed entry under the posts model: one post + its app + app stats. */
export type FeedPost = {
  post: PostRow;
  app: AppRow;
  stats: AppStats;
  likedByMe: boolean;
  savedByMe: boolean;
  followedByMe: boolean;
};

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

/**
 * Interaction types that participate in the App Score. Explicit allowlist —
 * new analytics types (badge_view etc.) must never silently leak into
 * ranking inputs.
 */
const SCORE_INTERACTION_TYPES = [
  "impression",
  "video_complete",
  "skip",
  "try_click",
  "try_return",
  "like",
  "save",
  "share",
] as const;

/**
 * Aggregate interaction/feedback stats per app (D1 has no RLS/views — plain
 * queries). Counts are deduped per identity (namespaced 'u:'/'a:' so user and
 * anon id strings can't collide) — spamming N events from one identity moves
 * a counter by exactly 1. Pass appIds to scope the aggregation (app detail /
 * dashboard pages must not pay for a full-table GROUP BY).
 */
export async function getAppStats(appIds?: string[]): Promise<Map<string, AppStats>> {
  const db = await getDb();
  if (appIds && appIds.length === 0) return new Map();

  const identity = sql`COALESCE('u:' || user_id, 'a:' || anonymous_id)`;

  const [interactionCounts, feedbackRows] = await Promise.all([
    db
      .select({
        appId: schema.interactions.appId,
        type: schema.interactions.type,
        n: sql<number>`COUNT(DISTINCT ${identity})`,
      })
      .from(schema.interactions)
      .where(
        and(
          inArray(schema.interactions.type, [...SCORE_INTERACTION_TYPES]),
          appIds ? inArray(schema.interactions.appId, appIds) : undefined
        )
      )
      .groupBy(schema.interactions.appId, schema.interactions.type),
    db
      .select({
        appId: schema.feedback.appId,
        tags: schema.feedback.tags,
      })
      .from(schema.feedback)
      .where(appIds ? inArray(schema.feedback.appId, appIds) : undefined),
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
 * Posts-model feed: each card is a post (official update or user review)
 * joined to its app. Mix is 30% popular (by App Score) + 30% recent +
 * 40% random, interleaved and deduped per post. Apps in 'unclaimed' status
 * appear in the feed (cold-start curation); 'hidden' apps never do.
 */
export async function getFeedPosts(
  limit = 40,
  viewer?: ViewerIdentity
): Promise<FeedPost[]> {
  const db = await getDb();
  const userId = viewer?.userId ?? null;
  const anonId = viewer?.anonId ?? null;

  // Per-row hydration flags via EXISTS on unique-indexed lookups — one SSR
  // query, no client roundtrip, no like/save/follow state flicker.
  const likedByMe = userId
    ? sql<number>`EXISTS(SELECT 1 FROM likes WHERE likes.post_id = ${schema.posts.id} AND likes.user_id = ${userId})`
    : sql<number>`0`;
  const savedByMe = userId
    ? sql<number>`EXISTS(SELECT 1 FROM saves WHERE saves.app_id = ${schema.apps.id} AND saves.user_id = ${userId})`
    : anonId
      ? sql<number>`EXISTS(SELECT 1 FROM saves WHERE saves.app_id = ${schema.apps.id} AND saves.anonymous_id = ${anonId})`
      : sql<number>`0`;
  const followedByMe = userId
    ? sql<number>`EXISTS(SELECT 1 FROM follows WHERE follows.target_type = 'app' AND follows.target_id = ${schema.apps.id} AND follows.follower_id = ${userId})`
    : sql<number>`0`;

  const rows = await db
    .select({
      post: schema.posts,
      app: schema.apps,
      likedByMe,
      savedByMe,
      followedByMe,
    })
    .from(schema.posts)
    .innerJoin(schema.apps, eq(schema.posts.appId, schema.apps.id))
    .where(
      sql`${schema.posts.status} = 'published' AND ${schema.apps.status} IN ('published', 'unclaimed')`
    )
    .orderBy(sql`${schema.posts.createdAt} desc`)
    // Candidate pool cap: the mix is built from the newest 200 posts, so a
    // growing catalog can't turn every home render into a full-table read.
    // (seed-window pagination lands when the pool itself overflows.)
    .limit(200);

  // Stats scoped to the candidate pool — never a full-table aggregate.
  const statsMap = await getAppStats([...new Set(rows.map((r) => r.app.id))]);

  const withStats: FeedPost[] = rows.map((r) => ({
    post: r.post,
    app: r.app,
    stats: statsMap.get(r.app.id) ?? emptyStats(),
    likedByMe: !!r.likedByMe,
    savedByMe: !!r.savedByMe,
    followedByMe: !!r.followedByMe,
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

  const out: FeedPost[] = [];
  const used = new Set<string>();
  const take = (pool: FeedPost[], max: number) => {
    let taken = 0;
    for (const item of pool) {
      if (out.length >= n || taken >= max) break;
      if (used.has(item.post.id)) continue;
      used.add(item.post.id);
      out.push(item);
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

