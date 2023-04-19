import { Router } from 'express';
import {findContract, findContractLocalDb} from '../controllers/contract';
import { asyncHandler } from '../utils/utils';

const router = Router();
router.get('/:address', asyncHandler(findContract));
router.get('/cache/:address', asyncHandler(findContractLocalDb));

export default router;
