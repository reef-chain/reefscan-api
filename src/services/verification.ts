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
import { buildBatches, ensure, toChecksumAddress } from '../utils/utils';
import resolveContractData from './contract-compiler/erc-checkers';
import { verifiedContractRepository } from '..';
import { Op } from 'sequelize';
import fs from 'fs';
import config from '../utils/config';
import { VerifiedContractEntity } from '../db/VerifiedContract.db';

interface Bytecode {
  bytecode: string | null;
}

interface ContractVerificationID {
  id: string | null;
}

interface ContractVerifiedID {
  id: string;
}

interface ContracVerificationInsert {
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
}

const checkLicense = (verification: AutomaticContractVerificationReq) => {
  const license = verification.license.replace(':', '').trim();
  ensure(['none', 'unlicense', 'MIT', 'GNU GPLv2', 'GNU GPLv3', 'GNU LGPLv2.1', 'GNU LGPLv3', 'BSD-2-Clause', 'BSD-3-Clause', 'MPL-2.0', 'OSL-3.0', 'Apache-2.0', 'GNU AGPLv3']
    .includes(license), 'Invalid license', 404);
  verification.license = license as License;
  const sourceMain = JSON.parse(verification.source)[verification.filename];
  const licenseRegex =
    /SPDX-License-Identifier:\s*(none|unlicense|MIT|GNU GPLv2|GNU GPLv3|GNU LGPLv2.1|GNU LGPLv3|BSD-2-Clause|BSD-3-Clause|MPL-2.0|OSL-3.0|Apache-2.0|GNU AGPLv3)/i;
  const match = sourceMain.match(licenseRegex);
  if (match) {
    ensure(match[1] === verification.license, 'Mismatch in license', 404);
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
  ensure(!!contract && !!contract.bytecode, 'Contract does not exist', 404);
  return contract!.bytecode!;
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
  timestamp
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
        timestamp: ${timestamp}
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
}: ContracVerificationInsert): Promise<void> => {
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

export const verify = async (
  verification: AutomaticContractVerificationReq,
  backup = true
): Promise<void> => {
  const existing = await findVerifiedContract(verification.address);
  if (existing) throw new Error('Contract already verified');

  checkLicense(verification);

  const args = verification.arguments;

  const deployedBytecode = await findContractBytecode(verification.address);
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
    optimization: verification.optimization === 'true'
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
        timestamp: verification.timestamp
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
      // TODO
    } catch (err: any) {
      console.error(err);
    }
  }

  return success;
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

export const verifyPendingFromBackup = async (): Promise<string> => {
  const verifiedIds = await findAllVerifiedContractIds();

  const verifiedPending = await verifiedContractRepository.findAll({ 
    where: { address: { [Op.notIn]: verifiedIds } } 
  });
  console.log(`Found ${verifiedPending.length} contracts to verify from backup`)

  for (const verifiedContract of verifiedPending) {
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
        timestamp: verifiedContract.timestamp
      }, false);
    } catch (err: any) { 
      console.error(err);
    }
  }

  console.log('Finished verifying from backup');
  return "Verification from backup finished";
}

export const importBackupFromFiles = async (): Promise<void> => {
  await verifiedContractRepository.destroy({
    where: {},
    truncate: true
  });

  let fileExists = true;
  let fileIndex = 1;
  while (fileExists) {
    const fileName = `backup/verified_${config.network}_${String(fileIndex).padStart(3, "0")}.json`;
    if (fs.existsSync(fileName)) {
      const file = fs.readFileSync(fileName, "utf8");
      const contractBatch: VerifiedContractEntity[] = JSON.parse(file);
      verifiedContractRepository.bulkCreate(contractBatch);
      fileIndex++;
    } else {
      fileExists = false;
    }
  }
}

export const exportBackupToFiles = async (): Promise<void> => {
  const verifiedContracts = await verifiedContractRepository.findAll();

  // Delete old backup files
  let fileExists = true;
  let fileIndex = 1;
  while (fileExists) {
    const fileName = `backup/verified_${config.network}_${String(fileIndex).padStart(3, "0")}.json`;
    if (fs.existsSync(fileName)) {
      fs.unlinkSync(fileName);
      fileIndex++;
    } else {
      fileExists = false;
    }
  }

  // Write new backup files
  const batches = buildBatches<VerifiedContractEntity>(verifiedContracts, 50);
  await Promise.all(batches.map(async (contracts: VerifiedContractEntity[], index: number) => {
    const fileName = `backup/verified_${config.network}_${String(index + 1).padStart(3, "0")}.json`;
    await fs.promises.writeFile(fileName, JSON.stringify(contracts));
  }));
  console.log('Finished exporting backup');
}