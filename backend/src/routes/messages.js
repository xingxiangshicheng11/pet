import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { sendMessage, getMessages } from "../controllers/messageController.js";

const router = Router();
router.use(authenticate);

router.post("/", sendMessage);
router.get("/:orderId", getMessages);

export default router;
