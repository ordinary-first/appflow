-- Platform v2: apps become identity (follow/save targets), posts become
-- content (like/comment targets). See design doc: Glim — Platform Architecture v2.

-- 1. user: notification badge baseline
ALTER TABLE `user` ADD COLUMN `last_notif_check_at` integer;--> statement-breakpoint

-- 2. apps: icon + cached counters (status enum widened to 'unclaimed' is app-layer only)
ALTER TABLE `apps` ADD COLUMN `icon_url` text;--> statement-breakpoint
ALTER TABLE `apps` ADD COLUMN `follower_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `apps` ADD COLUMN `save_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint

-- 3. seed the reserved system user that owns curated/unclaimed apps
INSERT OR IGNORE INTO `user` (`id`, `name`, `email`, `email_verified`, `created_at`, `updated_at`)
VALUES ('glim-system', 'Glim', 'system@glim.app', 1, strftime('%s','now') * 1000, strftime('%s','now') * 1000);--> statement-breakpoint

-- 4. posts
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`author_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`media_type` text NOT NULL,
	`video_url` text,
	`image_urls` text,
	`thumbnail_url` text,
	`caption` text,
	`like_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `posts_app_idx` ON `posts` (`app_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_feed_idx` ON `posts` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `posts_author_idx` ON `posts` (`author_id`);--> statement-breakpoint

-- 5. likes (login required; unique per post+user)
CREATE TABLE `likes` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `likes_post_user_idx` ON `likes` (`post_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `likes_post_idx` ON `likes` (`post_id`);--> statement-breakpoint
CREATE INDEX `likes_user_idx` ON `likes` (`user_id`);--> statement-breakpoint

-- 6. follows (app or user target)
CREATE TABLE `follows` (
	`id` text PRIMARY KEY NOT NULL,
	`follower_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX `follows_unique_idx` ON `follows` (`follower_id`,`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `follows_follower_idx` ON `follows` (`follower_id`);--> statement-breakpoint
CREATE INDEX `follows_target_idx` ON `follows` (`target_type`,`target_id`);--> statement-breakpoint

-- 7. comments (one reply level; parent_id null = top-level)
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`author_id` text NOT NULL,
	`parent_id` text,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `comments_post_idx` ON `comments` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `comments_author_idx` ON `comments` (`author_id`);--> statement-breakpoint

-- 8. saves (app-level, anonymous allowed; partial unique indexes for dedupe)
CREATE TABLE `saves` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`anonymous_id` text,
	`app_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	CHECK (`user_id` IS NOT NULL OR `anonymous_id` IS NOT NULL)
);--> statement-breakpoint
CREATE UNIQUE INDEX `saves_user_app_idx` ON `saves` (`user_id`,`app_id`) WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `saves_anon_app_idx` ON `saves` (`anonymous_id`,`app_id`) WHERE anonymous_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX `saves_app_idx` ON `saves` (`app_id`);--> statement-breakpoint

-- 9. notifications (in-app v1; no 'new_post' fan-out rows)
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_id` text NOT NULL,
	`type` text NOT NULL,
	`post_id` text,
	`actor_id` text,
	`read` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`recipient_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `notifications_recipient_idx` ON `notifications` (`recipient_id`,`read`,`created_at`);--> statement-breakpoint

-- 10. backfill: one official post per existing app (deterministic id 'post-<appId>')
INSERT INTO `posts` (`id`, `app_id`, `author_id`, `type`, `status`, `media_type`, `video_url`, `thumbnail_url`, `caption`, `created_at`)
SELECT
	'post-' || `id`,
	`id`,
	`maker_id`,
	'official',
	'published',
	'video',
	COALESCE(`demo_video_url`, `youtube_url`),
	`thumbnail_url`,
	`tagline`,
	`created_at`
FROM `apps`;--> statement-breakpoint

-- 11. migrate legacy save interactions → saves (dedupe to earliest per identity+app)
INSERT OR IGNORE INTO `saves` (`id`, `user_id`, `anonymous_id`, `app_id`, `created_at`)
SELECT
	'save-' || MIN(`id`),
	`user_id`,
	CASE WHEN `user_id` IS NULL THEN `anonymous_id` ELSE NULL END,
	`app_id`,
	MIN(`created_at`)
FROM `interactions`
WHERE `type` = 'save' AND (`user_id` IS NOT NULL OR `anonymous_id` IS NOT NULL)
GROUP BY COALESCE(`user_id`, `anonymous_id`), `app_id`;--> statement-breakpoint

-- 12. migrate legacy like interactions (logged-in only; anonymous likes dropped)
--     target = the auto-created official post for that app
INSERT OR IGNORE INTO `likes` (`id`, `post_id`, `user_id`, `created_at`)
SELECT
	'like-' || MIN(`id`),
	'post-' || `app_id`,
	`user_id`,
	MIN(`created_at`)
FROM `interactions`
WHERE `type` = 'like' AND `user_id` IS NOT NULL
GROUP BY `user_id`, `app_id`;--> statement-breakpoint

-- 13. refresh cached counters from the migrated rows
UPDATE `posts` SET `like_count` = (
	SELECT COUNT(*) FROM `likes` WHERE `likes`.`post_id` = `posts`.`id`
);--> statement-breakpoint
UPDATE `apps` SET `save_count` = (
	SELECT COUNT(*) FROM `saves` WHERE `saves`.`app_id` = `apps`.`id`
);
