CREATE TABLE `environment_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`label` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `night_tags` (
	`night_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`night_id`, `tag_id`),
	FOREIGN KEY (`night_id`) REFERENCES `nights`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `night_tags_tag_idx` ON `night_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `nights` (
	`id` text PRIMARY KEY NOT NULL,
	`wake_date` text NOT NULL,
	`bedtime_at` integer NOT NULL,
	`sleep_latency_min` integer NOT NULL,
	`awakenings` text NOT NULL,
	`final_wake_at` integer NOT NULL,
	`out_of_bed_at` integer NOT NULL,
	`quality` integer NOT NULL,
	`note` text,
	`bed_offset_min` integer NOT NULL,
	`wake_offset_min` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nights_wake_date_unique` ON `nights` (`wake_date`);--> statement-breakpoint
CREATE INDEX `nights_bedtime_idx` ON `nights` (`bedtime_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text,
	`label` text,
	`enabled` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_key_unique` ON `tags` (`key`);--> statement-breakpoint
CREATE TABLE `wake_events` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	`night_id` text,
	FOREIGN KEY (`night_id`) REFERENCES `nights`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `wake_events_started_idx` ON `wake_events` (`started_at`);