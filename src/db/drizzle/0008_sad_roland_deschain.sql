PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`blog_title` text,
	`domain` text,
	`bio` text,
	`accent_color` text DEFAULT '#0867f2' NOT NULL,
	`theme_mode` text DEFAULT 'day' NOT NULL,
	`surface_tint` text,
	`default_model` text DEFAULT 'z-ai/glm-5.3-flash' NOT NULL,
	`seo_meta` integer DEFAULT true NOT NULL,
	`rss_feed` integer DEFAULT true NOT NULL,
	`time_zone` text DEFAULT 'Asia/Kolkata' NOT NULL,
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
INSERT INTO `__new_settings`("user_id", "display_name", "blog_title", "domain", "bio", "accent_color", "theme_mode", "surface_tint", "default_model", "seo_meta", "rss_feed", "time_zone", "reading_time", "allowed_origins", "umami_share_url", "bucket_name", "public_url", "account_id", "writing_style", "writing_sample", "updated_at") SELECT "user_id", "display_name", "blog_title", "domain", "bio", "accent_color", "theme_mode", "surface_tint", "default_model", "seo_meta", "rss_feed", "time_zone", "reading_time", "allowed_origins", "umami_share_url", "bucket_name", "public_url", "account_id", "writing_style", "writing_sample", "updated_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
UPDATE `settings` SET `accent_color` = '#0867f2' WHERE `accent_color` = '#7c3aed';
