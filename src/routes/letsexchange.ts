import { Router } from 'express';
import { asyncHandler } from '../utils/utils';
import {
  createExchange,
  getQuote,
  getQuoteRevert,
  getTransaction,
  getTransactionStatus,
  listCurrencies,
} from '../controllers/letsexchange';

const router = Router();

router.get('/listcurrencies', asyncHandler(listCurrencies));
router.post('/quote', asyncHandler(getQuote));
router.post('/quote-revert', asyncHandler(getQuoteRevert));
router.post('/create-exchange', asyncHandler(createExchange));
router.get('/transaction/:id', asyncHandler(getTransaction));
router.get('/transaction/:id/status', asyncHandler(getTransactionStatus));

export default router;
