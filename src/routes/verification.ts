import { Router } from 'express';
import {
  formVerification, submitVerification, verificationStatus, getVerifiedContract, verifyFromBackup
} from '../controllers/verification';
import { authMiddleware } from '../utils/auth.midleware';
import { asyncHandler } from '../utils/utils';

const router = Router();

router.post('/status', asyncHandler(verificationStatus));
// TODO: remove unused route?
// router.post('/form-verification', asyncHandler(formVerification));
router.post('/submit-verification', asyncHandler(submitVerification));
router.get('/contract/:address', asyncHandler(getVerifiedContract));
router.post('/verify-from-backup', authMiddleware, asyncHandler(verifyFromBackup));

export default router;
