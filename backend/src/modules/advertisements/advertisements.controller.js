import { db } from "../../db/index.js";
import { advertisements, } from "../../db/schema.js";

import { eq, and, desc, asc, ilike, or, sql, } from "drizzle-orm";

// ===============================
// CREATE
// ===============================

export const createAdvertisement = async (req, res) => {
    try {
        const {
            event_title,
            eventTitle,
            image_url,
            imageUrl,
            redirect_url,
            redirectUrl,
            cta_text,
            ctaText,
            shop_id,
            shopId,
            placement,
            display_order,
            displayOrder,
            start_date,
            startDate,
            end_date,
            endDate,
            is_active,
            isActive,
        } = req.body;

        const eventTitleValue = event_title ?? eventTitle;
        const imageUrlValue = req.file
            ? `/uploads/advertisements/${req.file.filename}`
            : image_url ?? imageUrl;

        if (!eventTitleValue?.trim()) {
            return res.status(400).json({
                success: false,
                message: "event_title is required",
            });
        }

        if (!imageUrlValue?.trim()) {
            return res.status(400).json({
                success: false,
                message: "An advertisement image is required",
            });
        }

        const [advertisement] = await db
            .insert(advertisements)
            .values({
                eventTitle: eventTitleValue.trim(),
                imageUrl: imageUrlValue.trim(),
                redirectUrl: (redirect_url ?? redirectUrl) || null,
                ctaText: (cta_text ?? ctaText) || null,
                shopId: (shop_id ?? shopId) || null,
                placement,
                displayOrder: Number(display_order ?? displayOrder) || 1,
                startDate: (start_date ?? startDate)
                    ? new Date(start_date ?? startDate)
                    : null,
                endDate: (end_date ?? endDate)
                    ? new Date(end_date ?? endDate)
                    : null,
                isActive:
                    (is_active ?? isActive) === undefined
                        ? true
                        : (is_active ?? isActive) === true ||
                          (is_active ?? isActive) === "true",
            })
            .returning();

        return res.status(201).json({
            success: true,
            message: "Advertisement created successfully",
            data: advertisement,
        });
    } catch (error) {
        console.error(
            "createAdvertisement:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create advertisement",
            error: error.message,
        });
    }
};

// ===============================
// GET ALL
// ===============================

export const getAllAdvertisements = async (req, res) => {
    try {
        const {
            search = "",
            placement,
            shop_id,
            is_active,
            page = 1,
            limit = 10,
        } = req.query;

        const pageNumber = Math.max(Number(page), 1);

        const limitNumber = Math.min(
            Math.max(Number(limit), 1),
            100
        );

        const offset = (pageNumber - 1) * limitNumber;

        const conditions = [];

        // Search
        if (search) {
            conditions.push(
                ilike(
                    advertisements.eventTitle,
                    `%${search}%`
                )
            );
        }

        // Placement filter
        if (placement) {
            conditions.push(
                eq(
                    advertisements.placement,
                    placement
                )
            );
        }

        // Shop filter
        if (shop_id) {
            conditions.push(
                eq(
                    advertisements.shopId,
                    Number(shop_id)
                )
            );
        }

        // Active filter
        if (is_active !== undefined) {
            conditions.push(
                eq(
                    advertisements.isActive,
                    is_active === "true"
                )
            );
        }

        const whereCondition =
            conditions.length > 0
                ? and(...conditions)
                : undefined;

        // Get advertisements
        const advertisementsData = await db
            .select()
            .from(advertisements)
            .where(whereCondition)
            .orderBy(
                asc(advertisements.displayOrder),
                desc(advertisements.createdAt)
            )
            .limit(limitNumber)
            .offset(offset);

        // Create base URL
        const baseUrl = `${req.protocol}://${req.get("host")}`;

        // Convert image URL
        const data = advertisementsData.map((advertisement) => ({
            ...advertisement,

            imageUrl: advertisement.imageUrl
                ? `${baseUrl}${advertisement.imageUrl}`
                : null,
        }));

        // Count
        const countResult = await db
            .select({
                count: sql`count(*)`,
            })
            .from(advertisements)
            .where(whereCondition);

        const total = Number(
            countResult[0]?.count || 0
        );

        return res.status(200).json({
            success: true,
            data,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(
                    total / limitNumber
                ),
            },
        });

    } catch (error) {
        console.error(
            "getAllAdvertisements:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch advertisements",
            error: error.message,
        });
    }
};

