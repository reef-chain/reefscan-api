import { Response } from 'express';
import { AppRequest } from '../utils/types';
import { getReefMainnetSupply, reefMainnet } from '../routes/supply';

export const totalReefSupply = async (
  req: AppRequest<{}>,
  res: Response,
) => {
  const response = await getReefMainnetSupply(reefMainnet);
  res.json(response);
};
