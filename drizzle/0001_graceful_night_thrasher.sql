ALTER TABLE `teachers` ADD `role` text DEFAULT 'teacher' NOT NULL;--> statement-breakpoint
ALTER TABLE `teachers` ADD `deleted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tutorials` ADD `deleted` integer DEFAULT 0 NOT NULL;