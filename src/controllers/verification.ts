import { Response } from 'express';
import {
  contractVerificationRequestInsert,
  contractVerificationStatus,
  exportBackupToFiles,
  findVerifiedContract,
  updateVerifiedContractApproved,
  verify,
  verifyPendingFromBackup,
} from '../services/verification';
import {
  AppRequest,
  AutomaticContractVerificationReq,
} from '../utils/types';
import { ensure, toChecksumAddress } from '../utils/utils';
import {
  automaticVerificationValidator, idValidator, validateData,
} from './validators';

interface ContractVerificationID {
  id: string;
}

interface VerifiedContractApproved {
  address: string;
  approved: boolean;
}

export const submitVerification = async (
  req: AppRequest<AutomaticContractVerificationReq>,
  res: Response,
) => {
  validateData(req.body, automaticVerificationValidator);

  req.body.address = toChecksumAddress(req.body.address);
  req.body.timestamp = Date.now();

  await verify(req.body)
    .catch(async (err) => {
      await contractVerificationRequestInsert({
        ...req.body,
        success: false,
        id: req.body.address,
        args: req.body.arguments,
        errorMessage: err.message,
        optimization: req.body.optimization === 'true',
      });
      throw err;
    });
  res.send('Verified');
};

export const verificationStatus = async (
  req: AppRequest<ContractVerificationID>,
  res: Response,
) => {
  validateData(req.body, idValidator);
  const status = await contractVerificationStatus(req.body.id);
  res.send(status);
};

export const getVerifiedContract = async (
  req: AppRequest<{}>,
  res: Response,
) => {
  const contract = await findVerifiedContract(
    toChecksumAddress(req.params.address),
  );
  ensure(!!contract, 'Contract does not exist');
  res.send(contract);
};

export const verifyFromBackup = async (
  _req: AppRequest<{}>,
  res: Response,
) => {
  verifyPendingFromBackup();
  res.send("Verification process started");
};

export const exportBackup = async (
  _req: AppRequest<{}>,
  res: Response,
) => {
  exportBackupToFiles();
  res.send("Backup export process started");
}

export const setContractApproved = async (
  req: AppRequest<VerifiedContractApproved>,
  res: Response,
) => {
  const success = await updateVerifiedContractApproved(req.body.address, req.body.approved);
  res.send({ success });
}
