CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`post_id` integer,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`size` text NOT NULL,
	`dims` text DEFAULT '' NOT NULL,
	`duration` text,
	`file_key` text,
	`url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`body` text,
	`wordCount` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`blog_title` text,
	`domain` text,
	`bio` text,
	`accent_color` text DEFAULT '#7c3aed' NOT NULL,
	`default_model` text DEFAULT 'google/gemini-2.5-flash' NOT NULL,
	`seo_meta` integer DEFAULT true NOT NULL,
	`rss_feed` integer DEFAULT true NOT NULL,
	`reading_time` integer DEFAULT false NOT NULL,
	`allowed_origins` text,
	`umami_share_url` text,
	`bucket_name` text,
	`public_url` text,
	`account_id` text,
	`writing_style` text,
	`writing_sample` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `todos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
