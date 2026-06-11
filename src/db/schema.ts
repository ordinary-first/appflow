import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

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
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

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
    status: text("status", { enum: ["draft", "published", "hidden"] })
      .notNull()
      .default("published"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    index("apps_status_idx").on(t.status),
    index("apps_maker_idx").on(t.makerId),
    index("apps_created_idx").on(t.createdAt),
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

export type AppRow = typeof apps.$inferSelect;
export type InteractionRow = typeof interactions.$inferSelect;
export type FeedbackRow = typeof feedback.$inferSelect;
