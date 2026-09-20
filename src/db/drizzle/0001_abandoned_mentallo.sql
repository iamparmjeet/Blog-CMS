-- Retain invalid legacy rows without treating them as drafts or exposing them.
UPDATE `posts`
SET `status` = 'archived'
WHERE `status` NOT IN ('draft', 'published', 'scheduled', 'archived');
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`body` text,
	`description` text DEFAULT '' NOT NULL,
	`published_at` integer,
	`scheduled_at` integer,
	`wordCount` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "posts_status_valid" CHECK("__new_posts"."status" in ('draft', 'published', 'scheduled', 'archived'))
);
--> statement-breakpoint
INSERT INTO `__new_posts`(
	"id",
	"user_id",
	"title",
	"slug",
	"status",
	"body",
	"wordCount",
	"revision",
	"deleted_at",
	"created_at",
	"updated_at"
)
SELECT
	"id",
	"user_id",
	"title",
	"slug",
	"status",
	"body",
	"wordCount",
	"revision",
	"deleted_at",
	"created_at",
	"updated_at"
FROM `posts`;
--> statement-breakpoint
DROP TABLE `posts`;--> statement-breakpoint
ALTER TABLE `__new_posts` RENAME TO `posts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `posts_user_id_slug_unique` ON `posts` (`user_id`,`slug`);
