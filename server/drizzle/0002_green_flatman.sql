ALTER TABLE "refresh_tokens" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "refresh_tokens" CASCADE;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "password_hash";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "token_version";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id");