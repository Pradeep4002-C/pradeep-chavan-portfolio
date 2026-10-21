import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // approximately eight hours
export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
export const SESSION_COOKIE_NAME = 'pradeep.sid';
export const MIN_SESSION_SECRET_LENGTH = 32;

const SESSION_COLLECTION = 'sessions';

/**
 * Builds the MongoDB-backed session store. It reuses the Mongoose connection's
 * underlying MongoClient so the application keeps a single connection pool and
 * tests cannot accidentally fall back to the default in-memory store.
 */
export function createSessionStore({
  client = mongoose.connection.getClient(),
  dbName = mongoose.connection.name,
  ttl = SESSION_TTL_SECONDS,
} = {}) {
  if (!client || typeof client.db !== 'function') {
    throw new Error('A connected MongoDB client is required for the session store.');
  }
  if (!dbName) {
    throw new Error('A database name is required for the session store.');
  }

  return MongoStore.create({
    client,
    dbName,
    collectionName: SESSION_COLLECTION,
    ttl,
    // TTL expiry is also enforced by requireAuth against the cookie expiry,
    // so a stale document can never authorize a request.
  });
}

/** Cookie attributes shared by session setting and logout clearing. */
export function sessionCookieBaseOptions(isProduction) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: Boolean(isProduction),
    path: '/',
  };
}

/** Full cookie options used when express-session issues the cookie. */
export function sessionCookieOptions(isProduction) {
  return {
    ...sessionCookieBaseOptions(isProduction),
    maxAge: SESSION_TTL_MS,
  };
}

/**
 * Clears the session cookie using the same name and attributes used to set it,
 * minus maxAge. Express requires the path and domain to match for removal; no
 * domain is configured, so the cookie is host-only.
 */
export function clearSessionCookie(res, isProduction) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionCookieBaseOptions(isProduction));
}

/** Promisified session helpers used by the authentication routes. */
export function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

export function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });
}

export function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }
    req.session.destroy((error) => (error ? reject(error) : resolve()));
  });
}

/**
 * Creates the express-session middleware. `saveUninitialized: false` means an
 * anonymous request never creates a stored session, and `resave: false` avoids
 * needless writes. `proxy` is enabled only when the app already trusts exactly
 * one reverse proxy, matching the contact rate-limit policy.
 */
export function createSessionMiddleware({ secret, store, isProduction = false, trustProxy = false }) {
  if (typeof secret !== 'string' || secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be a string of at least ${MIN_SESSION_SECRET_LENGTH} characters.`,
    );
  }
  if (!store || typeof store.get !== 'function') {
    throw new Error('A session store is required; the default in-memory store is not used.');
  }

  return session({
    name: SESSION_COOKIE_NAME,
    secret,
    store,
    resave: false,
    saveUninitialized: false,
    rolling: false,
    proxy: Boolean(trustProxy),
    cookie: sessionCookieOptions(isProduction),
  });
}
