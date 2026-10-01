CREATE TYPE "queue_status" AS ENUM('start', 'pause');--> statement-breakpoint
CREATE TYPE "shop_open_status" AS ENUM('open', 'close');--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "shop_status" "shop_open_status" DEFAULT 'open'::"shop_open_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "queue_status" "queue_status" DEFAULT 'start'::"queue_status" NOT NULL;