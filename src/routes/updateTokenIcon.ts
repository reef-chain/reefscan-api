import { Router } from 'express';
import { asyncHandler } from '../utils/utils';
import { generateNonce, uploadTokenIcon } from '../controllers/updateTokenIcon';

const router = Router();

router.post('/', asyncHandler(uploadTokenIcon));
router.post('/nonce', asyncHandler(generateNonce));

export default router;
