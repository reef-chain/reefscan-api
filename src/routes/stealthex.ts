import { Router } from 'express';
import { asyncHandler } from '../utils/utils';
import { createExchange, getEstimatedExchange, getExchangeRange, listCurrencies, setTransactionHash } from '../controllers/stealthex';

const router = Router();

router.get('/listcurrencies', asyncHandler(listCurrencies));
router.get('/exchange-rate/:symbol/:network', asyncHandler(getExchangeRange));
router.get('/estimated-exchange/:chain/:network/:amount', asyncHandler(getEstimatedExchange));
router.post('/set-tx-hash', asyncHandler(setTransactionHash));
router.post('/create-exchange', asyncHandler(createExchange));

export default router;
