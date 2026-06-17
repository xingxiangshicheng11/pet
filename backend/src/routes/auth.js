import { Router } from 'express';
import {
  register, login, refresh, changePassword,
  forgotPassword, resetPassword,
  updateProfile, getUserProfile, getMe,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.get('/profile/:id', authenticate, getUserProfile);
router.post('/change-password', authenticate, changePassword);

export default router;
