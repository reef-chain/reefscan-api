import { Router } from 'express';
import {
  submitVerification,
  verificationStatus,
  getVerifiedContract,
  verifyFromBackup,
  exportBackup,
  setContractApproved, importBackup
} from '../controllers/verification';
import { authMiddleware } from '../utils/auth.middleware';
import { asyncHandler } from '../utils/utils';

const router = Router();

router.post('/status', asyncHandler(verificationStatus));
router.post('/submit', asyncHandler(submitVerification));
router.post('/submit-verification', asyncHandler(submitVerification));
router.get('/contract/:address', asyncHandler(getVerifiedContract));
router.post('/verify-from-backup', authMiddleware, asyncHandler(verifyFromBackup));
router.post('/export-backup', authMiddleware, asyncHandler(exportBackup));
router.post('/import-backup', authMiddleware, asyncHandler(importBackup));
router.post('/set-contract-approved', authMiddleware, asyncHandler(setContractApproved));

export default router;
