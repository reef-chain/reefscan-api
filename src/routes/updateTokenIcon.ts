import { Router } from 'express';
import { asyncHandler } from '../utils/utils';
import { uploadTokenIcon } from '../controllers/updateTokenIcon';

const router = Router();

router.post('/', asyncHandler(uploadTokenIcon));

export default router;
