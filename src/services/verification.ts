import { mutate, query } from '../utils/connector';
import verifyContract from './contract-compiler/compiler';
import verifyContractArguments from './contract-compiler/argumentEncoder';
import {
  ABI,
  AutomaticContractVerificationReq,
  ContractType,
  License,
  Target,
} from '../utils/types';
import { buildBatches, ensure, toChecksumAddress, wait } from '../utils/utils';
import resolveContractData from './contract-compiler/erc-checkers';
import { verifiedContractRepository } from '..';
import { Op } from 'sequelize';
import config from '../utils/config';
import { VerifiedContractEntity } from '../db/VerifiedContract.db';
import { getProvider } from '../utils/connector';
import { FileStorageService, GCPStorage, LocalStorage } from "./file-storage-service";
import { ApolloClient, HttpLink, InMemoryCache, gql } from '@apollo/client/core';
import fetch from "cross-fetch";

interface Bytecode {
  bytecode: string | null;
}

interface ContractVerificationID {
  id: string | null;
}

interface ContractVerifiedID {
  id: string;
}

interface ContractVerificationInsert {
  id: string;
  name: string;
  filename: string;
  source: string;
  runs: number;
  optimization: boolean;
  compilerVersion: string;
  args: string;
  target: string;
  success: boolean;
  errorMessage?: string;
  license?: License;
}
interface VerifiedContract {
  id: string;
  name: string;
  filename: string;
  source: JSON;
  runs: number;
  optimization: boolean;
  compilerVersion: JSON;
  args: any[];
  target: string;
  compiledData: JSON;
  type: string;
  contractData: JSON;
  timestamp: Date;
}

interface UpdateContract {
  name: string;
  target: Target;
  source: string;
  id: string;
  license?: License;
  optimization: boolean;
  abi: { [filename: string]: ABI };
  runs: number;
  args: string;
  filename: string;
  compilerVersion: string;
  type: ContractType;
  data: string;
  timestamp: number;
  approved?: boolean;
}

const fileStorageService: FileStorageService = config.localBackup
  ? new LocalStorage() : new GCPStorage(`subsquid-api-backup-${config.network}`);

const checkLicense = (verification: AutomaticContractVerificationReq) => {
  const license = verification.license.replace(':', '').trim();
  const validLicenses = ['none', 'unlicense', 'MIT', 'GNU GPLv2', 'GNU GPLv3', 'GNU LGPLv2.1', 'GNU LGPLv3', 'BSD-2-Clause', 'BSD-3-Clause', 'MPL-2.0', 'OSL-3.0', 'Apache-2.0', 'GNU AGPLv3'];
  ensure(validLicenses.includes(license), 'Invalid license, must be one of '+ validLicenses.join(','), 403);
  verification.license = license as License;
  const sourceMain = JSON.parse(verification.source)[verification.filename];
  const licenseRegex =
    /SPDX-License-Identifier:\s*(none|unlicense|MIT|GNU GPLv2|GNU GPLv3|GNU LGPLv2.1|GNU LGPLv3|BSD-2-Clause|BSD-3-Clause|MPL-2.0|OSL-3.0|Apache-2.0|GNU AGPLv3)/i;
  const match = sourceMain.match(licenseRegex);
  if (match) {
    ensure(match[1] === verification.license, 'Mismatch in license', 403);
  }
};

const findContractBytecode = async (id: string): Promise<string> => {
  const contract = await query<Bytecode>(
    'contractById',
    `query {
      contractById(id: "${id}") {
        bytecode
      }
    }`
  );
  return contract && contract.bytecode ? contract.bytecode : '';
};

const getBlockHeight = async (): Promise<number> => {
  const lastBlock = await query<Bytecode>(
    'blocks',
    `query {
      blocks(limit:1, orderBy: height_DESC) {
        height
      }
    }`
  );
  return lastBlock && lastBlock[0] && lastBlock[0].height ? lastBlock[0].height : 0;
};

const insertVerifiedContract = async ({
  id,
  name,
  filename,
  source,
  optimization,
  compilerVersion,
  abi,
  args,
  runs,
  target,
  type,
  data,
  license,
  timestamp,
  approved = false
}: UpdateContract): Promise<boolean> => {
  const result = await mutate<{saveVerifiedContract: boolean}>(`
    mutation {
      saveVerifiedContract(
        id: "${id}",
        name: "${name}",
        filename: "${filename}",
        source: ${JSON.stringify(source)},
        runs: ${runs},
        optimization: ${optimization},
        compilerVersion: "${compilerVersion}",
        args: ${JSON.stringify(args)},
        target: "${target}",
        compiledData: ${JSON.stringify(JSON.stringify(abi))},
        type: "${type}",
        contractData: ${JSON.stringify(data)}
        license: "${license}",
        timestamp: ${timestamp},
        approved: ${approved}
      )
    }
  `);
  return result?.saveVerifiedContract || false;
};

