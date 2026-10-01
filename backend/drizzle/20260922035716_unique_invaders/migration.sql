DROP INDEX "shops_phone_no_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_no" varchar(20);--> statement-breakpoint
UPDATE "users" AS u
SET "phone_no" = COALESCE(
	(SELECT s."phone_no" FROM "shops" AS s WHERE s."owner_id" = u."id" LIMIT 1),
	(SELECT st."mobile_no" FROM "staff" AS st WHERE st."user_id" = u."id" LIMIT 1),
	'legacy_' || u."id"
);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "phone_no" SET NOT NULL;--> statement-breakpoint
WITH duplicate_phones AS (
	SELECT "id", row_number() OVER (
		PARTITION BY "phone_no"
		ORDER BY "id"
	) AS duplicate_number
	FROM "users"
)
UPDATE "users" AS u
SET "phone_no" = 'legacy_' || u."id"
FROM duplicate_phones AS d
WHERE u."id" = d."id" AND d.duplicate_number > 1;--> statement-breakpoint
ALTER TABLE "shops" DROP COLUMN "phone_no";--> statement-breakpoint
ALTER TABLE "staff" DROP COLUMN "mobile_no";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_no_key" UNIQUE("phone_no");--> statement-breakpoint
CREATE INDEX "users_phone_no_idx" ON "users" ("phone_no");