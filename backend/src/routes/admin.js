import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/role.js";
import {
  getUsers, getUserDetail, updateUser,
  getAdminServices, getAdminServiceDetail, adminUpdateServiceStatus, adminAssignSitter,
  getAdminStats, getAdminTrends, getAdminCategoryStats,
  getAdminWithdrawals, adminReviewWithdrawal,
  getAdminEmergencies, adminHandleEmergency,
  getAdminReviews, adminDeleteReview,
  getAdminPayments, adminRefundPayment,
  getAdminProducts, adminToggleProduct,
  sendSystemNotification, getSystemNotifications,
  getPlatformConfig, updatePlatformConfig,
  getAdminLogs,
} from "../controllers/adminController.js";

const router = Router();
router.use(authenticate);
router.use(authorize("ADMIN"));

// Users
router.get("/users", getUsers);
router.get("/users/:id", getUserDetail);
router.put("/users/:id", updateUser);
router.patch("/users/:id/status", (req, res) => {
  req.body = { isActive: req.body.isActive };
  updateUser(req, res);
});

// Services
router.get("/services", getAdminServices);
router.get("/services/:id/detail", getAdminServiceDetail);
router.patch("/services/:id/status", adminUpdateServiceStatus);
router.post("/services/:id/assign", adminAssignSitter);

// Stats
router.get("/stats/overview", getAdminStats);
router.get("/stats/trends", getAdminTrends);
router.get("/stats/categories", getAdminCategoryStats);

// Withdrawals
router.get("/withdrawals", getAdminWithdrawals);
router.patch("/withdrawals/:id", adminReviewWithdrawal);

// Emergencies
router.get("/emergencies", getAdminEmergencies);
router.patch("/emergencies/:id", adminHandleEmergency);

// Reviews
router.get("/reviews", getAdminReviews);
router.delete("/reviews/:id", adminDeleteReview);

// Payments
router.get("/payments", getAdminPayments);
router.post("/payments/:id/refund", adminRefundPayment);

// Products
router.get("/products", getAdminProducts);
router.patch("/products/:id", adminToggleProduct);

// Notifications
router.post("/notifications", sendSystemNotification);
router.get("/notifications", getSystemNotifications);

// Config
router.get("/config", getPlatformConfig);
router.put("/config/:key", updatePlatformConfig);

// Logs
router.get("/logs", getAdminLogs);

export default router;
