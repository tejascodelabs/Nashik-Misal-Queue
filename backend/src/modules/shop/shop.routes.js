import express from "express";

import {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  changeShopStatus,
  changeShopOpenStatus,
  changeQueueStatus,
  fetchShopById,
  getShopProfile,
} from "./shop.controller.js";
import { shopUpload } from "./shop.upload.js";

const router = express.Router();

// Create
router.post("/", shopUpload, createShop);

// Get all
router.get("/", getAllShops);

// Get by ID
router.get("/:id", getShopById);

router.get("/join/:id", fetchShopById);

// Update
router.put("/:id", shopUpload, updateShop);

// Delete
router.delete("/:id", deleteShop);

// Active / Inactive
router.patch("/:id/status", changeShopStatus);

router.patch("/:id/shop-status", changeShopOpenStatus);

router.patch("/:id/queue-status", changeQueueStatus);

router.get("/profile/:id", getShopProfile);


export default router;