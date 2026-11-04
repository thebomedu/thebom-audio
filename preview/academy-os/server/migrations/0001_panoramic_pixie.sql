CREATE TABLE `parent_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`resource_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`payload` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parent_links_token_hash_unique` ON `parent_links` (`token_hash`);