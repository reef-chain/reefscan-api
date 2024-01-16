import { Response } from 'express';
import {
  contractVerificationRequestInsert,
  contractVerificationStatus,
  createBackupFromSquid,
  exportBackupToFiles,
  findVerifiedContract, importBackupFromFiles,
  updateVerifiedContractApproved,
  updateVerifiedContractData,
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
import { upload } from '../services/updateTokenIcon';

interface ContractVerificationID {
  id: string;
}

interface VerifiedContractApproved {
  address: string;
  approved: boolean;
}

  interface ExtendedContractVerificationReq extends AutomaticContractVerificationReq {
    file: string;
  }

export const submitVerification = async (
  req: AppRequest<ExtendedContractVerificationReq>,
  res: Response,
) => {
  const {file,...rest} = req.body
  validateData(rest, automaticVerificationValidator);

  req.body.address = toChecksumAddress(req.body.address);
  req.body.timestamp = Date.now();

  await verify(req.body)
    .catch(async (err) => {
      console.log('Verify ERR=',err);
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

  if (file) {
    try {
      upload(file).then(hash=>
        updateVerifiedContractData(req.body.address,{'iconUrl':'ipfs://'+hash}))
    } catch (error) {}
  }

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

export const backupFromSquid = async (
  _req: AppRequest<{}>,
  res: Response,
) => {
  createBackupFromSquid();
  res.send("Backup from Squid process started");
};

export const exportBackup = async (
  _req: AppRequest<{}>,
  res: Response,
) => {
  exportBackupToFiles();
  res.send("Backup export process started");
}

export const importBackup = async (
  _req: AppRequest<{}>,
  res: Response,
) => {
  importBackupFromFiles();
  res.send("Backup import process started");
}

export const setContractApproved = async (
  req: AppRequest<VerifiedContractApproved>,
  res: Response,
) => {
  const success = await updateVerifiedContractApproved(req.body.address, req.body.approved);
  res.send({ success });
}
