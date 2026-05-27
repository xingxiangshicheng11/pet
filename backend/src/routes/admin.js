import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import { getUsers, toggleUserStatus } from "../controllers/adminController.js";

const router = Router();
router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/users", getUsers);
router.patch("/users/:id/status", toggleUserStatus);

export default router;
