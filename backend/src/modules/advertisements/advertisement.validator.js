import { z } from "zod";

export const createAdvertisementSchema = z
  .object({
    event_title: z
      .string()
      .trim()
      .min(1, "Event title is required")
      .max(255),

    image_url: z
      .string()
      .trim()
      .min(1, "Image URL is required"),

    redirect_url: z
      .string()
      .trim()
      .url("Invalid redirect URL")
      .optional()
      .or(z.literal("")),

    cta_text: z
      .string()
      .trim()
      .max(100)
      .optional()
      .or(z.literal("")),

    shop_id: z
      .coerce
      .number()
      .int()
      .positive()
      .nullable()
      .optional(),

    placement: z.enum([
      "shop_list",
      "checkout",
      "home_top",
    ]),

    display_order: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    start_date: z
      .string()
      .optional()
      .or(z.literal("")),

    end_date: z
      .string()
      .optional()
      .or(z.literal("")),

    is_active: z.coerce
      .boolean()
      .default(true),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) {
        return true;
      }

      return new Date(data.end_date) >= new Date(data.start_date);
    },
    {
      message: "End date cannot be before start date",
      path: ["end_date"],
    }
  );

export const updateAdvertisementSchema =
  createAdvertisementSchema.partial();