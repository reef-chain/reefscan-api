import { Router } from 'express';
import { findContract } from '../controllers/contract';
import { asyncHandler } from '../utils/utils';

const router = Router();
router.get('/:address', asyncHandler(findContract));

export default router;