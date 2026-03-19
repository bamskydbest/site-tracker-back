import { Router } from 'express';
import { login, register, getMe, getPendingAdmins, approveAdmin, rejectAdmin, getAllAdmins, deleteAdmin, forgotPassword, resetPassword, } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
const router = Router();
router.post('/login', login);
router.post('/register', register);
router.get('/me', protect, getMe);
// Password recovery (public)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
// Superadmin — department head onboarding management
router.get('/pending', protect, getPendingAdmins);
router.patch('/approve/:id', protect, approveAdmin);
router.delete('/reject/:id', protect, rejectAdmin);
// Superadmin — all department heads
router.get('/admins', protect, getAllAdmins);
router.delete('/admins/:id', protect, deleteAdmin);
export default router;
