CREATE TABLE `academy_memberships` (
	`email` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`role` text NOT NULL,
	`entity_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
