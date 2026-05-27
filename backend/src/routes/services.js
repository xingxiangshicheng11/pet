import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import { createService, listServices, getService, acceptService, updateServiceStatus } from "../controllers/serviceController.js";

const router = Router();
router.use(authenticate);

router.post("/", authorize("OWNER"), createService);
router.get("/", listServices);
router.get("/:id", getService);
router.post("/:id/accept", authorize("SITTER"), acceptService);
router.patch("/:id/status", updateServiceStatus);

export default router;
