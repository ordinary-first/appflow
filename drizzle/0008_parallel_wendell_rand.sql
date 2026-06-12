CREATE TABLE `app_daily_stats` (
	`app_id` text NOT NULL,
	`date` text NOT NULL,
	`viewers` integer DEFAULT 0 NOT NULL,
	`triers` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`app_id`, `date`),
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
