CREATE TABLE `feedback_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`urgency` integer NOT NULL,
	`message` text NOT NULL,
	`page_path` text NOT NULL,
	`page_title` text DEFAULT '' NOT NULL,
	`context_kind` text DEFAULT '' NOT NULL,
	`context_id` text DEFAULT '' NOT NULL,
	`context_title` text DEFAULT '' NOT NULL,
	`reporter_id` text,
	`reporter_name` text,
	`source_key` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_feedback_status_created` ON `feedback_submissions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_feedback_source_created` ON `feedback_submissions` (`source_key`,`created_at`);