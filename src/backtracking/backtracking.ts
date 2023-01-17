import { mutate, query } from '../utils/connector';
import { wait } from '../utils/utils';
import { BacktrackingEvmEvent, EvmLogWithDecodedEvent, VerifiedContract } from '../utils/types';
import { ethers } from 'ethers';
import { insertTransfers, processTokenTransfers } from './process/transfer';
import { insertTokenHolders, processEvmTokenHolders } from './process/tokenHolder';
import { updateEvmEventsDataParsed } from './process/evmEvent';

interface Address {
  id: string;
}

const backtractContractEvents = async (contractAddress: string): Promise<boolean> => {
  console.log(`Retrieving contract ${contractAddress} unverified evm events`);
  let evmEvents = await query<BacktrackingEvmEvent[]>(
    'findBacktrackingEvmEvents',
    `query {
      findBacktrackingEvmEvents(id: "${contractAddress}") {
        id
        blockid
        extrinsicid
        eventindex
        extrinsicindex
        contractaddress
        rawdata
        method
        type
        status
        timestamp
        signeddata
      }
    }`
  );
  if (!evmEvents) return false;

  console.log(`There were ${evmEvents.length} unverified evm events`);
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
    console.log(`Contract address: ${contractAddress} was not found in verified contract...`);
    return false;
  }

  const contractInterface = new ethers.utils.Interface(contract.compiledData[contract.name]);

  const processedLogs: BacktrackingEvmEvent[] = [];

  for (let i = 0; i < evmEvents.length; i++) {
    try {
      const evmEvent = evmEvents[i];
      const parsedLog = contractInterface.parseLog(evmEvent.rawdata);
      processedLogs.push({
        ...evmEvent,
        parseddata: parsedLog,
        type: 'Verified',
      });
    } catch (error) {
      console.log('No matching logs ... Skipping');
    }
  }

  const evmLogs: EvmLogWithDecodedEvent[] = processedLogs
    .map(({
      id, timestamp, blockid, rawdata, extrinsicid, signeddata, parseddata,
    }) => ({
      id,
      name: contract.name,
      type: contract.type,
      blockId: blockid,
      address: contract.id,
      timestamp: new Date(timestamp).getTime(),
      signedData: signeddata,
      extrinsicId: extrinsicid,
      contractData: contract.contractData,
      abis: contract.compiledData,
      data: rawdata.data,
      topics: rawdata.topics,
      decodedEvent: parseddata,
      fee: signeddata,
    }));

  console.log('Processing transfer events');
  const transfers = await processTokenTransfers(evmLogs);
  console.log('Processing token-holder events');
  const tokenHolders = await processEvmTokenHolders(evmLogs);

  console.log('Inserting Transfers');
  if (!await insertTransfers(transfers)) return false;
  console.log('Inserting Token holders');
  if (!await insertTokenHolders(tokenHolders)) return false;
  console.log('Updating evm events with parsed data');
  if (!await updateEvmEventsDataParsed(processedLogs.map((log) => { return { id: log.id, dataParsed: log.parseddata } }))) return false;

  console.log('Contract events updated successfully');
  return true;
};

export const backtrackEvents = async () => {
  console.log('Starting backtracking service');
  while (true) {
    // Get contract from newly verificated contract table
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
      if (await backtractContractEvents(id)) {
        await mutate<boolean>(
          `mutation {
            deleteNewlyVerifiedContractQueue(id: "${id}")
          }`
        );
      } else {
        console.log(`Error processing contract events for ${id}`);
      }
    }

    await wait(1000);
  }
};
