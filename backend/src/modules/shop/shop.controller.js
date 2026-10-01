import { eq, desc, ilike, or, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users, shops, menus } from "../../db/schema.js";
import { hashPassword } from "../../shared/utils/password.js";
import {
  deleteShopFiles,
  getStoredShopImagePath,
  saveShopFiles,
  serializeShop,
} from "./shop.upload.js";

const getUploadedFiles = (req) => [
  ...(req.files?.profile_image || []),
  ...(req.files?.images || []),
];

const parseImages = (images) => {
  if (images === undefined) return undefined;
  if (Array.isArray(images)) return images;
  if (!images) return [];

  try {
    const parsedImages = JSON.parse(images);
    return Array.isArray(parsedImages) ? parsedImages : [];
  } catch {
    return [];
  }
};

const serializeMenu = (req, menu) => ({
  ...menu,
  image: menu.image
    ? `${req.protocol}://${req.get("host")}${menu.image}`
    : null,
});

// =====================================================
// CREATE SHOP
// =====================================================
export const createShop = async (req, res) => {
  try {
    const {
      ownerName,
      email,
      password,
      shopName,
      phoneNo,
      altPhoneNo,
      address,
      openingTime,
      closingTime,
      initialRating,
      totalReviews,
      directionUrl,
      images,
      plan,
      remove_profile_image: removeProfileImage,
    } = req.body;

    // Required validation
    if (
      !ownerName ||
      !email ||
      !password ||
      !shopName ||
      !phoneNo ||
      !address ||
      !openingTime ||
      !closingTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ownerName, email, password, shopName, phoneNo, address, openingTime and closingTime are required",
      });
    }

    const normalizedEmail = email.toLowerCase();
    const hashedPassword = await hashPassword(password);
    const uploadedFiles = getUploadedFiles(req);
    const savedFiles = await saveShopFiles(uploadedFiles);
    const profileImageFile = req.files?.profile_image?.[0];
    const imageFiles = req.files?.images || [];
    const savedProfileImage = profileImageFile ? savedFiles[0] : null;
    const savedImagePaths = savedFiles
      .filter(({ relativePath }) => relativePath !== savedProfileImage?.relativePath)
      .map(({ relativePath }) => relativePath);

    try {
      const { user, shop } = await db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            name: ownerName,
            email: normalizedEmail,
            phoneNo: phoneNo.trim(),
            password: hashedPassword,
            role: "owner",
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
          });

        const [shop] = await tx
          .insert(shops)
          .values({
            ownerId: user.id,
            userId: user.id,
            ownerName,
            shopName,
            altPhoneNo: altPhoneNo || null,
            address,
            openingTime,
            closingTime,
            initialRating: initialRating || "0.0",
            totalReviews: totalReviews ? Number(totalReviews) : 0,
            directionUrl: directionUrl || null,
            profileImage: savedProfileImage?.relativePath || null,
            plan: plan || "free",
            images: imageFiles.length
              ? savedImagePaths
              : parseImages(images) || [],
          })
          .returning();

        return { user, shop };
      });

      return res.status(201).json({
        success: true,
        message: "Shop created successfully",
        data: { owner: user, shop: serializeShop(req, shop) },
      });
    } catch (error) {
      await deleteShopFiles(savedFiles.map(({ relativePath }) => relativePath));
      throw error;
    }
  } catch (error) {
    console.error("Create Shop Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create shop",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL SHOPS
// =====================================================
export const getAllShops = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
    } = req.query;

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.max(Number(limit), 1);
    const offset = (pageNumber - 1) * limitNumber;

    const conditions = [];

    // Search
    if (search) {
      conditions.push(
        or(
          ilike(shops.shopName, `%${search}%`),
          ilike(users.phoneNo, `%${search}%`),
          ilike(shops.address, `%${search}%`)
        )
      );
    }

    // Status filter
    if (status) {
      conditions.push(eq(shops.status, status));
    }

    const whereCondition =
      conditions.length > 0 ? or(...conditions) : undefined;

    const shopList = await db
      .select({ shop: shops, phoneNo: users.phoneNo, email:users.email })
      .from(shops)
      .innerJoin(users, eq(shops.userId, users.id))
      .where(whereCondition)
      .orderBy(desc(shops.id))
      .limit(limitNumber)
      .offset(offset);

    const shopIds = shopList.map(({ shop }) => shop.id);
    const menuList = shopIds.length
      ? await db
          .select()
          .from(menus)
          .where(inArray(menus.shopId, shopIds))
          .orderBy(menus.sortOrder, desc(menus.createdAt))
      : [];

    const menusByShopId = new Map();
    for (const menu of menuList) {
      const shopMenus = menusByShopId.get(menu.shopId) || [];
      shopMenus.push(serializeMenu(req, menu));
      menusByShopId.set(menu.shopId, shopMenus);
    }

    return res.status(200).json({
      success: true,
      message: "Shops fetched successfully",
      page: pageNumber,
      limit: limitNumber,
      count: shopList.length,
      data: shopList.map(({ shop, phoneNo, email }) =>
        serializeShop(req, {
          ...shop,
          phoneNo,
          email,
          menus: menusByShopId.get(shop.id) || [],
        })
      ),
    });
  } catch (error) {
    console.error("Get All Shops Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
      error: error.message,
    });
  }
};

