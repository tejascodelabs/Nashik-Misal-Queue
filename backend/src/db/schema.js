import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  decimal,
  time,
  timestamp,
  pgEnum,
  boolean,
  index,
  uniqueIndex,
  date, 
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// =====================================================
// ENUMS
// =====================================================

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "owner",
  "staff",
]);

export const shopStatusEnum = pgEnum("shop_status", [
  "active",
  "inactive",
]);

export const shopOpenStatusEnum = pgEnum("shop_open_status", [
  "open",
  "close",
]);

export const queueStatusEnum = pgEnum("queue_status", [
  "start",
  "pause",
]);

export const menuStatusEnum = pgEnum("menu_status", [
  "active",
  "inactive",
]);

export const advertisementPlacementEnum = pgEnum("advertisement_placement",
  ["shop_list", "checkout", "home_top"]
);


// =====================================================
// USERS TABLE
// =====================================================

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),

    name: varchar("name", {
      length: 100,
    }).notNull(),

    email: varchar("email", {
      length: 255,
    })
      .notNull()
      .unique(),

    phoneNo: varchar("phone_no", {
      length: 20,
    })
      .notNull()
      .unique(),

    password: varchar("password", {
      length: 255,
    }).notNull(),

    role: userRoleEnum("role")
      .notNull()
      .default("staff"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIndex: index("users_email_idx").on(table.email),

    phoneIndex: index("users_phone_no_idx").on(table.phoneNo),

    roleIndex: index("users_role_idx").on(table.role),
  })
);

// =====================================================
// REFRESH TOKENS TABLE
// =====================================================

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    token: varchar("token", {
      length: 500,
    })
      .notNull()
      .unique(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => ({
    userIdIndex: index("refresh_tokens_user_id_idx").on(
      table.userId
    ),
  })
);

// =====================================================
// SHOPS TABLE
// =====================================================

export const shops = pgTable(
  "shops",
  {
    id: serial("id").primaryKey(),

    // Owner from users table
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    shopName: varchar("shop_name", {
      length: 150,
    }).notNull(),

    ownerName: varchar("owner_name", {
      length: 100,
    }).notNull(),

    altPhoneNo: varchar("alt_phone_no", {
      length: 20,
    }),

    address: text("address").notNull(),

    openingTime: time("opening_time").notNull(),

    closingTime: time("closing_time").notNull(),

    initialRating: decimal("initial_rating", {
      precision: 2,
      scale: 1,
    }).default("0.0").notNull(),

    totalReviews: integer("total_reviews").default(0).notNull(),

    directionUrl: text("direction_url"),

    profileImage: text("profile_image"),

    plan: varchar("plan", {
      length: 20,
    })
      .default("free")
      .notNull(),

    images: text("images").array(),

    status: shopStatusEnum("status")
      .notNull()
      .default("active"),

    shopStatus: shopOpenStatusEnum("shop_status")
      .notNull()
      .default("open"),

    queueStatus: queueStatusEnum("queue_status")
      .notNull()
      .default("start"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    ownerIdIndex: index("shops_owner_id_idx").on(
      table.ownerId
    ),

    userIdIndex: index("shops_user_id_idx").on(table.userId),

    shopNameIndex: index("shops_shop_name_idx").on(
      table.shopName
    ),

    statusIndex: index("shops_status_idx").on(
      table.status
    ),
  })
);

// =====================================================
// MENUS TABLE
// =====================================================

export const menus = pgTable(
  "menus",
  {
    id: serial("id").primaryKey(),

    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, {
        onDelete: "cascade",
      }),

    name: varchar("name", {
      length: 150,
    }).notNull(),

    description: text("description"),

    category: varchar("category", {
      length: 100,
    }),

    price: decimal("price", {
      precision: 10,
      scale: 2,
    })
      .notNull(),

    isDiscount: boolean("is_discount")
      .default(false)
      .notNull(),

    discountPrice: decimal("discount_price", {
      precision: 10,
      scale: 2,
    }),

    image: text("image"),

    status: menuStatusEnum("status")
      .notNull()
      .default("active"),

    sortOrder: integer("sort_order")
      .default(0)
      .notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    shopIdIndex: index("menus_shop_id_idx").on(
      table.shopId
    ),

    nameIndex: index("menus_name_idx").on(
      table.name
    ),

    categoryIndex: index("menus_category_idx").on(
      table.category
    ),

    statusIndex: index("menus_status_idx").on(
      table.status
    ),
  })
);

