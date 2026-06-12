import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// better-auth core tables (names/columns follow better-auth's drizzle adapter)
// ---------------------------------------------------------------------------

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  /** Notification badge baseline: posts newer than this count toward the badge. */
  lastNotifCheckAt: integer("last_notif_check_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** Reserved system user that owns curated (unclaimed) apps and their official
 * posts. Seeded by migration 0001. Claim flow reassigns makerId to the real
 * maker. An app is "unclaimed" iff status === 'unclaimed' — makerId stays
 * NOT NULL (D1/SQLite can't drop the constraint without a table rebuild). */
export const GLIM_SYSTEM_USER_ID = "glim-system";

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp_ms",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp_ms",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

// ---------------------------------------------------------------------------
// Glim tables
// ---------------------------------------------------------------------------

export type MakerLinks = { website?: string; x?: string; github?: string };

export const apps = sqliteTable(
  "apps",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    /** R2-hosted (or external) mp4 demo. Preferred playback source. */
    demoVideoUrl: text("demo_video_url"),
    /** Optional YouTube link, used as fallback playback (may show ads/branding). */
    youtubeUrl: text("youtube_url"),
    thumbnailUrl: text("thumbnail_url"),
    category: text("category").notNull(),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
    makerId: text("maker_id")
      .notNull()
      .references(() => user.id),
    makerName: text("maker_name").notNull(),
    makerLinks: text("maker_links", { mode: "json" }).$type<MakerLinks>(),
    guestModeAvailable: integer("guest_mode_available", { mode: "boolean" })
      .notNull()
      .default(false),
    noLoginTrialAvailable: integer("no_login_trial_available", {
      mode: "boolean",
    })
      .notNull()
      .default(false),
    embeddable: integer("embeddable", { mode: "boolean" })
      .notNull()
      .default(true),
    /** 'unclaimed' = curated app whose maker hasn't claimed it yet
     * (makerId = GLIM_SYSTEM_USER_ID until claimed). Feed shows
     * unclaimed + published; hidden is excluded everywhere. */
    status: text("status", {
      enum: ["unclaimed", "draft", "published", "hidden"],
    })
      .notNull()
      .default("published"),
    /** App logo/avatar shown on profile pages and feed overlay. */
    iconUrl: text("icon_url"),
    /** Cached counters — updated in the same write as follows/saves
     * (application layer, no triggers). Source of truth: follows/saves. */
    followerCount: integer("follower_count").notNull().default(0),
    saveCount: integer("save_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("apps_status_idx").on(t.status),
    index("apps_maker_idx").on(t.makerId),
    index("apps_created_idx").on(t.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// Platform v2: posts (content units), likes, follows, comments, saves,
// notifications. Apps are identity (follow/save targets); posts are content
// (like/comment targets). See design doc: Glim — Platform Architecture v2.
// ---------------------------------------------------------------------------

export const POST_TYPES = ["official", "review"] as const;
export type PostType = (typeof POST_TYPES)[number];

export const MEDIA_TYPES = ["video", "images"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

/** A post is one feed card: a maker update, feature demo, or user review.
 * type='official' is only allowed when authorId === apps.makerId or
 * authorId === GLIM_SYSTEM_USER_ID (enforced server-side). */
export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    type: text("type", { enum: POST_TYPES }).notNull(),
    /** v1 moderation: operator can hide spam UGC without deleting it. */
    status: text("status", { enum: ["published", "hidden"] })
      .notNull()
      .default("published"),
    mediaType: text("media_type", { enum: MEDIA_TYPES }).notNull(),
    videoUrl: text("video_url"),
    /** Up to 5 image URLs (JPEG/PNG/WebP, ≤5MB each), JSON array.
     * TEXT-as-JSON is fine for v1 read patterns on D1. */
    imageUrls: text("image_urls", { mode: "json" }).$type<string[]>(),
    thumbnailUrl: text("thumbnail_url"),
    caption: text("caption"),
    /** Cached counters — updated in the same write as likes/comments. */
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("posts_app_idx").on(t.appId, t.createdAt),
    index("posts_feed_idx").on(t.status, t.createdAt),
    index("posts_author_idx").on(t.authorId),
  ]
);

/** Likes are per-post and require login (anonymous tap → login prompt;
 * intentional asymmetry with saves, which allow anonymous). */
export const likes = sqliteTable(
  "likes",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("likes_post_user_idx").on(t.postId, t.userId),
    index("likes_post_idx").on(t.postId),
    index("likes_user_idx").on(t.userId),
  ]
);

export const FOLLOW_TARGET_TYPES = ["app", "user"] as const;
export type FollowTargetType = (typeof FOLLOW_TARGET_TYPES)[number];

/** Follow an app (all its posts hit your following feed) or a user
 * (all posts they author hit your following feed). */
export const follows = sqliteTable(
  "follows",
  {
    id: text("id").primaryKey(),
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id),
    targetType: text("target_type", { enum: FOLLOW_TARGET_TYPES }).notNull(),
    targetId: text("target_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("follows_unique_idx").on(t.followerId, t.targetType, t.targetId),
    index("follows_follower_idx").on(t.followerId),
    index("follows_target_idx").on(t.targetType, t.targetId),
  ]
);

/** Per-post comments with one level of replies (parentId set = reply;
 * replies to replies are not allowed — enforced server-side). */
export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    parentId: text("parent_id"),
    body: text("body").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("comments_post_idx").on(t.postId, t.createdAt),
    index("comments_author_idx").on(t.authorId),
  ]
);

/** App-level saves ("watch later"), permanent across posts. Anonymous saves
 * carry anonymousId; on login they are merged into the user's saves.
 * Dedupe via two partial unique indexes (SQLite treats NULLs as distinct). */
export const saves = sqliteTable(
  "saves",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id),
    anonymousId: text("anonymous_id"),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("saves_user_app_idx")
      .on(t.userId, t.appId)
      .where(sql`user_id IS NOT NULL`),
    uniqueIndex("saves_anon_app_idx")
      .on(t.anonymousId, t.appId)
      .where(sql`anonymous_id IS NOT NULL`),
    index("saves_app_idx").on(t.appId),
  ]
);

