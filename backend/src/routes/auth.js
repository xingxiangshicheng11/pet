import { Router } from 'express';
import {
  register, login, refresh, changePassword,
  forgotPassword, resetPassword,
  updateProfile, getUserProfile, getMe,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);
router.get('/profile/:id', authenticate, getUserProfile);
router.post('/change-password', authenticate, changePassword);

export default router;
