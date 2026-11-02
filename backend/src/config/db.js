import mongoose from 'mongoose';
import { logger } from '../lib/logger.js';

const READY_STATE_LABELS = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// Tracks whether a connection has ever succeeded, so a failed first attempt
// does not log a misleading "disconnected" event.
let hasConnected = false;

/** Safe, serialisable view of the connection used by the health endpoint. */
export function getDatabaseStatus() {
  const readyState = mongoose.connection.readyState;
  return {
    status: READY_STATE_LABELS[readyState] ?? 'unknown',
    readyState,
  };
}

/**
 * Connects Mongoose and only resolves when the connection is usable.
 * A failure rejects the promise, so the caller can refuse to start the
 * HTTP server instead of running in a misleading half-started state.
 */
export async function connectDatabase(uri) {
  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', { error: error.message });
  });
  mongoose.connection.on('disconnected', () => {
    if (hasConnected) {
      logger.warn('MongoDB disconnected');
    }
  });
  mongoose.connection.on('reconnected', () => {
    hasConnected = true;
    logger.info('MongoDB reconnected');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  hasConnected = true;

  // Host and database name are not credentials; the URI itself is never logged.
  logger.info('MongoDB connected', {
    database: mongoose.connection.name,
    host: mongoose.connection.host,
  });
}

/** Closes the connection if one is open. Safe to call more than once. */
export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  hasConnected = false;
  await mongoose.disconnect();
  logger.info('MongoDB connection closed');
}
