import { Router } from "express";
import { authMiddleware } from "../../shared/middleware/auth.middleware.js";
import {
	cancelToken,
	callNextToken,
	createToken,
	getTokenById,
	getTokenByShopId,
	markTokenHere,
	updateTokenArrivalStatus,
} from "./custermer.controller.js";

const router = Router();

router.post("/", createToken);
router.get("/shop/:shopId", getTokenByShopId);
router.post("/shop/:shopId/call-next", authMiddleware, callNextToken);
router.get("/:id", getTokenById);
router.patch("/:id/cancel", cancelToken);
router.patch("/:id/im-here", markTokenHere);
router.patch("/:id/arrival-status", authMiddleware, updateTokenArrivalStatus);

export default router;