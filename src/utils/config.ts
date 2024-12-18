require('dotenv').config();

if (!process.env.NETWORK) {
  throw new Error('NETWORK environment variable missing!')
}
if (!process.env.DB_HOST) {
  throw new Error('DB_HOST environment variable missing!')
}
if (!process.env.DB_USER) {
  throw new Error('DB_USER environment variable missing!')
}
if (!process.env.DB_PASSWORD) {
  throw new Error('DB_PASSWORD environment variable missing!')
}
if (!process.env.ADMIN_PASSWORD) {
  throw new Error('ADMIN_PASSWORD environment variable missing!')
}

const toNumber = (defaultValue: number, value?: string): number => {
  if (!value) {
    return defaultValue;
  }
  return parseInt(value, 10);
};

const network = process.env.NETWORK || 'mainnet';
const nodeWs = process.env[`NODE_URL_${network.toUpperCase()}`] || '';
const explorerApi = process.env[`GRAPHQL_API_${network.toUpperCase()}`] || '';
const reefSwapApi = process.env[`REEF_SWAP_API_${network.toUpperCase()}`] || '';
const reefSwapFactoryAddress = process.env[`REEF_SWAP_FACTORY_ADDRESS_${network.toUpperCase()}`] || '';
const trackFinalizedBlocks = process.env[`TRACK_FINALIZED_BLOCKS`] === 'true';

console.log(`
  Network: ${network}
  RPC: ${nodeWs}
  Explorer API: ${explorerApi}
  Swap API: ${reefSwapApi}
  DB: ${process.env.DB_HOST}
  Factory: ${reefSwapFactoryAddress}
  Track finalized blocks: ${trackFinalizedBlocks}
`);

export default {
  httpPort: toNumber(3000, process.env.PORT),
  nodeWs: nodeWs,
  sentryDns: process.env.SENTRY_DNS || '',
  environment: process.env.ENVIRONMENT,
  network: network,
  explorerApi: explorerApi,
  reefSwapApi: reefSwapApi,
  jwtSecret: process.env.JWT_SECRET || '',
  reefSwapApiKey: process.env.REEF_SWAP_ADMIN_KEY || '',
  reefSwapFactoryAddress: reefSwapFactoryAddress,
  chunkSize: toNumber(1024, process.env.CHUNK_SIZE),
  mutationSize: toNumber(100, process.env.MUTATION_SIZE),
  dbHost: process.env.DB_HOST!,
  dbUser: process.env.DB_USER!,
  dbPassword: process.env.DB_PASSWORD!,
  dbName: process.env.DB_NAME!,
  adminPassword: process.env.ADMIN_PASSWORD!,
  dropTablesOnStart: process.env.DROP_TABLES_ON_START === 'true',
  localBackup: process.env.LOCAL_BACKUP === 'true',
  ipfsGatewayId: process.env.IPFS_PROJECT_ID!,
  ipfsGatewayKey: process.env.IPFS_PROJECT_SECRET!,
  infuraApiKey: process.env.INFURA_API_KEY!,
  solidityScanEndpoint:process.env.SOLIDITY_SCAN_URL!,
  solidityScanToken:process.env.SOLIDITY_SCAN_TOKEN!,
  stealthexEndpoint:process.env.STEALTHEX_URL!,
  stealthexApiKey:process.env.STEALTHEX_API_TOKEN!,
  debug: process.env.DEBUG,
  trackFinalizedBlocks: trackFinalizedBlocks,
};
