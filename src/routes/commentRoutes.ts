import { Router } from 'express';
import { addComment, getComments } from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/:visitId', protect, addComment);
router.get('/:visitId', getComments);

export default router;
