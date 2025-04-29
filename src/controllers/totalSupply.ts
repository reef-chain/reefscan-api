import { Response } from 'express';
import { AppRequest } from '../utils/types';
import { fetchReefSupply} from '../routes/supply';

export const totalReefSupply = async (
  req: AppRequest<{}>,
  res: Response,
) => {
  const response = (await fetchReefSupply()).total;
  res.json(response);
};
