ALTER TABLE `tutorials` ADD `sort_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH ranked AS (SELECT id,ROW_NUMBER() OVER (PARTITION BY folder_id ORDER BY updated_at DESC,id) AS position FROM tutorials) UPDATE tutorials SET sort_order=(SELECT position FROM ranked WHERE ranked.id=tutorials.id);
