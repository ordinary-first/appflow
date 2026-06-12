-- Claim flow: a maker requests ownership of a curated (unclaimed) app.
-- v1 verification is manual operator review (domain-email automation later) —
-- the claimant supplies a proof URL (their Twitter/PH/site) and the operator
-- approves via the token-guarded /api/claims/approve endpoint.
CREATE TABLE `claim_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`proof_url` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
CREATE INDEX `claim_requests_app_idx` ON `claim_requests` (`app_id`,`status`);--> statement-breakpoint
CREATE INDEX `claim_requests_user_idx` ON `claim_requests` (`user_id`);