// // =====================================================
// // GET SHOP BY ID
// // =====================================================
export const fetchShopById = async (req, res) => {
  try {
    const { id } = req.params;

    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, Number(id)))
      .limit(1);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shop fetched successfully",
      data: serializeShop(req, shop),
    });
  } catch (error) {
    console.error("Get Shop By ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shop",
      error: error.message,
    });
  }
};

// =====================================================
// GET SHOP BY OWNER ID (USER ID)
// =====================================================
export const getShopById = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const [shopRecord] = await db
      .select({ shop: shops, phoneNo: users.phoneNo })
      .from(shops)
      .innerJoin(users, eq(shops.userId, users.id))
      .where(eq(shops.userId, userId))
      .limit(1);

    if (!shopRecord) {
      return res.status(404).json({
        success: false,
        message: "Shop not found for this user",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Shop fetched successfully",
      data: serializeShop(req, {
        ...shopRecord.shop,
        phoneNo: shopRecord.phoneNo,
      }),
    });
  } catch (error) {
    console.error("Get Shop By Owner ID Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch shop",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE SHOP
// =====================================================
export const updateShop = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      ownerId,
      userId,
      shopName,
      phoneNo,
      altPhoneNo,
      address,
      openingTime,
      closingTime,
      initialRating,
      totalReviews,
      directionUrl,
      images,
      plan,
      status,
      remove_profile_image: removeProfileImage,
    } = req.body;

    const shopId = Number(id);

    // Check shop
    const [existingShop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (!existingShop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const updateData = {
      updatedAt: new Date(),
    };
    const uploadedFiles = getUploadedFiles(req);
    const savedFiles = await saveShopFiles(uploadedFiles);
    const profileImageFile = req.files?.profile_image?.[0];
    const savedProfileImage = profileImageFile ? savedFiles[0] : null;
    const savedImagePaths = savedProfileImage
      ? savedFiles.slice(1).map(({ relativePath }) => relativePath)
      : savedFiles.map(({ relativePath }) => relativePath);

    const nextUserId = userId ?? ownerId;
    if (nextUserId !== undefined) {
      updateData.ownerId = Number(nextUserId);
      updateData.userId = Number(nextUserId);
    }

    if (shopName !== undefined) {
      updateData.shopName = shopName;
    }

    if (altPhoneNo !== undefined) {
      updateData.altPhoneNo = altPhoneNo;
    }

    if (address !== undefined) {
      updateData.address = address;
    }

    if (openingTime !== undefined) {
      updateData.openingTime = openingTime;
    }

    if (closingTime !== undefined) {
      updateData.closingTime = closingTime;
    }

    if (initialRating !== undefined) {
      updateData.initialRating = String(initialRating);
    }

    if (totalReviews !== undefined) {
      updateData.totalReviews = Number(totalReviews);
    }

    if (directionUrl !== undefined) {
      updateData.directionUrl = directionUrl;
    }

    if (plan !== undefined) {
      updateData.plan = plan;
    }
    if (status !== undefined) {
      updateData.status = status;
    }

    if (profileImageFile) {
      updateData.profileImage = savedProfileImage.relativePath;
    } else if (removeProfileImage === "true" || removeProfileImage === true) {
      updateData.profileImage = null;
    }

    let filesToDelete = [];
    if (uploadedFiles.length && (req.files?.images || []).length) {
      updateData.images = savedImagePaths;
      filesToDelete = existingShop.images || [];
    } else if (images !== undefined) {
      updateData.images = parseImages(images);
      const nextImagePaths = new Set(
        updateData.images.map((imagePath) => getStoredShopImagePath(imagePath))
      );
      filesToDelete = (existingShop.images || []).filter(
        (imagePath) => !nextImagePaths.has(getStoredShopImagePath(imagePath))
      );
    }

    try {
      const [updatedShop] = await db
        .update(shops)
        .set(updateData)
        .where(eq(shops.id, shopId))
        .returning();

      if (phoneNo !== undefined) {
        await db
          .update(users)
          .set({ phoneNo: phoneNo.trim(), updatedAt: new Date() })
          .where(eq(users.id, existingShop.ownerId));
      }

      await deleteShopFiles([
        ...(profileImageFile || removeProfileImage === "true" || removeProfileImage === true
          ? [existingShop.profileImage]
          : []),
        ...filesToDelete,
      ]);

      return res.status(200).json({
        success: true,
        message: "Shop updated successfully",
        data: serializeShop(req, { ...updatedShop, phoneNo }),
      });
    } catch (error) {
      await deleteShopFiles(savedFiles.map(({ relativePath }) => relativePath));
      throw error;
    }
  } catch (error) {
    console.error("Update Shop Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shop",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE SHOP
// =====================================================
export const deleteShop = async (req, res) => {
  try {
    const { id } = req.params;

    const shopId = Number(id);

    const [deletedShop] = await db
      .delete(shops)
      .where(eq(shops.id, shopId))
      .returning();

    if (!deletedShop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    await deleteShopFiles([
      deletedShop.profileImage,
      ...(deletedShop.images || []),
    ]);

    return res.status(200).json({
      success: true,
      message: "Shop deleted successfully",
      data: serializeShop(req, deletedShop),
    });
  } catch (error) {
    console.error("Delete Shop Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete shop",
      error: error.message,
    });
  }
};

// =====================================================
// CHANGE SHOP STATUS
// // =====================================================
// export const changeShopStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     const shopId = Number(id);

//     // Validate status
//     if (!["active", "inactive"].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: "Status must be either active or inactive",
//       });
//     }

//     const [existingShop] = await db
//       .select()
//       .from(shops)
//       .where(eq(shops.id, shopId))
//       .limit(1);

//     if (!existingShop) {
//       return res.status(404).json({
//         success: false,
//         message: "Shop not found",
//       });
//     }

//     const [updatedShop] = await db
//       .update(shops)
//       .set({
//         status,
//         updatedAt: new Date(),
//       })
//       .where(eq(shops.id, shopId))
//       .returning();

//     return res.status(200).json({
//       success: true,
//       message: `Shop ${
//         status === "active" ? "activated" : "deactivated"
//       } successfully`,
//       data: updatedShop,
//     });
//   } catch (error) {
//     console.error("Change Shop Status Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to change shop status",
//       error: error.message,
//     });
//   }
// };

// =====================================================
// CHANGE SHOP STATUS
// =====================================================
export const changeShopStatus = async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const { shopStatus } = req.body;

    if (!Number.isInteger(shopId) || shopId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    if (!["active", "inactive"].includes(shopStatus)) {
      return res.status(400).json({
        success: false,
        message: "shopStatus must be either active or inactive",
      });
    }

    /*
     * SHOP STATUS IS THE MASTER STATUS
     *
     * active   => open + start
     * inactive => close + pause
     */
    const [updatedShop] = await db
      .update(shops)
      .set({
        status: shopStatus,

        shopStatus:
          shopStatus === "active" ? "open" : "close",

        queueStatus:
          shopStatus === "active" ? "start" : "pause",

        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId))
      .returning();

    if (!updatedShop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Shop ${
        shopStatus === "active" ? "activated" : "deactivated"
      } successfully`,
      data: updatedShop,
    });
  } catch (error) {
    console.error("Change Shop Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shop status",
    });
  }
};


// =====================================================
// CHANGE SHOP OPEN STATUS
// =====================================================
export const changeShopOpenStatus = async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const { shopOpenStatus } = req.body;

    if (!Number.isInteger(shopId) || shopId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    if (!["open", "close"].includes(shopOpenStatus)) {
      return res.status(400).json({
        success: false,
        message: "shopOpenStatus must be either open or close",
      });
    }

    // Get current shop status
    const [shop] = await db
      .select({
        id: shops.id,
        shopStatus: shops.status,
        shopOpenStatus: shops.shopStatus,
        queueStatus: shops.queueStatus,
      })
      .from(shops)
      .where(eq(shops.id, shopId));

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // =================================================
    // INACTIVE SHOP
    // =================================================
    if (shop.shopStatus === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Inactive shop cannot change open status",
      });
    }

    // =================================================
    // CLOSING SHOP
    // Automatically pause queue
    // =================================================
    if (shopOpenStatus === "close") {
      const [updatedShop] = await db
        .update(shops)
        .set({
          shopStatus: "close",
          queueStatus: "pause",
          updatedAt: new Date(),
        })
        .where(eq(shops.id, shopId))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Shop closed and queue paused successfully",
        data: updatedShop,
      });
    }

    // =================================================
    // OPEN SHOP
    // Opening shop does NOT automatically start queue
    //
    // Example:
    // active + open + pause => valid
    // =================================================
    const [updatedShop] = await db
      .update(shops)
      .set({
        shopStatus: "open",
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Shop opened successfully",
      data: updatedShop,
    });
  } catch (error) {
    console.error("Change Shop Open Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shop open status",
    });
  }
};


// =====================================================
// CHANGE QUEUE STATUS
// =====================================================
export const changeQueueStatus = async (req, res) => {
  try {
    const shopId = Number(req.params.id);
    const { queueStatus } = req.body;

    if (!Number.isInteger(shopId) || shopId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid shop ID",
      });
    }

    if (!["start", "pause"].includes(queueStatus)) {
      return res.status(400).json({
        success: false,
        message: "queueStatus must be either start or pause",
      });
    }

    // Get current shop status
    const [shop] = await db
      .select({
        id: shops.id,
        shopStatus: shops.status,
        shopOpenStatus: shops.shopStatus,
        queueStatus: shops.queueStatus,
      })
      .from(shops)
      .where(eq(shops.id, shopId));

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    // =================================================
    // PAUSE QUEUE
    //
    // Active + open + pause => VALID
    // Active + close + pause => VALID
    // Inactive + close + pause => VALID
    // =================================================
    if (queueStatus === "pause") {
      const [updatedShop] = await db
        .update(shops)
        .set({
          queueStatus: "pause",
          updatedAt: new Date(),
        })
        .where(eq(shops.id, shopId))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Queue paused successfully",
        data: updatedShop,
      });
    }

    // =================================================
    // START QUEUE
    //
    // Only allowed:
    // active + open + start
    // =================================================
    if (shop.shopStatus !== "active") {
      return res.status(400).json({
        success: false,
        message: "Queue cannot be started for an inactive shop",
      });
    }

    if (shop.shopOpenStatus !== "open") {
      return res.status(400).json({
        success: false,
        message: "Queue cannot be started while shop is closed",
      });
    }

    const [updatedShop] = await db
      .update(shops)
      .set({
        queueStatus: "start",
        updatedAt: new Date(),
      })
      .where(eq(shops.id, shopId))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Queue started successfully",
      data: updatedShop,
    });
  } catch (error) {
    console.error("Change Queue Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update queue status",
    });
  }
};


// export const getShopProfile = async (req, res) => {
//   try {
//     const userId = Number(req.params.id);

//     if (!Number.isInteger(userId) || userId <= 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid user ID",
//       });
//     }

//     const result = await db
//       .select({
//         shopId: shops.id,
//         shopName: shops.shopName,
//         ownerId: users.id,
//         ownerName: users.name,
//         ownerEmail: users.email,
//       })
//       .from(shops)
//       .innerJoin(users, eq(users.id, shops.userId))
//       .where(eq(shops.userId, userId))
//       .limit(1);

//     if (result.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Shop or owner not found",
//       });
//     }

//     const data = result[0];

//     return res.status(200).json({
//       success: true,
//       message: "Shop profile fetched successfully",
//       data: {
//         shop: {
//           id: data.shopId,
//           name: data.shopName,
//         },
//         owner: {
//           id: data.ownerId,
//           name: data.ownerName,
//           email: data.ownerEmail,
//           role: "owner",
//         },
//       },
//     });
//   } catch (error) {
//     console.error("getShopProfile error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//     });
//   }
// };

export const getShopProfile = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const result = await db
      .select({
        shopId: shops.id,
        shopName: shops.shopName,

        // Shop statuses
        shopStatus: shops.status,
        shopOpenStatus: shops.shopStatus,
        queueStatus: shops.queueStatus,

        ownerId: users.id,
        ownerName: users.name,
        ownerEmail: users.email,
      })
      .from(shops)
      .innerJoin(users, eq(users.id, shops.userId))
      .where(eq(shops.userId, userId))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shop or owner not found",
      });
    }

    const data = result[0];

    return res.status(200).json({
      success: true,
      message: "Shop profile fetched successfully",

      data: {
        shop: {
          id: data.shopId,
          name: data.shopName,

          // Status fields
          shopStatus: data.shopStatus,
          shopOpenStatus: data.shopOpenStatus,
          queueStatus: data.queueStatus,
        },

        owner: {
          id: data.ownerId,
          name: data.ownerName,
          email: data.ownerEmail,
          role: "owner",
        },
      },
    });
  } catch (error) {
    console.error("getShopProfile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
