import { Request } from 'express';
import {
  Fragment,
  JsonFragment,
  FunctionFragment,
  EventFragment,
  ConstructorFragment,
} from '@ethersproject/abi';
import ethers from 'ethers';

export interface AppRequest<T> extends Request {
  body: T;
}

export interface ERC721Data {
  name: string;
  symbol: string;
}

export interface ERC20Data extends ERC721Data {
  decimals: number;
  tokenUrl?: string;
  token0?: string;
  token1?: string;
}

interface VerifiedERC20 {
  type: 'ERC20';
  data: ERC20Data;
}
interface VerifiedERC721 {
  type: 'ERC721';
  data: ERC721Data;
}
interface VerifiedERC1155 {
  type: 'ERC1155';
  data: {};
}
interface VerifiedOther {
  type: 'other';
  data: {};
}

export type ContractType = 'other' | 'ERC20' | 'ERC721' | 'ERC1155';
export type ContractResolve =
  | VerifiedERC20
  | VerifiedERC721
  | VerifiedERC1155
  | VerifiedOther;

// Basic types
export type Target =
  | 'london'
  | 'berlin'
  | 'istanbul'
  | 'petersburg'
  | 'constantinople'
  | 'byzantium'
  | 'spuriousDragon'
  | 'homestead'
  | 'tangerineWhistle';

export type License =
  | 'none'
  | 'unlicense'
  | 'MIT'
  | 'GNU GPLv2'
  | 'GNU GPLv3'
  | 'GNU LGPLv2.1'
  | 'GNU LGPLv3'
  | 'BSD-2-Clause'
  | 'BSD-3-Clause'
  | 'MPL-2.0'
  | 'OSL-3.0'
  | 'Apache-2.0'
  | 'GNU AGPLv3';

export const compilerTargets: Target[] = [
  'berlin',
  'byzantium',
  'constantinople',
  'homestead',
  'istanbul',
  'london',
  'petersburg',
  'spuriousDragon',
  'tangerineWhistle',
];
export type ABIFragment =
  | Fragment
  | JsonFragment
  | FunctionFragment
  | EventFragment
  | ConstructorFragment;
export type ABI = ReadonlyArray<ABIFragment>;
export type Argument = string | boolean | Argument[];
export type Arguments = any[]; // Argument[];
export type Source = { [filename: string]: string };

// Request types
export interface AutomaticContractVerificationReq {
  name: string;
  runs: number;
  source: string;
  target: Target;
  address: string;
  filename: string;
  license: License;
  arguments: string;
  optimization: string;
  compilerVersion: string;
  timestamp: number;
  blockHeight: number;
}
export type AutomaticContractVerificationKey =
  keyof AutomaticContractVerificationReq;

export interface PoolReq {
  tokenAddress1: string;
  tokenAddress2: string;
}

export interface TokenBalanceParam {
  accountAddress: string;
  contractAddress: string;
}

export interface QueryVerifiedPoolsWithUserLPReq {
  offset: number;
  limit: number;
  signer: string;
  search?: string;
}

export interface ContractData {
  name: string;
  symbol: string;
  decimals: number;
}

interface DefaultPool {
  address: string;
  decimals: number;
  reserve1: string;
  reserve2: string;
}

export interface PoolDB extends DefaultPool {
  balance: string;
  total_supply: string;
  minimum_liquidity: string; // TODO change to liquidity!
}

export interface Pool extends DefaultPool {
  totalSupply: string;
  userPoolBalance: string;
  minimumLiquidity: string;
}

export interface User {
  id: string;
  evmAddress: string;
}

export interface UserTokenBalance extends User {
  tokenAddress: string;
  balance: string;
  decimals: number;
}

interface RawEventData {
  address: string,
  topics:string[],
  data: string,
}

interface SignedExtrinsicData {
  fee: any;
  feeDetails: any;
}

interface ABIS {
  [name: string]: ABI;
}

interface EvmEvent {
  id: string;
  blockHeight: number;
  blockHash: string;
  extrinsicId: string;
  extrinsicHash: string;
  extrinsicIndex: number;
  rawData: RawEventData;
  parsedData: ethers.utils.LogDescription;
  finalized: boolean;
}

export type TokenType = 'ERC20' | 'ERC721' | 'ERC1155';
type VerifiedContractType = 'other' | TokenType;
type VerifiedContractData = null | ERC20Data | ERC721Data; // TODO change null to empty object

interface BytecodeLog {
  data: string;
  address: string;
  topics: string[];
}

interface BytecodeLogWithBlockData extends BytecodeLog {
  blockHeight: number;
  blockHash: string;
  timestamp: number;
  extrinsicId: string;
  extrinsicHash: string;
  extrinsicIndex: number;
  signedData: SignedExtrinsicData;
  finalized: boolean;
}

interface EvmLog extends BytecodeLogWithBlockData {
  id: string;
  abis: ABIS;
  name: string;
  type: VerifiedContractType;
  contractData: VerifiedContractData;
}

export interface BacktrackingEvmEvent extends EvmEvent {
  timestamp: number;
  signedData: SignedExtrinsicData;
}

export interface EvmEventDataParsed {
  id: string;
  dataParsed: ethers.utils.LogDescription; 
}

export interface VerifiedContract {
  name: string;
  id: string;
  compiledData: ABIS;
  type: VerifiedContractType;
  contractData: VerifiedContractData;
}

export interface EvmLogWithDecodedEvent extends EvmLog {
  decodedEvent: ethers.utils.LogDescription;
}

export interface Transfer {
  id: string;
  blockHeight: number;
  blockHash: string;
  extrinsicId: string;
  extrinsicHash: string;
  extrinsicIndex: number;

  signedData: SignedExtrinsicData;

  toId: string;
  fromId: string;

  tokenId: string;
  fromEvmAddress: string;
  toEvmAddress: string;

  type: 'Native' | 'ERC20' | 'ERC721' | 'ERC1155';
  amount: string;

  denom?: string;
  nftId?: string;

  success: boolean;
  errorMessage: string;

  timestamp: number;
  finalized: boolean;
}

type TokenHolderType = 'Contract' | 'Account';
type TokenHolderNftId = null | string | undefined;

interface TokenHolderBase {
  timestamp: number;
  evmAddress: string;
  tokenId: string;
  nftId: TokenHolderNftId;
}

export interface TokenHolderHead extends TokenHolderBase {
  abi: ABI,
  type: TokenType
}

export interface TokenHolder extends TokenHolderBase {
  id: string;
  balance: string;
  type: TokenHolderType;
  signerId: string;
}

export interface SquidStatus {
  height: number;
}