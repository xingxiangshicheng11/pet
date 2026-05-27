import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getStats, toggleReceive, getWallet, requestWithdraw, createEmergency, getNotifications, markNotificationRead, getDataDashboard } from '../controllers/sitterController.js';

const router = Router();

router.get('/stats', authenticate, getStats);
router.put('/receive-toggle', authenticate, toggleReceive);
router.get('/wallet', authenticate, getWallet);
router.post('/withdraw', authenticate, requestWithdraw);
router.post('/emergency', authenticate, createEmergency);
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/read', authenticate, markNotificationRead);
router.get('/dashboard', authenticate, getDataDashboard);

export default router;
