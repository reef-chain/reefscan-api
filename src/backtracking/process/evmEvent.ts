import config from "../../utils/config";
import { mutate } from "../../utils/connector";
import { EvmEventDataParsed, EvmLogWithDecodedEvent } from "../../utils/types";
import { buildBatches, stringifyArray } from "../../utils/utils";

export const isErc20TransferEvent = ({ decodedEvent, type }: EvmLogWithDecodedEvent): boolean => decodedEvent.name === 'Transfer' && type === 'ERC20';

export const isErc721TransferEvent = ({ decodedEvent, type }: EvmLogWithDecodedEvent): boolean => decodedEvent.name === 'Transfer' && type === 'ERC721';

export const isErc1155TransferSingleEvent = ({ decodedEvent, type }: EvmLogWithDecodedEvent): boolean => decodedEvent.name === 'TransferSingle' && type === 'ERC1155';

export const isErc1155TransferBatchEvent = ({ decodedEvent, type }: EvmLogWithDecodedEvent): boolean => decodedEvent.name === 'TransferBatch' && type === 'ERC1155';

export const updateEvmEventsDataParsed = async (evmEvents: EvmEventDataParsed[]): Promise<boolean> => {
    if (!evmEvents.length) return true;

    const batches = buildBatches<EvmEventDataParsed>(evmEvents, config.mutationSize);
    if(config.debug) console.log(`Updating ${evmEvents.length} evm events in ${batches.length} batches`);

    for (const [index, batch] of batches.entries()) {
      const result = await mutate<boolean>(
        `mutation {
          updateEvmEventsDataParsed(
            evmEvents: ${stringifyArray(batch)}
          )
        }`
      );
      if(config.debug) {
        result ? console.log(`Batch ${index + 1} updated`) : console.log(`Batch ${index + 1} failed`);
      }
      if (!result) return false;
    }
    return true;
};