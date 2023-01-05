import { Response } from 'express';
import { findContractDB } from '../services/contract';
import { AppRequest } from '../utils/types';
import { ensure } from '../utils/utils';
import { evmAddressValidator, validateData } from './validators';

export const findContract = async (
  req: AppRequest<{}>,
  res: Response,
) => {
  validateData(req.params.address, evmAddressValidator);
  const contracts = await findContractDB(req.params.address);
  ensure(contracts.length > 0, 'Contract does not exist');
  res.send(contracts[0]);
};