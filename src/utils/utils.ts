import { utils } from 'ethers';
import { Response, Request, NextFunction } from 'express';

export class StatusError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const ensure = (
  condition: boolean,
  message: string,
  status = 404,
): void => {
  if (!condition) {
    throw new StatusError(message, status);
  }
};

export const toChecksumAddress = (address: string): string => utils.getAddress(address.trim().toLowerCase());

export const dropKey = <T, Key extends keyof T>(
  obj: T,
  key: Key,
): Omit<T, Key> => {
  const newObj = { ...obj };
  delete newObj[key];
  return newObj;
};

// eslint-disable-next-line
export const asyncHandler = (fun: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction): Promise<void> => fun(req, res, next).catch(next);