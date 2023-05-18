import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import {
  AutomaticContractVerificationReq,
  compilerTargets,
  License,
  QueryVerifiedPoolsWithUserLPReq,
  Target,
  TokenBalanceParam,
} from '../utils/types';
import { ensure } from '../utils/utils';

const ajv = new Ajv();

interface ID {
  id: string;
}
interface Status {
  status: string;
}

// basic ajv schemas
const nativeAddressSchema: JSONSchemaType<string> = {
  type: 'string',
  // Matching reef native address with '5' and 47 other chars
  pattern: '5[0-9a-zA-Z]{47}',
};
const evmAddressSchema: JSONSchemaType<string> = {
  type: 'string',
  // Matching evm address with '0x' and 40 other chars
  pattern: '0x[0-9a-fA-F]{40}',
};
const filenameSchema: JSONSchemaType<string> = {
  type: 'string',
  pattern: '.+.sol',
};

const optimizationSchema: JSONSchemaType<string> = {
  type: 'string',
  pattern: 'true|false',
};
const licensesSchema: JSONSchemaType<License> = {
  type: 'string',
  // pattern: compilerLicenses.join('|'),
};
const targetSchema: JSONSchemaType<Target> = {
  type: 'string',
  pattern: compilerTargets.join('|'),
};
const compilerVersionSchema: JSONSchemaType<string> = {
  type: 'string',
  pattern: 'v[0-9]+.[0-9]+.[0-9]+.*',
};

// This are only temporary arguments and source validators!
const argumentSchema: JSONSchemaType<string> = {
  type: 'string',
  // Arguments string must start and end with [ ], content is optional
  pattern: '\\[.*\\]',
};
const sourceSchema: JSONSchemaType<string> = {
  type: 'string',
  // Source string must start and end with { }, content is necessary
  pattern: '[{].+[}]',
};

// Object validator schemas
const verificationStatusSchema: JSONSchemaType<Status> = {
  type: 'object',
  properties: {
    status: { type: 'string' },
  },
  required: ['status'],
};
const idSchema: JSONSchemaType<ID> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
  },
  required: ['id'],
};
// combined ajv schemas
const accountTokenBalanceSchema: JSONSchemaType<TokenBalanceParam> = {
  type: 'object',
  properties: {
    accountAddress: nativeAddressSchema,
    contractAddress: evmAddressSchema,
  },
  required: ['accountAddress', 'contractAddress'],
  additionalProperties: false,
};

const submitVerificationSchema: JSONSchemaType<AutomaticContractVerificationReq> = {
  type: 'object',
  properties: {
    address: evmAddressSchema,
    arguments: argumentSchema,
    name: { type: 'string' },
    runs: { type: 'number' },
    compilerVersion: compilerVersionSchema,
    filename: filenameSchema,
    license: licensesSchema,
    optimization: optimizationSchema,
    source: sourceSchema,
    target: targetSchema,
    timestamp: { type: 'number' },
    blockHeight: { type: 'number' },
  },
  required: [
    'address',
    'arguments',
    'compilerVersion',
    'filename',
    'name',
    'optimization',
    'runs',
    'source',
    'target',
  ],
  additionalProperties: false,
};

const verifiedPoolsWithUserLPSchema: JSONSchemaType<QueryVerifiedPoolsWithUserLPReq> = {
  type: 'object',
  properties: {
    limit: { type: 'number' },
    offset: { type: 'number' },
    signer: { type: 'string' },
    search: { type: 'string', nullable: true },
  },
  required: ['limit', 'offset', 'signer'],
};

// available validators
export const idValidator = ajv.compile(idSchema);
export const evmAddressValidator = ajv.compile(evmAddressSchema);
export const nativeAddressValidator = ajv.compile(nativeAddressSchema);
export const verificationStatusValidator = ajv.compile(
  verificationStatusSchema,
);
export const accountTokenBodyValidator = ajv.compile(accountTokenBalanceSchema);
export const automaticVerificationValidator = ajv.compile(
  submitVerificationSchema,
);
export const verifiedPoolsWithUserLPValidator = ajv.compile(verifiedPoolsWithUserLPSchema);

export const validateData = <T>(data: T, fun: ValidateFunction<T>): void => {
  const isValid = fun(data);
  const message = (fun.errors || [])
    .map((error) => error.message || '')
    .filter((msg) => msg)
    .join(', ');
  ensure(isValid, message, 400);
};
