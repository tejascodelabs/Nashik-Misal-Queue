import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { shops, staff, users } from "../../db/schema.js";
import { hashPassword } from "../../shared/utils/password.js";
import { ApiError } from "../../shared/errors/api-error.js";

const staffFields = {
  id: staff.id,
  userId: staff.userId,
  shopId: staff.shopId,
  name: users.name,
  email: users.email,
  role: users.role,
  phoneNo: users.phoneNo,
  gender: staff.gender,
  subRole: staff.subRole,
  isSuspended: staff.isSuspended,
  isArchived: staff.isArchived,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
};

const toBoolean = (value) => value === true || value === "true";

const findStaffRecord = async (staffId) => {
  const [record] = await db
    .select(staffFields)
    .from(staff)
    .innerJoin(users, eq(staff.userId, users.id))
    .where(eq(staff.id, staffId))
    .limit(1);

  return record;
};

const findStaffRecordsByShopId = async (shopId) => {
  return db
    .select(staffFields)
    .from(staff)
    .innerJoin(users, eq(staff.userId, users.id))
    .where(eq(staff.shopId, shopId))
    .orderBy(staff.id);
};

const canManageShop = async (user, shopId) => {
  const conditions = [eq(shops.id, shopId)];

  if (user.role !== "admin") {
    conditions.push(eq(shops.ownerId, user.id));
  }

  const [shop] = await db
    .select({ id: shops.id })
    .from(shops)
    .where(and(...conditions))
    .limit(1);

  return Boolean(shop);
};

const canManageStaff = async (user, staffId) => {
  const conditions = [eq(staff.id, staffId)];

  if (user.role !== "admin") {
    conditions.push(eq(shops.ownerId, user.id));
  }

  const [record] = await db
    .select({ id: staff.id })
    .from(staff)
    .innerJoin(shops, eq(staff.shopId, shops.id))
    .where(and(...conditions))
    .limit(1);

  return Boolean(record);
};

export const createStaff = async (req, res) => {
  const {
    shopId,
    name,
    email,
    password,
    mobileNo,
    mobNo,
    gender,
    subRole,
  } = req.body;

  if (
    !shopId ||
    !name?.trim() ||
    !email?.trim() ||
    !(mobileNo || mobNo)?.trim() ||
    !password
  ) {
    throw new ApiError(
      400,
      "shopId, name, email, phone number and password are required"
    );
  }

  if (!(await canManageShop(req.user, Number(shopId)))) {
    throw new ApiError(403, "You are not authorized to use this shop");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  const hashedPassword = await hashPassword(password);
  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        phoneNo: (mobileNo || mobNo).trim(),
        password: hashedPassword,
        role: "staff",
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phoneNo: users.phoneNo,
        role: users.role,
      });

    const [staffRecord] = await tx
      .insert(staff)
      .values({
        userId: user.id,
        shopId: Number(shopId),
        gender: gender || null,
        subRole: subRole || null,
      })
      .returning();

    return { user, staff: staffRecord };
  });

  return res.status(201).json({
    success: true,
    message: "Staff created successfully",
    data: {
      ...result.staff,
      name: result.user.name,
      email: result.user.email,
      phoneNo: result.user.phoneNo,
      role: result.user.role,
    },
  });
};

export const getAllStaff = async (req, res) => {
  const shopId = req.query.shopId ? Number(req.query.shopId) : null;
  const conditions = [];

  if (shopId) conditions.push(eq(staff.shopId, shopId));
  if (req.user.role !== "admin") conditions.push(eq(shops.ownerId, req.user.id));

  const records = await db
    .select(staffFields)
    .from(staff)
    .innerJoin(users, eq(staff.userId, users.id))
    .innerJoin(shops, eq(staff.shopId, shops.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(staff.id);

  return res.status(200).json({
    success: true,
    count: records.length,
    data: records,
  });
};

export const getStaffById = async (req, res) => {
  const staffId = Number(req.params.id);

  if (!Number.isInteger(staffId) || staffId <= 0) {
    throw new ApiError(400, "Invalid staff ID");
  }

  if (!(await canManageStaff(req.user, staffId))) {
    throw new ApiError(404, "Staff not found");
  }

  const record = await findStaffRecord(staffId);
  return res.status(200).json({ success: true, data: record });
};

export const getStaffByShopId = async (req, res) => {
  const shopId = Number(req.params.shopId);

  if (!Number.isInteger(shopId) || shopId <= 0) {
    throw new ApiError(400, "Invalid shop ID");
  }

  const records = await findStaffRecordsByShopId(shopId);

  return res.status(200).json({
    success: true,
    data: records,
  });
};



export const updateStaff = async (req, res) => {
  const staffId = Number(req.params.id);

  if (!Number.isInteger(staffId) || staffId <= 0) {
    throw new ApiError(400, "Invalid staff ID");
  }

  if (!(await canManageStaff(req.user, staffId))) {
    throw new ApiError(404, "Staff not found");
  }

  const current = await findStaffRecord(staffId);
  const {
    name,
    email,
    password,
    mobileNo,
    mobNo,
    gender,
    subRole,
    shopId,
  } = req.body;

  if (shopId !== undefined && !(await canManageShop(req.user, Number(shopId)))) {
    throw new ApiError(403, "You are not authorized to use this shop");
  }

  const userUpdate = {};
  if (name !== undefined) userUpdate.name = name.trim();
  if (email !== undefined) userUpdate.email = email.trim().toLowerCase();
  if (mobileNo !== undefined || mobNo !== undefined) {
    const nextPhoneNo = mobileNo || mobNo;
    if (!nextPhoneNo?.trim()) {
      throw new ApiError(400, "Phone number cannot be empty");
    }
    userUpdate.phoneNo = nextPhoneNo.trim();
  }
  if (password) userUpdate.password = await hashPassword(password);

  const staffUpdate = { updatedAt: new Date() };
  if (gender !== undefined) staffUpdate.gender = gender || null;
  if (subRole !== undefined) staffUpdate.subRole = subRole || null;
  if (shopId !== undefined) staffUpdate.shopId = Number(shopId);

  const updated = await db.transaction(async (tx) => {
    if (Object.keys(userUpdate).length) {
      await tx.update(users).set(userUpdate).where(eq(users.id, current.userId));
    }

    await tx.update(staff).set(staffUpdate).where(eq(staff.id, staffId));
    return findStaffRecord(staffId);
  });

  return res.status(200).json({
    success: true,
    message: "Staff updated successfully",
    data: updated,
  });
};

export const updateStaffStatus = async (req, res) => {
  const staffId = Number(req.params.id);
  const { isSuspended, isArchived } = req.body;

  if (!Number.isInteger(staffId) || staffId <= 0) {
    throw new ApiError(400, "Invalid staff ID");
  }

  if (isSuspended === undefined && isArchived === undefined) {
    throw new ApiError(400, "isSuspended or isArchived is required");
  }

  if (!(await canManageStaff(req.user, staffId))) {
    throw new ApiError(404, "Staff not found");
  }

  const updateData = { updatedAt: new Date() };
  if (isSuspended !== undefined) updateData.isSuspended = toBoolean(isSuspended);
  if (isArchived !== undefined) updateData.isArchived = toBoolean(isArchived);

  await db.update(staff).set(updateData).where(eq(staff.id, staffId));
  return res.status(200).json({
    success: true,
    message: "Staff status updated successfully",
    data: await findStaffRecord(staffId),
  });
};

export const deleteStaff = async (req, res) => {
  const staffId = Number(req.params.id);

  if (!Number.isInteger(staffId) || staffId <= 0) {
    throw new ApiError(400, "Invalid staff ID");
  }

  if (!(await canManageStaff(req.user, staffId))) {
    throw new ApiError(404, "Staff not found");
  }

  const current = await findStaffRecord(staffId);
  await db.delete(users).where(eq(users.id, current.userId));

  return res.status(200).json({
    success: true,
    message: "Staff deleted successfully",
  });
};


// =====================================
// GET STAFF PROFILE
// =====================================

export const getStaffProfile = async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid staff user ID",
      });
    }

    const result = await db
      .select({
        userId: users.id,
        staffName: users.name,
        email: users.email,
        shopId: shops.id,
        shopName: shops.shopName,
      })
      .from(users)
      .innerJoin(staff, eq(staff.userId, users.id))
      .innerJoin(shops, eq(shops.id, staff.shopId))
      .where(
        and(
          eq(users.id, userId),
          eq(users.role, "staff")
        )
      )
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff or assigned shop not found",
      });
    }

    const data = result[0];

    return res.status(200).json({
      success: true,
      message: "Staff profile fetched successfully",
      data: {
        user: {
          id: data.userId,
          name: data.staffName,
          email: data.email,
          role: "staff",
        },
        shop: {
          id: data.shopId,
          name: data.shopName,
        },
      },
    });
  } catch (error) {
    console.error("getStaffProfile error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};