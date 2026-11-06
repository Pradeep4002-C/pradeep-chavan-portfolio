import { disconnectDatabase } from './config/db.js';
import { logger } from './lib/logger.js';
import { startServer } from './startServer.js';

let httpServer = null;
let shuttingDown = false;

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

function handleServerError(error) {
  logger.error('HTTP server error', { error: error.message });
  shutdown('http-server-error', 1);
}

async function start() {
  const started = await startServer({
    onServerCreated(server) {
      httpServer = server;
      server.on('error', handleServerError);
    },
  });

  if (!started) {
    return;
  }
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