export const contractVerificationRequestInsert = async ({
  id,
  name,
  filename,
  source,
  runs,
  optimization,
  compilerVersion,
  args,
  target,
  success,
  errorMessage,
  license
}: ContractVerificationInsert): Promise<void> => {
  await mutate(`
    mutation {
      saveVerificationRequest(
        id: "${id}",
        name: "${name}",
        filename: "${filename}",
        source: ${JSON.stringify(source)},
        runs: ${runs},
        optimization: ${optimization},
        compilerVersion: "${compilerVersion}",
        args: ${JSON.stringify(args)},
        target: "${target}",
        message: "${errorMessage}",
        success: ${success},
        license: "${license}",
        timestamp: ${Date.now()}
      )
    }
  `);
};

export const contractInsert = async (
  address: string,
  bytecode: string,
  signerAddress: string
): Promise<void> => {
  await mutate(`
    mutation {
      saveContract(
        id: "${address}",
        extrinsicId: "-1",
        signerAddress: "${signerAddress}",
        bytecode: "${bytecode}",
        bytecodeContext: "",
        bytecodeArguments: "",
        gasLimit: "0",
        storageLimit: "0",
        timestamp: ${Date.now()}
      )
    }
  `);
};

export const verify = async (
  verification: AutomaticContractVerificationReq,
  backup = true,
  contractData = null,
  approved = false
): Promise<void> => {
  const existing = await findVerifiedContract(verification.address);
  ensure(!existing, 'Contract already verified', 400);

  if (!verification.license || verification.license == 'none') {
    verification.license = 'none';
  } else {
    checkLicense(verification);
  }

  const args = verification.arguments;

  if (verification.blockHeight) {
    // Wait until reach block height (if it is not too far away)
    const startTime = Date.now();
    while (true) {
      const blockheight = await getBlockHeight();
      if (blockheight >= verification.blockHeight // Block height reached
        || blockheight + 500 < verification.blockHeight // Block height too far away
        || Date.now() - startTime > 1000 * 60 * 50) { // Timeout of 5 minutes TODO
        break;
      }
      await wait(10000);
    }
  }

  let deployedBytecode = await findContractBytecode(verification.address);
  if (deployedBytecode === '' && verification.blockHeight) {
    // Try to find contract on chain, and insert it in explorer if exists
    const account = await getProvider().api.query.evm.accounts(verification.address);
    const codeHash = (account.toHuman() as any)?.contractInfo?.codeHash || undefined;
    const maintainer = (account.toHuman() as any)?.contractInfo?.maintainer || undefined;
    if (codeHash) {
      const code = await getProvider().api.query.evm.codes(codeHash);
      if (code?.toHuman()?.toString() !== '') {
        const signer = maintainer ? await getProvider().api.query.evmAccounts.accounts(maintainer) : undefined;
        await contractInsert(
          verification.address,
          code!.toHuman()!.toString(),
          signer && signer.toHuman() ? signer!.toHuman()!.toString() : '0x'
        );
        deployedBytecode = await findContractBytecode(verification.address);
      }
    }
  }
  ensure(deployedBytecode !== '', 'Contract does not exist', 404);

  const { abi, fullAbi } = await verifyContract(deployedBytecode, verification);
  verifyContractArguments(deployedBytecode, abi, JSON.parse(args));

  // Confirming verification request
  await contractVerificationRequestInsert({
    ...verification,
    success: true,
    id: verification.address,
    args,
    optimization: verification.optimization === 'true',
  });
  // Resolving contract additional information
  const { type, data } = await resolveContractData(verification.address, abi);

  // Inserting contract into verified contract table
  const verified = await insertVerifiedContract({
    ...verification,
    id: verification.address,
    args,
    type,
    abi: fullAbi,
    data: JSON.stringify(data),
    optimization: verification.optimization === 'true',
    approved
  });

  if (verified && backup) {
    // Inserting contract into API database as backup
    try {
      await verifiedContractRepository.create({
        address: verification.address,
        args: JSON.parse(verification.arguments),
        compilerVersion: verification.compilerVersion,
        filename: verification.filename,
        name: verification.name,
        optimization: verification.optimization === 'true',
        runs: verification.runs,
        source: JSON.parse(verification.source),
        target: verification.target,
        license: verification.license.toString(),
        timestamp: verification.timestamp,
        contractData: contractData || data,
        approved
      });
    } catch (err: any) {
      console.error(err);
    }
  }
};