// ===============================
// GET BY ID
// ===============================

export const getAdvertisementById = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const [advertisement] = await db
            .select()
            .from(advertisements)
            .where(
                eq(
                    advertisements.id,
                    Number(id)
                )
            )
            .limit(1);

        if (!advertisement) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        return res.status(200).json({
            success: true,
            data: advertisement,
        });
    } catch (error) {
        console.error(
            "getAdvertisementById:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch advertisement",
            error: error.message,
        });
    }
};

// ===============================
// UPDATE
// ===============================

export const updateAdvertisement = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const {
            event_title,
            image_url,
            redirect_url,
            cta_text,
            shop_id,
            placement,
            display_order,
            start_date,
            end_date,
            is_active,
        } = req.body;

        const updateData = {
            updatedAt: new Date(),
        };

        if (event_title !== undefined) {
            updateData.eventTitle = event_title;
        }

        if (image_url !== undefined || req.file) {
            updateData.imageUrl = req.file
                ? `/uploads/advertisements/${req.file.filename}`
                : image_url;
        }

        if (redirect_url !== undefined) {
            updateData.redirectUrl =
                redirect_url || null;
        }

        if (cta_text !== undefined) {
            updateData.ctaText =
                cta_text || null;
        }

        if (shop_id !== undefined) {
            updateData.shopId =
                shop_id ? Number(shop_id) : null;
        }

        if (placement !== undefined) {
            updateData.placement = placement;
        }

        if (display_order !== undefined) {
            updateData.displayOrder =
                Number(display_order);
        }

        if (start_date !== undefined) {
            updateData.startDate =
                start_date
                    ? new Date(start_date)
                    : null;
        }

        if (end_date !== undefined) {
            updateData.endDate =
                end_date
                    ? new Date(end_date)
                    : null;
        }

        if (is_active !== undefined) {
            updateData.isActive =
                Boolean(is_active);
        }

        const [updated] = await db
            .update(advertisements)
            .set(updateData)
            .where(
                eq(
                    advertisements.id,
                    Number(id)
                )
            )
            .returning();

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Advertisement updated successfully",
            data: updated,
        });
    } catch (error) {
        console.error(
            "updateAdvertisement:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to update advertisement",
            error: error.message,
        });
    }
};

// ===============================
// TOGGLE ACTIVE STATUS
// ===============================

export const toggleAdvertisementStatus =
    async (req, res) => {
        try {
            const { id } = req.params;

            const [current] = await db
                .select({
                    id: advertisements.id,
                    isActive: advertisements.isActive,
                })
                .from(advertisements)
                .where(
                    eq(
                        advertisements.id,
                        Number(id)
                    )
                )
                .limit(1);

            if (!current) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Advertisement not found",
                });
            }

            const [updated] = await db
                .update(advertisements)
                .set({
                    isActive: !current.isActive,
                    updatedAt: new Date(),
                })
                .where(
                    eq(
                        advertisements.id,
                        Number(id)
                    )
                )
                .returning();

            return res.status(200).json({
                success: true,
                message: `Advertisement ${updated.isActive
                    ? "enabled"
                    : "disabled"
                    } successfully`,
                data: updated,
            });
        } catch (error) {
            console.error(
                "toggleAdvertisementStatus:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to update advertisement status",
                error: error.message,
            });
        }
    };

// ===============================
// DELETE
// ===============================

