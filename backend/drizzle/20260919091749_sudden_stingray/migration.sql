ALTER TABLE "shops" ADD COLUMN "profile_image" text;--> statement-breakpoint
ALTER TABLE "shops" ADD COLUMN "plan" varchar(20) DEFAULT 'free' NOT NULL;