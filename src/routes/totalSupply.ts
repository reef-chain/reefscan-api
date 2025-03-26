import { Router } from 'express';
import { asyncHandler } from '../utils/utils';
import { totalReefSupply } from '../controllers/totalSupply';

const router = Router();

router.get('/reef', asyncHandler(totalReefSupply));

export default router;
