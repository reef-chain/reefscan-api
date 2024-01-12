import config from "../../utils/config";
import { mutate } from '../../utils/connector';
import { EvmLogWithDecodedEvent, Transfer } from '../../utils/types';
import { buildBatches, findNativeAddress, resolvePromisesAsChunks, stringifyArray } from '../../utils/utils';
import { isErc1155TransferBatchEvent, isErc1155TransferSingleEvent, isErc20TransferEvent, isErc721TransferEvent } from './evmEvent';

const evmLogToTransfer = async ({
  id, timestamp, address, blockHeight, blockHash, extrinsicIndex, signedData, finalized
}: EvmLogWithDecodedEvent, fromEvmAddress: string, toEvmAddress: string): Promise<Transfer> => {
  const [toAddress, fromAddress] = await Promise.all([
    findNativeAddress(toEvmAddress),
    findNativeAddress(fromEvmAddress),
  ]);

  return {
    id,
    blockHeight,
    blockHash,
    extrinsicIndex,
    toId: toAddress === '' ? '0x' : toAddress,
    fromId: fromAddress === '' ? '0x' : fromAddress,
    tokenId: address,
    toEvmAddress,
    fromEvmAddress,
    type: 'ERC20',
    amount: '0',
    feeAmount: signedData.fee?.partialFee || '0',
    errorMessage: '',
    success: true,
    timestamp,
    finalized
  };
};

const erc20EvmLogToTransfer = async (log: EvmLogWithDecodedEvent): Promise<Transfer[]> => {
  const [from, to, amount] = log.decodedEvent.args;
  const base = await evmLogToTransfer(log, from, to);

  return [{
    ...base,
    type: 'ERC20',
    amount: amount.toString(),
    denom: log.contractData?.symbol,
  }];
};

const erc721EvmLogToTransfer = async (log: EvmLogWithDecodedEvent): Promise<Transfer[]> => {
  const [from, to, nftId] = log.decodedEvent.args;
  const base = await evmLogToTransfer(log, from, to);

  return [{
    ...base,
    type: 'ERC721',
    nftId: nftId.toString(),
  }];
};

const erc1155SingleEvmLogToTransfer = async (log: EvmLogWithDecodedEvent): Promise<Transfer[]> => {
  const [, from, to, nftId, amount] = log.decodedEvent.args;
  const base = await evmLogToTransfer(log, from, to);

  return [{
    ...base,
    type: 'ERC1155',
    nftId: nftId.toString(),
    amount: amount.toString(),
  }];
};

const erc1155BatchEvmLogToTransfer = async (log: EvmLogWithDecodedEvent): Promise<Transfer[]> => {
  const [, from, to, nftIds, amounts] = log.decodedEvent.args;
  const base = await evmLogToTransfer(log, from, to);

  return (nftIds as []).map((_, index) => ({
    ...base,
    type: 'ERC1155',
    nftId: nftIds[index].toString(),
    amount: amounts[index].toString(),
  }));
};

export const processTokenTransfers = async (evmLogs: EvmLogWithDecodedEvent[]): Promise<Transfer[]> => {
  const transfers = evmLogs
    .map(async (log): Promise<Transfer[]> => {
      if (isErc20TransferEvent(log)) {
        return erc20EvmLogToTransfer(log);
      } if (isErc721TransferEvent(log)) {
        return erc721EvmLogToTransfer(log);
      } if (isErc1155TransferSingleEvent(log)) {
        return erc1155SingleEvmLogToTransfer(log);
      } if (isErc1155TransferBatchEvent(log)) {
        return erc1155BatchEvmLogToTransfer(log);
      }
      return Promise.resolve([]);
    });
  const result = await resolvePromisesAsChunks(transfers);
  return result.flat();
};

export const insertTransfers = async (transfers: Transfer[]): Promise<boolean> => {
  if (!transfers.length) return true;
  const batches = buildBatches<Transfer>(transfers, config.mutationSize);
  const results = await Promise.all(batches.map((batch) => mutate<boolean>(
    `mutation {
      saveTransfers(
        transfers: ${stringifyArray(batch)}
      )
    }`
  )));
  return results.every((result) => !!result);
};