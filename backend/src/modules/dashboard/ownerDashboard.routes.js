import express from "express";
import { getOwnerDashboard } from "./ownerDashboard.controller.js"
import { authMiddleware } from "../../shared/middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/owner/:shopId",
  authMiddleware,
  getOwnerDashboard
);

export default router;
