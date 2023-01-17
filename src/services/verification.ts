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
import { ensure, toChecksumAddress } from '../utils/utils';
import resolveContractData from './contract-compiler/erc-checkers';

interface Bytecode {
  bytecode: string | null;
}

interface ContractVerificationID {
  id: string | null;
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
}

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
}: UpdateContract): Promise<void> => {
  await mutate(`
    mutation {
      saveVerifiedContract(
        id: "${id}",
        name: "${name}",
        filename: "${filename}",
        source: ${JSON.stringify(source)},
        runs: ${runs},
        optimization: ${optimization},
        compilerVersion: "${compilerVersion}",
        args: "${args}",
        target: "${target}",
        compiledData: ${JSON.stringify(JSON.stringify(abi))},
        type: "${type}",
        contractData: "${data}"
        timestamp: ${Date.now()}
      )
    }
  `);
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
        args: "${args}",
        target: "${target}",
        message: "${errorMessage}",
        success: ${success},
        timestamp: ${Date.now()}
      )
    }
  `);
};

export const verify = async (
  verification: AutomaticContractVerificationReq,
): Promise<void> => {
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
  await insertVerifiedContract({
    ...verification,
    id: verification.address,
    args,
    type,
    abi: fullAbi,
    data: JSON.stringify(data),
    optimization: verification.optimization === 'true',
  });
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

export const findVeririedContract = async (
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
