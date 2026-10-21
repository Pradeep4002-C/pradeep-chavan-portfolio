import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

/*
 * The documented environment file lives at the repository root so that the
 * server behaves identically whether it is started from the root or from
 * server/. dotenv never overrides variables that are already set in the
 * process, which keeps real environment configuration authoritative.
 */
export const ENV_FILE_PATH = fileURLToPath(new URL('../../../.env', import.meta.url));

dotenv.config({ path: ENV_FILE_PATH, quiet: true });

const isHttpOrigin = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY: z.enum(['true', 'false']).default('false'),
  MONGODB_URI: z
    .string()
    .trim()
    .min(1)
    .refine((value) => /^mongodb(\+srv)?:\/\//.test(value), {
      message: 'must start with mongodb:// or mongodb+srv://',
    }),
  // Required: sessions cannot be signed with a missing or short secret.
  SESSION_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters (use a random 32-byte value)')
    .refine((value) => !/^(replace-with|change-me|your-secret|example)/i.test(value), {
      message: 'must be replaced with a random value, not a placeholder',
    }),
  // Optional. The Vite dev-server origin is the development default; in
  // production the API normally relies on same-origin validation.
  CLIENT_ORIGIN: z
    .string()
    .trim()
    .refine((value) => value.length === 0 || isHttpOrigin(value), {
      message: 'must be an absolute http(s) origin',
    })
    .optional(),
});

export class ConfigError extends Error {
  constructor(issues) {
    super('Invalid environment configuration');
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

/**
 * Validates the environment and returns a frozen configuration object.
 * Throws ConfigError with one issue per invalid variable. Values are never
 * echoed back, so credentials in MONGODB_URI cannot leak into logs.
 */
export function loadEnv(source = process.env) {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new ConfigError(
      result.error.issues.map((issue) => ({
        variable: issue.path.join('.') || 'environment',
        message: issue.message,
      })),
    );
  }

  const isProduction = result.data.NODE_ENV === 'production';
  const configuredOrigin = result.data.CLIENT_ORIGIN?.trim() ?? '';

  return Object.freeze({
    nodeEnv: result.data.NODE_ENV,
    isProduction,
    trustProxy: result.data.TRUST_PROXY === 'true',
    port: result.data.PORT,
    mongodbUri: result.data.MONGODB_URI,
    sessionSecret: result.data.SESSION_SECRET,
    // Development falls back to the documented Vite proxy origin. Production
    // defaults to same-origin only and never trusts a wildcard.
    clientOrigin: configuredOrigin || (isProduction ? '' : 'http://localhost:5173'),
    envFilePath: ENV_FILE_PATH,
    envFileExists: fs.existsSync(ENV_FILE_PATH),
  });
}
