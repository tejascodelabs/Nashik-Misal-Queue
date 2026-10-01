CREATE TABLE "staff" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"mobile_no" varchar(20),
	"gender" varchar(20),
	"sub_role" varchar(50),
	"is_suspended" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "staff_user_id_unique" ON "staff" ("user_id");--> statement-breakpoint
CREATE INDEX "staff_shop_id_idx" ON "staff" ("shop_id");--> statement-breakpoint
CREATE INDEX "staff_is_suspended_idx" ON "staff" ("is_suspended");--> statement-breakpoint
CREATE INDEX "staff_is_archived_idx" ON "staff" ("is_archived");--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_shop_id_shops_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE;