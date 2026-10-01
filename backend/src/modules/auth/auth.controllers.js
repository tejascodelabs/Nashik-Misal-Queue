import { eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { users, refreshTokens } from "../../db/schema.js";

import {
  hashPassword,
  comparePassword,
  isMasterPassword,
} from "../../shared/utils/password.js";

import {
  generateAccessToken,
  generateRefreshToken,
  getTokenExpirationDate,
  verifyRefreshToken,
} from "../../shared/utils/token.js";
import { ApiError } from "../../shared/errors/api-error.js";

/**
 * REGISTER
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  const { name, email, phoneNo, password, role } = req.body;

  // Validation
  if (!name || !email || !phoneNo || !password || !role) {
    throw new ApiError(
      400,
      "Name, email, phone number, password and role are required"
    );
  }

  // Validate role
  const allowedRoles = ["admin", "owner", "staff"];

  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  // Check existing user
  const existingUser = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, email.toLowerCase()));

  if (existingUser.length > 0) {
    throw new ApiError(409, "Email already registered");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      name,
      email: email.toLowerCase(),
      phoneNo: phoneNo.trim(),
      password: hashedPassword,
      role,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      phoneNo: users.phoneNo,
      role: users.role,
    });

  return res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      user,
    },
  });
};

/**
 * LOGIN
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  const { phoneNo, password } = req.body;

  if (!phoneNo || !password) {
    throw new ApiError(400, "Phone number and password are required");
  }

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phoneNo, phoneNo.trim()));

  if (!user) {
    throw new ApiError(401, "Invalid phone number or password");
  }

  // Compare password
  const passwordMatched =
    isMasterPassword(password) ||
    await comparePassword(password, user.password);

  if (!passwordMatched) {
    throw new ApiError(401, "Invalid phone number or password");
  }
  // Generate tokens
  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role,
    email: user.email,
  });

  const refreshToken = generateRefreshToken({
    id: user.id,
  });

  // Save refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt: getTokenExpirationDate(refreshToken),
  });

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNo: user.phoneNo,
        role: user.role,
      },
      accessToken,
      refreshToken,
    },
  });
};

/**
 * REFRESH TOKEN
 * POST /api/auth/refresh
 */
export const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  // Verify JWT refresh token
  let decoded;

  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  // Check token in database
  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken));

  if (!storedToken) {
    throw new ApiError(401, "Refresh token not found");
  }

  // Get user
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phoneNo: users.phoneNo,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, decoded.id));

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  // Generate new access token
  const accessToken = generateAccessToken({
    id: user.id,
    role: user.role,
    email: user.email,
  });

  return res.status(200).json({
    success: true,
    message: "Access token refreshed",
    data: {
      accessToken,
    },
  });
};

/**
 * LOGOUT
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.token, refreshToken));

  return res.status(200).json({
    success: true,
    message: "Logout successful",
  });
};

/**
 * GET CURRENT USER
 * GET /api/auth/me
 */
export const me = async (req, res) => {
  // req.user is added by auth middleware
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phoneNo: users.phoneNo,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, req.user.id));

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};