export const deleteAdvertisement = async (
    req,
    res
) => {
    try {
        const { id } = req.params;

        const [deleted] = await db
            .delete(advertisements)
            .where(
                eq(
                    advertisements.id,
                    Number(id)
                )
            )
            .returning();

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Advertisement not found",
            });
        }

        return res.status(200).json({
            success: true,
            message:
                "Advertisement deleted successfully",
        });
    } catch (error) {
        console.error(
            "deleteAdvertisement:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to delete advertisement",
            error: error.message,
        });
    }
};


export const getLiveAdvertisements = async (
    req,
    res
) => {
    try {
        const {
            placement,
            shop_id,
        } = req.query;

        const now = new Date();

        const conditions = [
            eq(advertisements.isActive, true),

            or(
                sql`${advertisements.startDate} IS NULL`,
                sql`${advertisements.startDate} <= ${now}`
            ),

            or(
                sql`${advertisements.endDate} IS NULL`,
                sql`${advertisements.endDate} >= ${now}`
            ),
        ];

        if (placement) {
            conditions.push(
                eq(
                    advertisements.placement,
                    placement
                )
            );
        }

        if (shop_id) {
            conditions.push(
                or(
                    eq(
                        advertisements.shopId,
                        Number(shop_id)
                    ),
                    sql`${advertisements.shopId} IS NULL`
                )
            );
        }

        const data = await db
            .select()
            .from(advertisements)
            .where(and(...conditions))
            .orderBy(
                asc(advertisements.displayOrder)
            );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error(
            "getLiveAdvertisements:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch live advertisements",
            error: error.message,
        });
    }
};


export const recordAdvertisementImpression =
    async (req, res) => {
        try {
            const { id } = req.params;

            const [updated] = await db
                .update(advertisements)
                .set({
                    impressions: sql`${advertisements.impressions} + 1`,
                })
                .where(
                    eq(
                        advertisements.id,
                        Number(id)
                    )
                )
                .returning({
                    id: advertisements.id,
                    impressions:
                        advertisements.impressions,
                });

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Advertisement not found",
                });
            }

            return res.status(200).json({
                success: true,
                data: updated,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    "Failed to record impression",
            });
        }
    };


export const recordAdvertisementClick =
    async (req, res) => {
        try {
            const { id } = req.params;

            const [updated] = await db
                .update(advertisements)
                .set({
                    clicks: sql`${advertisements.clicks} + 1`,
                })
                .where(
                    eq(
                        advertisements.id,
                        Number(id)
                    )
                )
                .returning({
                    id: advertisements.id,
                    clicks:
                        advertisements.clicks,
                    redirectUrl:
                        advertisements.redirectUrl,
                });

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Advertisement not found",
                });
            }

            return res.status(200).json({
                success: true,
                data: updated,
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message:
                    "Failed to record advertisement click",
            });
        }
    };



export const getAdvertisementStatistics =
    async (req, res) => {
        try {
            const [stats] = await db
                .select({
                    total: sql`count(*)`,
                    live: sql`
            count(*) filter (
              where ${advertisements.isActive} = true
            )
          `,
                    impressions: sql`
            coalesce(
              sum(${advertisements.impressions}),
              0
            )
          `,
                    clicks: sql`
            coalesce(
              sum(${advertisements.clicks}),
              0
            )
          `,
                })
                .from(advertisements);

            const totalImpressions =
                Number(stats.impressions || 0);

            const totalClicks =
                Number(stats.clicks || 0);

            const ctr =
                totalImpressions > 0
                    ? Number(
                        (
                            (totalClicks /
                                totalImpressions) *
                            100
                        ).toFixed(2)
                    )
                    : 0;

            return res.status(200).json({
                success: true,
                data: {
                    total: Number(stats.total),
                    live: Number(stats.live),
                    impressions: totalImpressions,
                    clicks: totalClicks,
                    ctr,
                },
            });
        } catch (error) {
            console.error(
                "getAdvertisementStatistics:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch advertisement statistics",
            });
        }
    };