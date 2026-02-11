import { Router } from 'express';
import { uploadPhotos, deletePhoto } from '../controllers/photoController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/upload.js';

const router = Router();

router.post('/:visitId', upload.array('photos', 10), uploadPhotos);
router.delete('/:photoId', protect, deletePhoto);

export default router;
