import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { logger } from '../lib/logger.js';
import { EMAIL_PATTERN } from '../lib/validators.js';
import { Admin } from '../models/Admin.js';

/*
 * Clears the brute-force lockout on an administrator account.
 *
 * This is a deliberately narrow recovery path: it resets failedAttempts to 0
 * and lockedUntil to null, and never changes the password, sessions, or
 * lastLoginAt. It reads MONGODB_URI from the process environment and does not
 * load a .env file, so it can run from a trusted deployment terminal without
 * depending on the application's full configuration.
 */

function printUsage() {
  process.stdout.write(
    [
      'Clear an administrator lockout (failedAttempts and lockedUntil only).',
      '',
      'Usage:',
      '  npm run admin:unlock -- --email <address>',
      '',
      'MONGODB_URI must already be set in the process environment. This command',
      'does not read a .env file and does not change the password or sessions.',
      '',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help' || token === '-h') {
      args.help = true;
    } else if (token === '--email') {
      args.email = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--email=')) {
      args.email = token.slice('--email='.length);
    } else {
      args.unknown = token;
    }
  }

  return args;
}

/** Shows only enough of the address for the operator to confirm the account. */
function maskEmail(email) {
  const separator = email.indexOf('@');
  if (separator <= 0) {
    return '[invalid-email]';
  }
  return `${email.charAt(0)}***@${email.slice(separator + 1)}`;
}

async function unlockAdministrator() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (args.unknown) {
    throw new Error(`Unknown argument: ${args.unknown}. Use --help for usage.`);
  }

  const email = String(args.email ?? '').trim().toLowerCase();

  if (email.length === 0) {
    throw new Error('Provide the administrator email with --email. Use --help for usage.');
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new Error('Enter a valid administrator email address.');
  }

  const mongodbUri = process.env.MONGODB_URI?.trim();
  if (!mongodbUri) {
    throw new Error('MONGODB_URI must be set in the environment before running admin:unlock.');
  }

  await connectDatabase(mongodbUri);

  try {
    const administrator = await Admin.findOneAndUpdate(
      { email },
      { $set: { failedAttempts: 0, lockedUntil: null } },
      {
        returnDocument: 'after',
        projection: { email: 1, failedAttempts: 1, lockedUntil: 1 },
      },
    ).lean();

    if (!administrator) {
      throw new Error('No administrator account exists with that email address.');
    }

    // "account" avoids the logger's defensive redaction of email-like keys.
    logger.info('Administrator lockout cleared', {
      account: maskEmail(administrator.email),
      failedAttempts: administrator.failedAttempts,
      lockedUntil: administrator.lockedUntil,
    });
  } finally {
    await disconnectDatabase();
  }
}

try {
  await unlockAdministrator();
} catch (error) {
  logger.error('Administrator unlock failed', { error: error.message });
  process.exitCode = 1;
  await disconnectDatabase().catch(() => {});
}
