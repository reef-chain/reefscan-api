import { Router } from 'express';
import { asyncHandler } from '../utils/utils';
import { uploadTokenIcon } from '../controllers/uploadTokenIcon';

const router = Router();

router.get('/:address', asyncHandler(uploadTokenIcon));

export default router;
