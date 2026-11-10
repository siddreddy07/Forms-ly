ALTER TABLE "forms" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_slug_unique" UNIQUE("slug");