import { utils } from 'ethers';
import { Response, Request, NextFunction } from 'express';
import config from './config';
import { getProvider } from './connector';
import { Contract } from 'ethers';
import { ABI } from './types';

export class StatusError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/* eslint no-promise-executor-return: "off" */
export const wait = async (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

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

export const findNativeAddress = async (evmAddress: string): Promise<string> => {
  const address = await getProvider().api.query.evmAccounts.accounts(evmAddress);
  return address.toString();
};

export const resolvePromisesAsChunks = async <T>(
  requests: Promise<T>[],
): Promise<T[]> => {
  const chunks: T[] = [];
  let currentChunks: Promise<T>[] = [];

  for (let index = 0; index < requests.length; index += 1) {
    currentChunks.push(requests[index]);

    if (currentChunks.length === config.chunkSize) {
      const resolvedChunk = await Promise.all(currentChunks);
      chunks.push(...resolvedChunk);
      currentChunks = [];
    }
  }

  const resolvedChunk = await Promise.all(currentChunks);
  chunks.push(...resolvedChunk);
  return chunks;
};

export const dropDuplicatesMultiKey = <Object, Key extends keyof Object>(
  objects: Object[],
  keys: Key[],
): Object[] => {
  const existingKeys = new Set<string>();
  const filtered: Object[] = [];

  for (let index = objects.length - 1; index >= 0; index -= 1) {
    const obj = objects[index];
    const ids = keys.map((key) => obj[key]).join(', ');
    if (!existingKeys.has(ids)) {
      filtered.push(obj);
      existingKeys.add(ids);
    }
  }

  return filtered;
};

export const balanceOf = async (address: string, token: string, abi: ABI): Promise<string> => {
  const contract = new Contract(token, abi, getProvider());
  const balance = await contract.balanceOf(address);
  return balance.toString();
};

export const balanceOfErc1155 = async (address: string, token: string, nft: string, abi: ABI): Promise<string> => {
  const contract = new Contract(token, abi, getProvider());
  const balance = await contract.balanceOf(address, nft);
  return balance.toString();
};

export const removeUndefinedItem = <Type, >(item: (Type|undefined)): item is Type => item !== undefined;

export const stringifyArray = (array: any[]) => {
  let string = "[";
  for (let i = 0; i < array.length; i++) {
      const object = array[i];
      string += `{${Object.entries(object)
        .map(([key, value]) => {
          switch(typeof value) {
            case 'string':
              return `${key}: "${value}"`;
            case 'object':
              return value ? `${key}: ${JSON.stringify(JSON.stringify(value))}` : null;
            default:
              return `${key}: ${value}`;
          }
        })
        .join(', ')}}`
      if (i !== array.length - 1) {
        string += ",";
      }
  }
  string += "]";
  return string;
}

export const trim = (str: string, length = 1000) => {
  return str.substring(0, length) + "...";
}

export const buildBatches = <T>(array: T[], size: number) => {
  return array.reduce((acc, _, index) => {
    if (index % size === 0) {
      acc.push(array.slice(index, index + size));
    }
    return acc;
  }, [] as T[][]);
}