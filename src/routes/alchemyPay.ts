import { Router } from 'express';
import { asyncHandler } from '../utils/utils';
import { generateAlchemyPayUrl } from '../controllers/alchemyPay';

const router = Router();

router.get('/signature', asyncHandler(generateAlchemyPayUrl));

export default router;
