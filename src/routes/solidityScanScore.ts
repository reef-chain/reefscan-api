import { Router } from 'express';
import { asyncHandler } from '../utils/utils';
import { getSolidityScanData } from '../controllers/solidityScanScore';

const router = Router();

router.get('/:address', asyncHandler(getSolidityScanData));

export default router;
