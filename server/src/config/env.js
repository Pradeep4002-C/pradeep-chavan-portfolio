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

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z
    .string()
    .trim()
    .min(1)
    .refine((value) => /^mongodb(\+srv)?:\/\//.test(value), {
      message: 'must start with mongodb:// or mongodb+srv://',
    }),
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

  return Object.freeze({
    nodeEnv: result.data.NODE_ENV,
    isProduction: result.data.NODE_ENV === 'production',
    port: result.data.PORT,
    mongodbUri: result.data.MONGODB_URI,
    envFilePath: ENV_FILE_PATH,
    envFileExists: fs.existsSync(ENV_FILE_PATH),
  });
}
