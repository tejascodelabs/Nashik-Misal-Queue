CREATE TABLE "tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"shop_id" integer NOT NULL,
	"mobile" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"token_no" integer NOT NULL,
	"group_size" integer DEFAULT 1 NOT NULL,
	"queue_type" varchar(5) NOT NULL,
	"status" varchar(20) DEFAULT 'waiting',
	"alerted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"customer_arrived" boolean DEFAULT false,
	"final_call" boolean DEFAULT false,
	"counter_arrived" boolean DEFAULT false,
	"call_timeout" boolean DEFAULT false,
	"called_by_staff_name" text,
	"called_at" timestamp with time zone,
	"fcm_token" text,
	"expired_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"expires_at" timestamp with time zone,
	"queue_date" date DEFAULT CURRENT_DATE NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "tokens_shop_date_queue_unique" ON "tokens" ("shop_id","queue_date","queue_type","token_no");--> statement-breakpoint
CREATE INDEX "tokens_mobile_idx" ON "tokens" ("mobile");--> statement-breakpoint
CREATE INDEX "tokens_status_idx" ON "tokens" ("status");--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_shop_id_shops_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE;