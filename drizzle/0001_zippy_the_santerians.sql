CREATE TABLE `activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`rating` integer,
	`data` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activity_user_idx` ON `activity` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `activity_created_idx` ON `activity` (`created_at`);--> statement-breakpoint
CREATE TABLE `follow` (
	`follower_id` text NOT NULL,
	`following_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`follower_id`, `following_id`),
	FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`following_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `follow_following_idx` ON `follow` (`following_id`);--> statement-breakpoint
CREATE TABLE `list` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`is_public` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `list_user_idx` ON `list` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `list_item` (
	`list_id` text NOT NULL,
	`media_type` text NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`release_date` text,
	`note` text,
	`position` integer NOT NULL,
	`added_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`list_id`, `media_type`, `tmdb_id`),
	FOREIGN KEY (`list_id`) REFERENCES `list`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profile` (
	`user_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`bio` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_username_unique` ON `profile` (`username`);--> statement-breakpoint
ALTER TABLE `library_item` ADD `review` text;--> statement-breakpoint
ALTER TABLE `library_item` ADD `review_spoiler` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `library_item` ADD `reviewed_at` integer;--> statement-breakpoint
CREATE INDEX `library_title_idx` ON `library_item` (`media_type`,`tmdb_id`);