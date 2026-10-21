import { createApp } from './app.js';
import { ConfigError, ENV_FILE_PATH, loadEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { createSessionMiddleware, createSessionStore } from './config/session.js';
import { logger } from './lib/logger.js';

let httpServer = null;
let shuttingDown = false;

function failStartup(message, context = {}) {
  logger.error(message, context);
  process.exitCode = 1;
}

/**
 * Stops accepting connections, closes the HTTP server, then disconnects from
 * MongoDB. A 10 second guard prevents a hung connection from blocking exit.
 */
async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  logger.info('Shutting down', { signal });

  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after 10s timeout');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    if (httpServer) {
      const closed = new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
      // Keep-alive connections that are idle must not delay shutdown.
      httpServer.closeIdleConnections?.();
      await closed;
      logger.info('HTTP server closed');
    }

    await disconnectDatabase();
    clearTimeout(forceExit);
    process.exit(exitCode);
  } catch (error) {
    logger.error('Shutdown failed', { error: error.message });
    process.exit(1);
  }
}

async function start() {
  let config;

  try {
    config = loadEnv();
  } catch (error) {
    if (error instanceof ConfigError) {
      failStartup('Invalid environment configuration', {
        envFile: ENV_FILE_PATH,
        issues: error.issues,
        hint: 'Copy .env.example to .env in the repository root and set the required values.',
      });
      return;
    }
    throw error;
  }

  logger.info('Environment loaded', {
    env: config.nodeEnv,
    port: config.port,
    envFile: config.envFilePath,
    envFileExists: config.envFileExists,
  });

  try {
    await connectDatabase(config.mongodbUri);
  } catch (error) {
    // Never start listening without a database: a half-started API is worse
    // than a clear startup failure.
    failStartup('Database connection failed — the API was not started', {
      error: error.message,
    });
    return;
  }

  let app;

  try {
    // Reuse the established Mongoose connection/client for the session store.
    // Creating this before listen guarantees a bad session secret or store
    // fails startup instead of producing an unauthenticated API.
    const sessionStore = createSessionStore();
    const sessionMiddleware = createSessionMiddleware({
      secret: config.sessionSecret,
      store: sessionStore,
      isProduction: config.isProduction,
      trustProxy: config.trustProxy,
    });

    app = createApp({
      trustProxy: config.trustProxy,
      session: {
        middleware: sessionMiddleware,
        isProduction: config.isProduction,
        clientOrigin: config.clientOrigin,
      },
    });
  } catch (error) {
    failStartup('Authentication session configuration failed — the API was not started', {
      error: error.message,
    });
    return;
  }

  httpServer = app.listen(config.port);

  httpServer.on('listening', () => {
    logger.info('API listening', { port: config.port, env: config.nodeEnv });
  });

  httpServer.on('error', (error) => {
    logger.error('HTTP server error', { error: error.message });
    shutdown('http-server-error', 1);
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException', 1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
  shutdown('unhandledRejection', 1);
});

await start();
