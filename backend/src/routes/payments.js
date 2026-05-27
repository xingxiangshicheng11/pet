import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import { createPayment } from "../controllers/paymentController.js";

const router = Router();
router.use(authenticate);

router.post("/", authorize("OWNER"), createPayment);

export default router;
