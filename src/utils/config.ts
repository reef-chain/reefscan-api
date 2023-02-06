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

const toNumber = (defaultValue: number, value?: string): number => {
  if (!value) {
    return defaultValue;
  }
  return parseInt(value, 10);
};

const network = process.env.NETWORK || 'mainnet';
const nodeWs = process.env[`NODE_URL_${network.toUpperCase()}`] || '';
const graphqlApi = process.env[`GRAPHQL_API_${network.toUpperCase()}`] || '';

console.log('NETWORK=', network, ' RPC=', nodeWs, ' API=', graphqlApi);

export default {
  httpPort: toNumber(3000, process.env.PORT),
  nodeWs: nodeWs,
  recaptchaSecret: process.env.RECAPTCHA_SECRET || '',
  sentryDns: process.env.SENTRY_DNS || '',
  environment: process.env.ENVIRONMENT,
  network: network,
  graphqlApi: graphqlApi,
  jwtSecret: process.env.JWT_SECRET || '',
  chunkSize: toNumber(1024, process.env.CHUNK_SIZE),
  mutationSize: toNumber(100, process.env.MUTATION_SIZE),
  dbHost: process.env.DB_HOST!,
  dbUser: process.env.DB_USER!,
  dbPassword: process.env.DB_PASSWORD!,
  dbName: process.env.DB_NAME!,
};
