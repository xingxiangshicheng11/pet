import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { getStats, toggleReceive, getWallet, requestWithdraw, createEmergency, getNotifications, markNotificationRead, getDataDashboard } from '../controllers/sitterController.js';

const router = Router();

router.get('/stats', authenticate, authorize('SITTER'), getStats);
router.put('/receive-toggle', authenticate, authorize('SITTER'), toggleReceive);
router.get('/wallet', authenticate, authorize('SITTER'), getWallet);
router.post('/withdraw', authenticate, authorize('SITTER'), requestWithdraw);
router.post('/emergency', authenticate, authorize('SITTER'), createEmergency);
router.get('/notifications', authenticate, authorize('SITTER'), getNotifications);
router.put('/notifications/read', authenticate, authorize('SITTER'), markNotificationRead);
router.get('/dashboard', authenticate, authorize('SITTER'), getDataDashboard);

export default router;
