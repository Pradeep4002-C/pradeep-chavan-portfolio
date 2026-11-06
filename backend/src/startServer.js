import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { ConfigError, ENV_FILE_PATH, loadEnv } from './config/env.js';
import { createSessionMiddleware, createSessionStore } from './config/session.js';
import { FRONTEND_DIST_DIR, isFrontendBuilt } from './frontend.js';
import { ensureModelIndexes } from './models/index.js';
import { logger } from './lib/logger.js';

function failStartup(message, context = {}) {
  logger.error(message, context);
  process.exitCode = 1;
}

/**
 * Reports a startup failure and closes the database connection that was opened
 * before the failure. Keeping the process alive without a listener would make
 * the deployment look healthy while serving nothing.
 */
async function closeAfterStartupFailure({
  disconnect,
  log,
  message,
  context,
  onFailure,
}) {
  onFailure(message, context);

  try {
    await disconnect();
  } catch (error) {
    log.error('Failed to close the database after startup failure', {
      error: error.message,
    });
  }
}

/**
 * Starts the API and returns the created HTTP server.
 *
 * The HTTP server is deliberately created only after MongoDB is connected and
 * every model index has initialized. A failure before that point closes the
 * database connection and returns null, so the process never listens in a
 * half-started state.
 *
 * `onServerCreated` runs synchronously immediately after `listen` returns, so
 * the caller can attach its runtime error handler before the socket emits an
 * asynchronous bind error. Dependencies are injectable so tests can verify the
 * ordering and failure paths without opening a real port.
 */
export async function startServer({
  loadConfig = loadEnv,
  connect = connectDatabase,
  disconnect = disconnectDatabase,
  ensureIndexes = ensureModelIndexes,
  createStore = createSessionStore,
  createSession = createSessionMiddleware,
  createApplication = createApp,
  frontendDist = FRONTEND_DIST_DIR,
  checkFrontend = () => isFrontendBuilt(frontendDist),
  listen = (app, port) => app.listen(port),
  onServerCreated = () => {},
  onFailure = failStartup,
  log = logger,
} = {}) {
  let config;

  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      onFailure('Invalid environment configuration', {
        envFile: ENV_FILE_PATH,
        issues: error.issues,
        hint: 'Copy .env.example to .env in the repository root and set the required values.',
      });
      return null;
    }
    throw error;
  }

  log.info('Environment loaded', {
    env: config.nodeEnv,
    port: config.port,
    envFile: config.envFilePath,
    envFileExists: config.envFileExists,
  });

  // A production process is expected to serve the website as well as the API.
  // Failing here is clearer than a deploy that appears healthy while every
  // browser request receives a JSON 404.
  const frontendBuilt = checkFrontend();
  if (config.isProduction && !frontendBuilt) {
    onFailure('Frontend build not found — the server was not started', {
      expected: frontendDist,
      hint: 'Run `npm run build:frontend` (or `npm run build`) before starting the production server.',
    });
    return null;
  }

  if (config.isProduction && !config.trustProxy) {
    // Not fatal: the process may terminate TLS itself. Behind a reverse proxy
    // (including Render), trust-proxy must be enabled for req.protocol and the
    // Secure session cookie to be correct.
    log.warn('Production is running without TRUST_PROXY', {
      hint: 'Set TRUST_PROXY=true when a single HTTPS reverse proxy terminates TLS in front of this process.',
    });
  }

  try {
    await connect(config.mongodbUri);
  } catch (error) {
    // Never start listening without a database: a half-started API is worse
    // than a clear startup failure. Disconnect a partially opened client so an
    // unreachable database cannot keep the failed process alive.
    await closeAfterStartupFailure({
      disconnect,
      log,
      message: 'Database connection failed — the API was not started',
      context: {
        code: 'DATABASE_UNAVAILABLE',
        error: error.message,
        hint: 'Check your MongoDB service and configuration.',
      },
      onFailure,
    });
    return null;
  }

  log.info('Initializing database indexes');

  try {
    await ensureIndexes();
  } catch (error) {
    await closeAfterStartupFailure({
      disconnect,
      log,
      message: 'Database index initialization failed — the API was not started',
      context: {
        code: 'DATABASE_INDEX_INITIALIZATION_FAILED',
        error: error.message,
        hint: 'Check the MongoDB user permissions and the model index definitions.',
      },
      onFailure,
    });
    return null;
  }

  log.success('Database indexes ready');

  let app;

  try {
    // Reuse the established Mongoose connection/client for the session store.
    // Creating this before listen guarantees a bad session secret or store
    // fails startup instead of producing an unauthenticated API.
    const sessionStore = createStore();
    const sessionMiddleware = createSession({
      secret: config.sessionSecret,
      store: sessionStore,
      isProduction: config.isProduction,
      trustProxy: config.trustProxy,
    });

    app = createApplication({
      trustProxy: config.trustProxy,
      session: {
        middleware: sessionMiddleware,
        isProduction: config.isProduction,
        clientOrigin: config.clientOrigin,
      },
    });
  } catch (error) {
    await closeAfterStartupFailure({
      disconnect,
      log,
      message: 'Authentication session configuration failed — the API was not started',
      context: {
        code: 'SESSION_CONFIGURATION_FAILED',
        error: error.message,
      },
      onFailure,
    });
    return null;
  }

  let httpServer;

  try {
    httpServer = listen(app, config.port);
  } catch (error) {
    await closeAfterStartupFailure({
      disconnect,
      log,
      message: 'HTTP server failed to start — the API was not started',
      context: {
        code: 'HTTP_SERVER_START_FAILED',
        error: error.message,
      },
      onFailure,
    });
    return null;
  }

  // Attach the caller's runtime error handler before returning, so an
  // asynchronous bind failure cannot escape as an unhandled server error.
  onServerCreated(httpServer);

  httpServer.on('listening', () => {
    log.success('API listening', {
      url: `http://localhost:${config.port}`,
      env: config.nodeEnv,
      frontend: frontendBuilt ? 'enabled' : 'disabled',
    });
  });

  return { httpServer, config, frontendBuilt };
}
