import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { RewriteFrames } from '@sentry/integrations';
import express, { Response, Request, NextFunction } from 'express';
import morgan from 'morgan';
import config from './utils/config';
import contractRouter from './routes/contract';
import verificationRouter from './routes/verification';
import updateTokenIconRouter from './routes/updateTokenIcon';
import solidityScanRouter from './routes/solidityScanScore';
import magicSquareRouter from './routes/magicSquare';
import bodyParser from 'body-parser';
import { StatusError } from './utils/utils';
import { getProvider } from './utils/connector';
import { backtrackEvents } from './backtracking/backtracking';
import { sequelize } from './db/sequelize.db';
import { VerifiedContractMainnet, VerifiedContractTestnet } from './db/VerifiedContract.db';
import { getReefPrice } from "./routes/price";
import { getVersion } from "./routes/version";
import { Umzug, SequelizeStorage } from "umzug";
import { trackFinalizedBlocks } from './services/finalized-blocks';

/* eslint "no-underscore-dangle": "off" */
/*Sentry.init({
  dsn: config.sentryDns,
  tracesSampleRate: 1.0,
  integrations: [
    new RewriteFrames({
      root: global.__dirname,
    }),
  ],
  environment: config.environment,
});*/


const cors = require('cors');

const app = express();


Sentry.init({
  dsn: config.sentryDns,
  integrations: [
    new RewriteFrames({
      root: global.__dirname,
    }),
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: false }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
    // Automatically instrument Node.js libraries and frameworks
    ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,
  environment: config.environment,
});

Sentry.setTag('component', 'api');
Sentry.setTag('network', config.network);

// RequestHandler creates a separate execution context, so that all
// transactions/spans/breadcrumbs are isolated across requests
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
// app.use(Sentry.Handlers.tracingHandler());

export const verifiedContractRepository = config.network === 'mainnet'
  ? sequelize.getRepository(VerifiedContractMainnet)
  : sequelize.getRepository(VerifiedContractTestnet);

// add sentry request handler
// app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);

// Parse incoming requests with JSON payloads
app.use(bodyParser.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.options('*', cors());
app.use(morgan('dev'));

app.use('/contract', contractRouter);
app.use('/api/contract', contractRouter);
app.use('/verification', verificationRouter);
app.use('/api/verificator', verificationRouter);
app.use('/api/updateTokenIcon',updateTokenIconRouter);
app.use('/solidityScan/score',solidityScanRouter);

// TODO @anukulpandey: remove after campaign is over
app.use('/magicsquare',magicSquareRouter)

// app.get('/api/price/fetch/reef', async (_, res: Response, next: NextFunction) => {
//   try {
//     const price = await fetchReefPrice();
//     res.send(price);
//   } catch (err) {
//     next(err);
//   }
// });

app.get('/price/reef', getReefPrice);
app.get('/hc', getVersion);

// The error handler must be before any other error middleware and after all controllers
app.use(
  Sentry.Handlers.errorHandler({
    shouldHandleError() {
      return true;
    },
  }) as express.ErrorRequestHandler,
);

/* eslint "no-unused-vars": "off" */
const errorHandler = (err: Error, req: Request, res: Response, _: NextFunction) => {
  const status = err instanceof StatusError ? err.status : 400;
  const message = err.message || 'Something went wrong';
  if(config.debug) {
    console.log('ERROR=',{
      // request: req,
      message,
      status,
    });
  }
  res.status(status).send({ error: message });
};

app.use(errorHandler);

const server = app.listen(config.httpPort, async () => {
  await getProvider().api.isReadyOrError;
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    Sentry.captureException(error);
  }
  await sequelize.sync({ force: config.dropTablesOnStart });

  if (!config.dropTablesOnStart) {
    // Run migrations
    const umzug = new Umzug({
      migrations: { glob: 'migrations/*.js' },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: console,
    });
    (async () => { await umzug.up() })();
  }
  console.log(`Reef explorer API is running on port ${config.httpPort}.`);

  backtrackEvents();

  if (config.trackFinalizedBlocks) {
    trackFinalizedBlocks();
  }
});


process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

let connections: any[] = [];

server.on('connection', connection => {
  connections.push(connection);
  connection.on('close', () => connections = connections.filter(curr => curr !== connection));
});

function shutDown() {
  console.log('Received kill signal, shutting down gracefully');
  server.close(() => {
    console.log('Closed out remaining connections');
    sequelize.close();
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  connections.forEach(curr => curr.end());
  setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
}
