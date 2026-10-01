CREATE TYPE "advertisement_placement" AS ENUM('shop_list', 'checkout', 'home_top');--> statement-breakpoint
CREATE TABLE "advertisements" (
	"id" serial PRIMARY KEY,
	"event_title" varchar(255) NOT NULL,
	"image_url" text NOT NULL,
	"redirect_url" text,
	"cta_text" varchar(100),
	"shop_id" integer,
	"placement" "advertisement_placement" DEFAULT 'shop_list'::"advertisement_placement" NOT NULL,
	"display_order" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "advertisements_placement_idx" ON "advertisements" ("placement");--> statement-breakpoint
CREATE INDEX "advertisements_active_idx" ON "advertisements" ("is_active");--> statement-breakpoint
CREATE INDEX "advertisements_shop_idx" ON "advertisements" ("shop_id");--> statement-breakpoint
CREATE INDEX "advertisements_date_idx" ON "advertisements" ("start_date","end_date");