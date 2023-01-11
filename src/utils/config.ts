require('dotenv').config();

const toNumber = (defaultValue: number, value?: string): number => {
  if (!value) {
    return defaultValue;
  }
  return parseInt(value, 10);
};

export default {
  httpPort: toNumber(3000, process.env.PORT),
  nodeWs: process.env.NODE_URL || 'wss://rpc.reefscan.com/ws',
  recaptchaSecret: process.env.RECAPTCHA_SECRET || '',
  sentryDns: process.env.SENTRY_DNS || '',
  environment: process.env.ENVIRONMENT,
  network: process.env.NETWORK,
  graphqlApi: process.env.GRAPHQL_API || "http://localhost:4350/graphql",
  jwtSecret: process.env.JWT_SECRET || '',
  chunkSize: toNumber(1024, process.env.CHUNK_SIZE),
};
