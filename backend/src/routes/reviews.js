import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { createReview, getReviews } from "../controllers/reviewController.js";

const router = Router();
router.use(authenticate);

router.post("/", createReview);
router.get("/user/:userId", getReviews);

export default router;
