CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `apps` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`description` text,
	`url` text NOT NULL,
	`demo_video_url` text,
	`youtube_url` text,
	`thumbnail_url` text,
	`category` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`maker_id` text NOT NULL,
	`maker_name` text NOT NULL,
	`maker_links` text,
	`guest_mode_available` integer DEFAULT false NOT NULL,
	`no_login_trial_available` integer DEFAULT false NOT NULL,
	`embeddable` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`maker_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apps_slug_unique` ON `apps` (`slug`);--> statement-breakpoint
CREATE INDEX `apps_status_idx` ON `apps` (`status`);--> statement-breakpoint
CREATE INDEX `apps_maker_idx` ON `apps` (`maker_id`);--> statement-breakpoint
CREATE INDEX `apps_created_idx` ON `apps` (`created_at`);--> statement-breakpoint
CREATE TABLE `feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`user_id` text,
	`anonymous_id` text,
	`rating` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `feedback_app_idx` ON `feedback` (`app_id`);--> statement-breakpoint
CREATE INDEX `feedback_anon_idx` ON `feedback` (`anonymous_id`);--> statement-breakpoint
CREATE INDEX `feedback_user_idx` ON `feedback` (`user_id`);--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`anonymous_id` text,
	`app_id` text NOT NULL,
	`type` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interactions_app_idx` ON `interactions` (`app_id`,`type`);--> statement-breakpoint
CREATE INDEX `interactions_anon_idx` ON `interactions` (`anonymous_id`);--> statement-breakpoint
CREATE INDEX `interactions_user_idx` ON `interactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `interactions_created_idx` ON `interactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer,
	`updated_at` integer
);
