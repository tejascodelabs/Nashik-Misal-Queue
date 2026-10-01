import express from "express";
import { createImageUpload } from "../../shared/middleware/image-upload.js";

import {
    createAdvertisement,
    getAllAdvertisements,
    getAdvertisementById,
    updateAdvertisement,
    deleteAdvertisement,
    toggleAdvertisementStatus,
    getLiveAdvertisements,
    recordAdvertisementImpression,
    recordAdvertisementClick,
    getAdvertisementStatistics,
} from "./advertisements.controller.js";

const router = express.Router();
const advertisementUpload = createImageUpload({
    folder: "advertisements",
    field: "image",
});

// ===============================
// ADMIN
// ===============================

// Statistics
router.get("/statistics", getAdvertisementStatistics);

// All advertisements
router.get("/", getAllAdvertisements);

// Single advertisement
router.get("/:id", getAdvertisementById);

// Create
router.post("/", advertisementUpload, createAdvertisement);

// Update
router.put("/:id", advertisementUpload, updateAdvertisement);

// Enable / Disable
router.patch("/:id/status", toggleAdvertisementStatus);

// Delete
router.delete("/:id", deleteAdvertisement);

// ===============================
// PUBLIC
// ===============================

// Live advertisements
router.get("/public/live", getLiveAdvertisements);

// Record impression
router.post("/:id/impression", recordAdvertisementImpression);

// Record click
router.post("/:id/click", recordAdvertisementClick);

export default router;