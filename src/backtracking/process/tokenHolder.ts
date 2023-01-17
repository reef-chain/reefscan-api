import { mutate } from "../../utils/connector";
import { EvmLogWithDecodedEvent, TokenHolder, TokenHolderHead, TokenType } from "../../utils/types";
import { balanceOf, balanceOfErc1155, buildBatches, dropDuplicatesMultiKey, findNativeAddress, removeUndefinedItem, resolvePromisesAsChunks, stringifyArray } from "../../utils/utils";
import { isErc1155TransferBatchEvent, isErc1155TransferSingleEvent, isErc20TransferEvent, isErc721TransferEvent } from "./evmEvent";

const prepareTokenHolderHead = (evmAddress: string, nftId: null | string, type: TokenType, {
  timestamp, address: tokenId, abis, name,
}: EvmLogWithDecodedEvent): TokenHolderHead => ({
  type,
  nftId,
  timestamp,
  evmAddress,
  tokenId,
  abi: abis[name],
});

const processTokenHolderHead = async (head: TokenHolderHead, balance: string): Promise<TokenHolder> => {
  const native = await findNativeAddress(head.evmAddress);
  return {
    id: `${head.tokenId}-${native !== '' ? native : head.evmAddress}${head.nftId ? `-${head.nftId}` : ''}`,
    balance,
    signerId: native,
    evmAddress: native !== '' ? '' : head.evmAddress,
    tokenId: head.tokenId,
    nftId: head.nftId,
    type: native !== '' ? 'Account' : 'Contract',
    timestamp: head.timestamp
  };
};

const base = (from: string, to: string, nft: null | string, type: TokenType, log: EvmLogWithDecodedEvent): TokenHolderHead[] => [
  prepareTokenHolderHead(to, nft, type, log),
  prepareTokenHolderHead(from, nft, type, log),
];

const evmLogToTokenHolderHead = (log: EvmLogWithDecodedEvent): TokenHolderHead[] => {
  if (isErc20TransferEvent(log)) {
    const [from, to] = log.decodedEvent.args;
    return base(from, to, null, 'ERC20', log);
  }
  if (isErc721TransferEvent(log)) {
    const [from, to, nft] = log.decodedEvent.args;
    return base(from, to, nft.toString(), 'ERC721', log);
  }
  if (isErc1155TransferSingleEvent(log)) {
    const [, from, to, nft] = log.decodedEvent.args;
    return base(from, to, nft.toString(), 'ERC1155', log);
  }
  if (isErc1155TransferBatchEvent(log)) {
    const [, from, to, nfts] = log.decodedEvent.args;
    return (nfts as [])
      .flatMap((_, index) => base(from, to, nfts[index].toString(), 'ERC1155', log));
  }
  return [];
};

export const processEvmTokenHolders = async (evmLogs: EvmLogWithDecodedEvent[]): Promise<TokenHolder[]> => {
  const tokenHolders = dropDuplicatesMultiKey(
    evmLogs.flatMap(evmLogToTokenHolderHead),
    ['evmAddress', 'tokenId', 'nftId'],
  )
    .filter(({ evmAddress }) => evmAddress !== '0x0000000000000000000000000000000000000000')
    // Balance of function is surrounded by a try-catch statement because every contract can be deleted.
    // If a contract is deleted there is no on-chain data and the old data can not be reached.
    // Therefore we are capturing these events and filtering them out.
    .map(async (head) => {
      try {
        const balance = head.type === 'ERC1155'
          ? await balanceOfErc1155(head.evmAddress, head.tokenId, head.nftId!, head.abi)
          : await balanceOf(head.evmAddress, head.tokenId, head.abi);
        return processTokenHolderHead(head, balance);
      } catch (e) {
        return undefined;
      }
    });

  const results = await resolvePromisesAsChunks(tokenHolders);
  return dropDuplicatesMultiKey(results.filter(removeUndefinedItem), ['id']);
};

export const insertTokenHolders = async (tokenHolders: TokenHolder[]): Promise<boolean> => {
  if (!tokenHolders.length) return true;
  const batches = buildBatches(tokenHolders);
  const results = await Promise.all(batches.map((batch) => mutate<boolean>(
    `mutation {
      saveTokenHolders(
        tokenHolders: ${stringifyArray(batch)}
      )
    }`
  )));
  return results.every((result) => !!result);
};