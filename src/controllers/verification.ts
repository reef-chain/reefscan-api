import { Response } from 'express';
import { authenticationToken } from '../services/utils';
import {
  contractVerificationRequestInsert,
  contractVerificationStatus,
  exportBackupToFiles,
  findVerifiedContract,
  verify,
  verifyPendingFromBackup,
} from '../services/verification';
import {
  AppRequest,
  AutomaticContractVerificationReq,
  ManualContractVerificationReq,
} from '../utils/types';
import { ensure, toChecksumAddress } from '../utils/utils';
import {
  automaticVerificationValidator, formVerificationValidator, idValidator, validateData, verificationStatusValidator,
} from './validators';
import {GCPStorage} from "../services/file-storage-service";
import config from "../utils/config";

interface ContractVerificationID {
  id: string;
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

export const testFileBackup = async (
  req: AppRequest<any>,
  res: Response,
) => {
  const backupFileStorage = new GCPStorage('subsquid-api-test-'+config.network);
  let filePath = 'bkp/test.json';
  let response:any = {};
  response.exists0 = await backupFileStorage.fileExists(filePath);
  await backupFileStorage.writeFile(filePath, JSON.stringify({ok: true}));
  response.exists1 = await backupFileStorage.fileExists(filePath);
  response.content = await backupFileStorage.readFile(filePath);
  res.send(response);
};

export const formVerification = async (
  req: AppRequest<ManualContractVerificationReq>,
  res: Response,
) => {
  validateData(req.body, formVerificationValidator);

  const isAuthenticated = await authenticationToken(req.body.token);
  ensure(isAuthenticated, 'Google Token Authentication failed!', 404);

  req.body.address = toChecksumAddress(req.body.address);

  await verify(req.body)
    .catch(async (err) => {
      await contractVerificationRequestInsert({
        ...req.body,
        success: false,
        id: req.body.address,
        args: req.body.arguments,
        errorMessage: err.message,
        optimization: req.body.optimization === 'true'
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
