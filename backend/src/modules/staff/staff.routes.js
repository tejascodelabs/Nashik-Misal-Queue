import { Router } from "express";
// import { authMiddleware } from "../../shared/middleware/auth.middleware.js";
import {
  createStaff,
  deleteStaff,
  getAllStaff,
  getStaffById,
  getStaffProfile,
  updateStaff,
  updateStaffStatus,
  getStaffByShopId,
} from "./staff.controller.js";

const router = Router();

// router.use(authMiddleware);

router.post("/", createStaff);
router.get("/", getAllStaff);
router.get("/:id", getStaffById);
router.put("/:id", updateStaff);
router.patch("/:id/status", updateStaffStatus);
router.delete("/:id", deleteStaff);

// profile
router.get("/:id/profile", getStaffProfile);
router.get("/shop/:shopId", getStaffByShopId);

export default router;
