import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import { getOwnerNotifications, markOwnerNotificationRead, createOwnerEmergency, getPaymentHistory } from '../controllers/ownerController.js';
import { addFavorite, removeFavorite, listFavorites } from '../controllers/favoriteController.js';
import { addMedicalRecord, getMedicalRecords } from '../controllers/medicalController.js';

const router = Router();
router.use(authenticate);
router.use(authorize('OWNER'));

router.get('/notifications', getOwnerNotifications);
router.put('/notifications/read', markOwnerNotificationRead);
router.post('/emergency', createOwnerEmergency);
router.get('/payments', getPaymentHistory);
router.post('/favorites', addFavorite);
router.get('/favorites', listFavorites);
router.delete('/favorites/:id', removeFavorite);
router.post('/pets/:petId/medical', addMedicalRecord);
router.get('/pets/:petId/medical', getMedicalRecords);

export default router;
