CREATE TYPE "shop_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "shops" (
	"id" serial PRIMARY KEY,
	"owner_id" integer NOT NULL,
	"shop_name" varchar(150) NOT NULL,
	"owner_name" varchar(100) NOT NULL,
	"phone_no" varchar(20) NOT NULL,
	"alt_phone_no" varchar(20),
	"address" text NOT NULL,
	"opening_time" time NOT NULL,
	"closing_time" time NOT NULL,
	"initial_rating" numeric(2,1) DEFAULT '0.0' NOT NULL,
	"total_reviews" integer DEFAULT 0 NOT NULL,
	"direction_url" text,
	"images" text[],
	"status" "shop_status" DEFAULT 'active'::"shop_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "shops_owner_id_idx" ON "shops" ("owner_id");--> statement-breakpoint
CREATE INDEX "shops_shop_name_idx" ON "shops" ("shop_name");--> statement-breakpoint
CREATE INDEX "shops_phone_no_idx" ON "shops" ("phone_no");--> statement-breakpoint
CREATE INDEX "shops_status_idx" ON "shops" ("status");--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;