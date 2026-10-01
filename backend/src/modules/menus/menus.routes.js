import express from "express";

import {
	changeMenuStatus,
	createMenu,
	deleteMenu,
	getAllMenu,
	getMenuByID,
	updateMenu,
} from "./menus.controller.js";
import { authMiddleware } from "../../shared/middleware/auth.middleware.js";
import { menuUpload } from "./menuUpload.js";

const router = express.Router();

// Create
router.post(
	"/",
	authMiddleware,
	menuUpload.fields([
		{ name: "image", maxCount: 1 },
		{ name: "menuImage", maxCount: 1 },
	]),
	createMenu
);

// Get all
router.get("/", getAllMenu);

// Get by ID
router.get("/:id", getMenuByID);

// Update
router.put(
	"/:id",
	authMiddleware,
	menuUpload.fields([
		{ name: "image", maxCount: 1 },
		{ name: "menuImage", maxCount: 1 },
	]),
	updateMenu
);

// Delete
router.delete("/:id", authMiddleware, deleteMenu);

// Active / Inactive
router.patch("/:id/status", authMiddleware, changeMenuStatus);

export default router;