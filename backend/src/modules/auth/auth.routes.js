import { Router } from "express";

import {
  register,
  login,
  refresh,
  logout,
  me,
} from "./auth.controllers.js";

import { authMiddleware } from "../../shared/middleware/auth.middleware.js";

const router = Router();

/**
 * Public Routes
 */

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Refresh access token
router.post("/refresh", refresh);

// Logout
router.post("/logout", logout);


/**
 * Protected Routes
 */

// Current logged-in user
router.get("/me", authMiddleware, me);


export default router;