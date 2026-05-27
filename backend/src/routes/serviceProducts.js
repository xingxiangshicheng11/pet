import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import {
  createProduct, listProducts, getProduct,
  updateProduct, deleteProduct, buyProduct,
  listMyOrders, updateOrderStatus,
} from "../controllers/serviceProductController.js";

const router = Router();
router.use(authenticate);

router.post("/", authorize("SITTER"), createProduct);
router.get("/", listProducts);
router.get("/:id", getProduct);
router.put("/:id", authorize("SITTER"), updateProduct);
router.delete("/:id", deleteProduct);
router.post("/buy", authorize("OWNER"), buyProduct);
router.get("/orders/mine", listMyOrders);
router.patch("/orders/:id/status", updateOrderStatus);

export default router;
