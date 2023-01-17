import { mutate } from "../../utils/connector";
import { EvmEventDataParsed, EvmLogWithDecodedEvent } from "../../utils/types";
import { buildBatches, stringifyArray } from "../../utils/utils";

export const isErc20TransferEvent = ({ decodedEvent, type }: EvmLogWithDecodedEvent): boolean => decodedEvent.name === 'Transfer' && type === 'ERC20';

export const isErc721TransferEvent = ({ decodedEvent, type }: EvmLogWithDecodedEvent): boolean => decodedEvent.name === 'Transfer' && type === 'ERC721';

export const isErc1155TransferSingleEvent = ({ decodedEvent, type }: EvmLogWithDecodedEvent): boolean => decodedEvent.name === 'TransferSingle' && type === 'ERC1155';

export const isErc1155TransferBatchEvent = ({ decodedEvent, type }: EvmLogWithDecodedEvent): boolean => decodedEvent.name === 'TransferBatch' && type === 'ERC1155';

export const updateEvmEventsDataParsed = async (evmEvents: EvmEventDataParsed[]): Promise<boolean> => {
    if (!evmEvents.length) return true;
    const batches = buildBatches<EvmEventDataParsed>(evmEvents);
    const results = await Promise.all(batches.map((batch) => mutate<boolean>(
      `mutation {
        updateEvmEventsDataParsed(
          evmEvents: ${stringifyArray(batch)}
        )
      }`
    )));
    return results.every((result) => !!result);
};