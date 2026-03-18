import { Router } from 'express';
import { login, register, getMe, getPendingAdmins, approveAdmin, rejectAdmin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = Router();
router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getMe);
// Superadmin — department head onboarding management
router.get('/pending', protect, getPendingAdmins);
router.patch('/approve/:id', protect, approveAdmin);
router.delete('/reject/:id', protect, rejectAdmin);
export default router;