// =====================================================
// STAFF TABLE
// =====================================================

export const staff = pgTable(
  "staff",
  {
    id: serial("id").primaryKey(),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, {
        onDelete: "cascade",
      }),

    gender: varchar("gender", {
      length: 20,
    }),

    subRole: varchar("sub_role", {
      length: 50,
    }),

    isSuspended: boolean("is_suspended")
      .notNull()
      .default(false),

    isArchived: boolean("is_archived")
      .notNull()
      .default(false),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdUniqueIndex: uniqueIndex("staff_user_id_unique").on(table.userId),
    shopIdIndex: index("staff_shop_id_idx").on(table.shopId),
    suspendedIndex: index("staff_is_suspended_idx").on(table.isSuspended),
    archivedIndex: index("staff_is_archived_idx").on(table.isArchived),
  })
);

// ===============================
// ADVERTISEMENTS TABLE
// ===============================

export const advertisements = pgTable(
  "advertisements",
  {
    id: serial("id").primaryKey(),

    eventTitle: varchar("event_title", {
      length: 255,
    }).notNull(),

    imageUrl: text("image_url").notNull(),

    redirectUrl: text("redirect_url"),

    ctaText: varchar("cta_text", {
      length: 100,
    }),

    // Optional shop targeting
    // NULL = show to all shops
    shopId: integer("shop_id"),

    placement: advertisementPlacementEnum("placement")
      .notNull()
      .default("shop_list"),

    displayOrder: integer("display_order")
      .notNull()
      .default(1),

    startDate: timestamp("start_date", {
      withTimezone: true,
    }),

    endDate: timestamp("end_date", {
      withTimezone: true,
    }),

    isActive: boolean("is_active")
      .notNull()
      .default(true),

    // Analytics
    impressions: integer("impressions")
      .notNull()
      .default(0),

    clicks: integer("clicks")
      .notNull()
      .default(0),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    placementIdx: index("advertisements_placement_idx").on(
      table.placement
    ),

    activeIdx: index("advertisements_active_idx").on(
      table.isActive
    ),

    shopIdx: index("advertisements_shop_idx").on(
      table.shopId
    ),

    dateIdx: index("advertisements_date_idx").on(
      table.startDate,
      table.endDate
    ),
  })
);


export const tokens = pgTable(
  "tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    shopId: integer("shop_id")
      .notNull()
      .references(() => shops.id, { onDelete: "cascade" }),

    mobile: varchar("mobile", { length: 10 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    tokenNo: integer("token_no").notNull(),
    groupSize: integer("group_size").notNull().default(1),
    queueType: varchar("queue_type", { length: 5 }).notNull(),
    status: varchar("status", { length: 20 }).default("waiting"),
    alerted: boolean("alerted").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    customerArrived: boolean("customer_arrived").default(false),
    finalCall: boolean("final_call").default(false),
    counterArrived: boolean("counter_arrived").default(false),
    callTimeout: boolean("call_timeout").default(false),
    calledByStaffName: text("called_by_staff_name"),
    calledAt: timestamp("called_at", { withTimezone: true }),
    fcmToken: text("fcm_token"),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    queueDate: date("queue_date").notNull().default(sql`CURRENT_DATE`),
  },
  (table) => ({
    shopDateQueueIndex: uniqueIndex("tokens_shop_date_queue_unique").on(
      table.shopId,
      table.queueDate,
      table.queueType,
      table.tokenNo
    ),
    mobileIndex: index("tokens_mobile_idx").on(table.mobile),
    statusIndex: index("tokens_status_idx").on(table.status),
  })
);