ALTER TABLE "shops" ADD COLUMN "user_id" integer;--> statement-breakpoint
UPDATE "shops" SET "user_id" = "owner_id";--> statement-breakpoint
ALTER TABLE "shops" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "shops_user_id_idx" ON "shops" ("user_id");--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;