export const NOTIFICATION_TYPES = [
  "comment",
  "reply",
  "follow",
  "claim_approved",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** In-app notifications (v1). 'new post from followed app' is NOT stored —
 * the badge derives it at read time from follows × posts to avoid fan-out. */
export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    postId: text("post_id"),
    actorId: text("actor_id"),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("notifications_recipient_idx").on(t.recipientId, t.read, t.createdAt),
  ]
);

export const INTERACTION_TYPES = [
  "impression",
  "video_start",
  "video_complete",
  "skip",
  "like",
  "save",
  "share",
  "try_click",
  "try_return",
  "feedback_submit",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const interactions = sqliteTable(
  "interactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id),
    anonymousId: text("anonymous_id"),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    type: text("type", { enum: INTERACTION_TYPES }).notNull(),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("interactions_app_idx").on(t.appId, t.type),
    index("interactions_anon_idx").on(t.anonymousId),
    index("interactions_user_idx").on(t.userId),
    index("interactions_created_idx").on(t.createdAt),
  ]
);

export const FEEDBACK_TAGS = [
  "useful",
  "interesting",
  "confusing",
  "buggy",
  "login_blocked",
  "too_slow",
  "not_for_me",
] as const;
export type FeedbackTag = (typeof FEEDBACK_TAGS)[number];

export const feedback = sqliteTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id),
    anonymousId: text("anonymous_id"),
    rating: text("rating", { enum: ["positive", "neutral", "negative"] }),
    tags: text("tags", { mode: "json" }).$type<FeedbackTag[]>().notNull().default([]),
    comment: text("comment"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("feedback_app_idx").on(t.appId),
    index("feedback_anon_idx").on(t.anonymousId),
    index("feedback_user_idx").on(t.userId),
  ]
);

/** A maker's request to own a curated (unclaimed) app. v1 approval is a
 * manual operator action via the token-guarded /api/claims/approve. */
export const claimRequests = sqliteTable(
  "claim_requests",
  {
    id: text("id").primaryKey(),
    appId: text("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    proofUrl: text("proof_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("claim_requests_app_idx").on(t.appId, t.status),
    index("claim_requests_user_idx").on(t.userId),
  ]
);

export type AppRow = typeof apps.$inferSelect;
export type InteractionRow = typeof interactions.$inferSelect;
export type FeedbackRow = typeof feedback.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type LikeRow = typeof likes.$inferSelect;
export type FollowRow = typeof follows.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;
export type SaveRow = typeof saves.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
