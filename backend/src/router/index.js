import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import dashboardRoutes from "../modules/dashboard/ownerDashboard.routes.js";
import shopRoutes from "../modules/shop/shop.routes.js";
import menusRoutes from "../modules/menus/menus.routes.js";
import staffRoutes from "../modules/staff/staff.routes.js";
import advertisementsRoutes from "../modules/advertisements/advertisements.route.js";
import tokenRoutes from "../modules/custermers/custermer.routes.js";

const router = Router();

// Health check
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
  });
});

// Auth routes
router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/shops", shopRoutes);
router.use("/menus", menusRoutes);
router.use("/staff", staffRoutes);
router.use("/advertisements", advertisementsRoutes);
router.use("/tokens", tokenRoutes);

export default router;