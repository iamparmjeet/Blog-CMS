ALTER TABLE `user` ADD `owner_claim` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `user_owner_claim_unique` ON `user` (`owner_claim`);