export const updateVerifiedContractData = async (
  id: string,
  data: any
): Promise<boolean> => {
  // Updating verified contract data
  const response = await mutate<any>(`
    mutation {
      updateVerifiedContractData(
        id: "${id}",
        contractData: ${JSON.stringify(JSON.stringify(data))}
      )
    }
  `);
  const success = response?.updateVerifiedContractData || false;

  if (success)  {
    // Updating contract into API database as backup
    try {
      const verifiedBackup = await verifiedContractRepository.findByPk(id);
      if (verifiedBackup) {
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            (verifiedBackup.contractData as any)[key] = data[key];
          }
        }
        verifiedContractRepository.update(
          { contractData: verifiedBackup.contractData },
          { where: {address: id} }
        );
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  return success;
};

export const updateVerifiedContractApproved = async (
  id: string,
  approved: boolean
): Promise<boolean> => {
  // Updating verified contract approved
  const response = await mutate<any>(`
    mutation {
      updateVerifiedContractApproved(
        id: "${id}",
        approved: ${approved}
      )
    }
  `);
  const success = response?.updateVerifiedContractApproved || false;

  if (success)  {
    // Updating contract into API database as backup
    try {
      const verifiedBackup = await verifiedContractRepository.findByPk(id);
      if (verifiedBackup) {
        verifiedContractRepository.update(
          { approved },
          { where: {address: id} }
        );
      }
    } catch (err: any) {
      console.error(err);
    }

    // Notify change to Reef Swap API
    await notifyVerifiedContractApprovedInReefSwap(id, approved);
  }

  return success;
};

// Notifies Reef Swap API to update pool state when `updateVerifiedContractApproved` is called by the admin.
// TODO: Manage this with events instead of polling.
const notifyVerifiedContractApprovedInReefSwap = async (
  id: string,
  approved: boolean
) => {
  const reefSwapClient = new ApolloClient({
    link: new HttpLink({
      uri: `${config.reefSwapApi}`,
      fetch,
      headers: { authorization: `Bearer ${config.reefSwapApiKey}` }
    }),
    cache: new InMemoryCache(),
  });

  try {
    const statement = `mutation{updateTokenApproved(id: "${id}", approved: ${approved})}`;
    const result = await reefSwapClient.mutate({ mutation: gql(statement) });
    if(config.debug) {
      console.log(`Notify token approved: ${result.data.updateTokenApproved}`);
    }
  } catch (error) {
    if(config.debug) {
      console.error(`Notify token approved ERROR: ${error}`)
    }
  }
};

export const contractVerificationStatus = async (
  id: string,
): Promise<boolean> => {
  const verificationRequest = await query<ContractVerificationID>(
    'verificationRequestById',
    `query {
      verificationRequestById(id: "${toChecksumAddress(id)}") {
        id
      }
    }`
  );
  return !!verificationRequest && !!verificationRequest.id;
};

export const findVerifiedContract = async (
  id: string,
): Promise<VerifiedContract | null> => {
  const verifiedContract = await query<VerifiedContract | null>(
    'verifiedContractById',
    `query {
      verifiedContractById(id: "${id}") {
        id
        name
        filename
        source
        runs
        optimization
        compilerVersion
        compiledData
        args
        target
        type
        contractData
        timestamp
        approved
      }
    }`
  );
  return verifiedContract;
};

export const findAllVerifiedContractIds = async (): Promise<string[]> => {
  const QUERY_LIMIT = 500;
  const allVerifiedContracts: ContractVerifiedID[] = [];
  let moreAvailable = true;
  let currIndex = 0;

  while (moreAvailable) {
    const verifiedContracts = await query<ContractVerifiedID[] | null>(
      'verifiedContracts',
      `query {
        verifiedContracts(limit: ${QUERY_LIMIT}, offset: ${currIndex}) { id }
      }`
    );
    if (!verifiedContracts || !verifiedContracts.length || verifiedContracts.length < QUERY_LIMIT) {
      moreAvailable = false;
    }
    allVerifiedContracts.push(...verifiedContracts!);
    currIndex += QUERY_LIMIT;
  }
  return allVerifiedContracts.map((contract) => contract.id);
};

// Verify in Squid all contracts from backup database (only the ones that are not already verified)
export const verifyPendingFromBackup = async (): Promise<string> => {
  const verifiedIds = await findAllVerifiedContractIds();

  const verifiedPending = await verifiedContractRepository.findAll({
    where: { address: { [Op.notIn]: verifiedIds } }
  });
  if(config.debug) {
    console.log(`Found ${verifiedPending.length} contracts to verify from backup`)
  }

  let count = 0;
  for (const verifiedContract of verifiedPending) {
    if(config.debug) {
      console.log(`Verifying ${verifiedContract.address} [${++count}/${verifiedPending.length}]`)
    }
    try {
      await verify({
        name: verifiedContract.name,
        runs: verifiedContract.runs,
        source: JSON.stringify(verifiedContract.source),
        target: verifiedContract.target as Target,
        address: verifiedContract.address,
        filename: verifiedContract.filename,
        license: verifiedContract.license as License,
        arguments: JSON.stringify(verifiedContract.args),
        optimization: verifiedContract.optimization.toString(),
        compilerVersion: verifiedContract.compilerVersion,
        timestamp: verifiedContract.timestamp,
        blockHeight: 1,
      }, false, verifiedContract.contractData, verifiedContract.approved || false);
    } catch (err: any) {
      console.error(err);
    }
  }

  console.log('Finished verifying from backup');
  return "Verification from backup finished";
}

// Gets verified contracts from Squid and inserts them into backup database
export const createBackupFromSquid = async (): Promise<void> => {
  await verifiedContractRepository.destroy({
    where: {},
    truncate: true
  });

  const QUERY_LIMIT = 50;
  let moreAvailable = true;
  let currIndex = 0;

  while (moreAvailable) {
    const verifiedContracts = await query<any[] | null>(
      'verifiedContracts',
      `query {
        verifiedContracts(limit: ${QUERY_LIMIT}, offset: ${currIndex}) { 
          id
          args
          compilerVersion
          filename
          name
          optimization
          runs
          source
          target
          license
          contractData
          timestamp
          approved
        }
      }`
    )
    if (!verifiedContracts || !verifiedContracts.length) {
      moreAvailable = false;
    } else {
      moreAvailable = verifiedContracts.length === QUERY_LIMIT;
      await verifiedContractRepository.bulkCreate(
        verifiedContracts.map((contract) => ({
          ...contract,
          approved: contract.approved === true,
          address: contract.id,
          timestamp: new Date(contract.timestamp).getTime()
        }))
      );
      currIndex += QUERY_LIMIT;
    }
  }
}

// Imports verified contracts from JSON files to backup database
export const importBackupFromFiles = async (): Promise<void> => {
  await verifiedContractRepository.destroy({
    where: {},
    truncate: true
  });

  let fileExists = true;
  let fileIndex = 1;
  while (fileExists) {
    const fileName = `backup/verified_${config.network}_${String(fileIndex).padStart(3, "0")}.json`;
    if (await fileStorageService!.fileExists(fileName)) {
      const file = await fileStorageService.readFile(fileName);
      const contractBatch: VerifiedContractEntity[] = JSON.parse(file);
      verifiedContractRepository.bulkCreate(contractBatch);
      fileIndex++;
    } else {
      fileExists = false;
    }
  }
}

// Exports verified contracts from backup database to JSON files
export const exportBackupToFiles = async (): Promise<void> => {
  const verifiedContracts = await verifiedContractRepository.findAll();

  // Delete old backup files
  let fileExists = true;
  let fileIndex = 1;
  while (fileExists) {
    const fileName = `backup/verified_${config.network}_${String(fileIndex).padStart(3, "0")}.json`;
    if (await fileStorageService.fileExists(fileName)) {
      fileStorageService!.deleteFile(fileName);
      fileIndex++;
    } else {
      fileExists = false;
    }
  }

  // Write new backup files
  const batches = buildBatches<VerifiedContractEntity>(verifiedContracts, 50);
  await Promise.all(batches.map(async (contracts: VerifiedContractEntity[], index: number) => {
    const fileName = `backup/verified_${config.network}_${String(index + 1).padStart(3, "0")}.json`;
    await fileStorageService.writeFile(fileName, JSON.stringify(contracts));
  }));
  console.log('Finished exporting backup');
}
