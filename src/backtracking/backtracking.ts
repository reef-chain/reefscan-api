import { mutate, query } from '../utils/connector';
import { wait } from '../utils/utils';
import { BacktrackingEvmEvent, EvmLogWithDecodedEvent, VerifiedContract } from '../utils/types';
import { ethers } from 'ethers';
import { insertTransfers, processTokenTransfers } from './process/transfer';
import { insertTokenHolders, processEvmTokenHolders } from './process/tokenHolder';
import { updateEvmEventsDataParsed } from './process/evmEvent';
import config from "../utils/config";

interface Address {
  id: string;
}

const backtrackContractEvents = async (contractAddress: string): Promise<boolean> => {
  if(config.debug) {
    console.log(`Retrieving contract ${contractAddress} unverified evm events`);
  }
  let evmEvents = await query<BacktrackingEvmEvent[]>(
    'findBacktrackingEvmEvents',
    `query {
      findBacktrackingEvmEvents(id: "${contractAddress}") {
        id
        blockHeight
        blockHash
        extrinsicId
        extrinsicHash
        extrinsicIndex
        rawData
        timestamp
        signedData
        finalized
      }
    }`
  );
  if (!evmEvents) return false;

  if(config.debug) {
    console.log(`There were ${evmEvents.length} unverified evm events`);
  }
  const contract = await query<VerifiedContract>(
    'verifiedContractById',
    `query {
      verifiedContractById(id: "${contractAddress}") {
        id
        contractData
        compiledData
        name
        type
      }
    }`
  );

  if (!contract) {
    if(config.debug) {
      console.log(`Contract address: ${contractAddress} was not found in verified contract...`);
    }
    return false;
  }

  const contractInterface = new ethers.utils.Interface(contract.compiledData[contract.name]);

  const processedLogs: BacktrackingEvmEvent[] = [];

  for (let i = 0; i < evmEvents.length; i++) {
    try {
      const evmEvent = evmEvents[i];
      const parsedLog = contractInterface.parseLog(evmEvent.rawData);
      processedLogs.push({
        ...evmEvent,
        parsedData: parsedLog
      });
    } catch (error) {
      console.log('No matching logs ... Skipping');
    }
  }

  const evmLogs: EvmLogWithDecodedEvent[] = processedLogs
    .map(({
      id,
      timestamp,
      blockHash,
      blockHeight,
      rawData,
      extrinsicId,
      extrinsicHash,
      extrinsicIndex,
      signedData,
      parsedData,
      finalized
    }) => ({
      id,
      name: contract.name,
      type: contract.type,
      blockHash,
      blockHeight,
      address: contract.id,
      timestamp: new Date(timestamp).getTime(),
      signedData,
      extrinsicId,
      extrinsicHash,
      extrinsicIndex,
      contractData: contract.contractData,
      abis: contract.compiledData,
      data: rawData.data,
      topics: rawData.topics,
      decodedEvent: parsedData,
      fee: signedData,
      finalized
    }));

  const transfers = await processTokenTransfers(evmLogs);
  const tokenHolders = await processEvmTokenHolders(evmLogs);
  if (!await insertTransfers(transfers)) return false;
  if (!await insertTokenHolders(tokenHolders)) return false;
  if (!await updateEvmEventsDataParsed(processedLogs.map((log) => { return { id: log.id, dataParsed: log.parsedData } }))) return false;
  
  console.log('Data from contract events updated successfully');
  return true;
};

export const backtrackEvents = async () => {
  console.log('Starting backtracking service');
  while (true) {
    // Get contract from newly verified contract table
    const contracts = await query<Address[]>(
      'newlyVerifiedContractQueues',
      `query {
        newlyVerifiedContractQueues(limit: 100) {
          id
        }
      }`
    ) || [];

    for (let contractIndex = 0; contractIndex < contracts.length; contractIndex += 1) {
      // Process contract events & store them
      const { id } = contracts[contractIndex];
      if (await backtrackContractEvents(id)) {
        await mutate<boolean>(
          `mutation {
            deleteNewlyVerifiedContractQueue(id: "${id}")
          }`
        );
      } else {
        if(config.debug) {
          console.log(`Error processing contract events for ${id}`);
        }
      }
    }

    await wait(1000);
  }
};
