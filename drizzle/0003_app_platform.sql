ALTER TABLE `apps` ADD COLUMN `platform` text NOT NULL DEFAULT 'web';
--> statement-breakpoint
ALTER TABLE `apps` ADD COLUMN `store_urls` text;
