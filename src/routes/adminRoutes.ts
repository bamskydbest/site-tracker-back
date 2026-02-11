import { Router } from 'express';
import { getDashboardStats, exportReport } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/stats', protect, getDashboardStats);
router.get('/export', protect, exportReport);

export default router;
