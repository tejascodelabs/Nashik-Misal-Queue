CREATE TYPE "menu_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "menus" (
	"id" serial PRIMARY KEY,
	"owner_id" integer NOT NULL,
	"shop_id" integer NOT NULL,
	"name" varchar(150) NOT NULL,
	"description" text,
	"category" varchar(100),
	"price" numeric(10,2) NOT NULL,
	"is_discount" boolean DEFAULT false NOT NULL,
	"discount_price" numeric(10,2),
	"image" text,
	"status" "menu_status" DEFAULT 'active'::"menu_status" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "menus_shop_id_idx" ON "menus" ("shop_id");--> statement-breakpoint
CREATE INDEX "menus_name_idx" ON "menus" ("name");--> statement-breakpoint
CREATE INDEX "menus_category_idx" ON "menus" ("category");--> statement-breakpoint
CREATE INDEX "menus_status_idx" ON "menus" ("status");--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_owner_id_users_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "menus" ADD CONSTRAINT "menus_shop_id_shops_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE;