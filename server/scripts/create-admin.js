import readline from 'node:readline';
import { Writable } from 'node:stream';
import argon2 from 'argon2';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { loadEnv } from '../src/config/env.js';
import { logger } from '../src/lib/logger.js';
import { EMAIL_PATTERN } from '../src/lib/validators.js';
import { Admin, ensureModelIndexes } from '../src/models/index.js';

const MIN_PASSWORD_LENGTH = 12;
const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB, OWASP baseline
  timeCost: 2,
  parallelism: 1,
};

function printUsage() {
  process.stdout.write(
    [
      'Create the first administrator (never runs automatically).',
      '',
      'Usage:',
      '  npm run admin:create -- --email <address> --name "<full name>"',
      '  npm run admin:create            # prompts for all values',
      '',
      'The password is read interactively and is never accepted as a command-line',
      'argument, written to logs, or stored in plaintext.',
      '',
      'For scripted local use, the two password lines may be piped on stdin:',
      '  <password>\\n<password> | npm run admin:create -- --email <address> --name "<name>"',
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
    } else if (token === '--name') {
      args.name = argv[index + 1];
      index += 1;
    } else if (token.startsWith('--email=')) {
      args.email = token.slice('--email='.length);
    } else if (token.startsWith('--name=')) {
      args.name = token.slice('--name='.length);
    } else {
      args.unknown = token;
    }
  }

  return args;
}

/**
 * Terminal prompts hide the password by routing readline's echo to a muted
 * stream. Piped input is buffered up front: readline can emit several lines in
 * one tick, which would otherwise be lost between sequential questions.
 */
function createPrompter(isTTY) {
  let muted = false;

  if (!isTTY) {
    let lines = [];
    let index = 0;
    let loaded = false;

    async function load() {
      if (loaded) {
        return;
      }
      const chunks = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      lines = Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
      loaded = true;
    }

    function nextLine() {
      const value = lines[index];
      index += 1;
      return value ?? '';
    }

    return {
      init: load,
      ask(question) {
        process.stdout.write(question);
        return Promise.resolve(nextLine());
      },
      askHidden(question) {
        process.stdout.write(question);
        const value = nextLine();
        process.stdout.write('\n');
        return Promise.resolve(value);
      },
      close() {},
    };
  }

  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) {
        process.stdout.write(chunk);
      }
      callback();
    },
  });

  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });

  return {
    init: async () => {},
    ask(question) {
      return new Promise((resolve) => {
        readlineInterface.question(question, resolve);
      });
    },
    askHidden(question) {
      return new Promise((resolve) => {
        muted = true;
        process.stdout.write(question);
        readlineInterface.question('', (answer) => {
          muted = false;
          process.stdout.write('\n');
          resolve(answer);
        });
      });
    },
    close() {
      readlineInterface.close();
    },
  };
}

async function createAdministrator() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (args.unknown) {
    throw new Error(`Unknown argument: ${args.unknown}. Use --help for usage.`);
  }

  const prompter = createPrompter(Boolean(process.stdin.isTTY));

  try {
    await prompter.init();

    const emailInput = args.email ?? (await prompter.ask('Administrator email: '));
    const nameInput = args.name ?? (await prompter.ask('Administrator name: '));

    const email = String(emailInput ?? '').trim().toLowerCase();
    const name = String(nameInput ?? '').trim();

    if (email.length === 0 || email.length > 254 || !EMAIL_PATTERN.test(email)) {
      throw new Error('Enter a valid administrator email address.');
    }
    if (name.length === 0 || name.length > 120) {
      throw new Error('Enter an administrator name of 1-120 characters.');
    }

    let password = await prompter.askHidden(
      `Password (minimum ${MIN_PASSWORD_LENGTH} characters): `,
    );
    const confirmation = await prompter.askHidden('Confirm password: ');

    if (password.trim().length === 0) {
      throw new Error('The password cannot be empty.');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }
    if (password !== confirmation) {
      throw new Error('The passwords do not match.');
    }

    const config = loadEnv();
    await connectDatabase(config.mongodbUri);

    try {
      await ensureModelIndexes([Admin]);

      const existing = await Admin.exists({ email });
      if (existing) {
        throw new Error('An administrator with that email already exists.');
      }

      const passwordHash = await argon2.hash(password, PASSWORD_HASH_OPTIONS);
      await Admin.create({ email, name, passwordHash });

      // Deliberately excludes the password and the hash.
      logger.info('Administrator created', { email, name });
    } finally {
      password = '';
      await disconnectDatabase();
    }
  } finally {
    prompter.close();
  }
}

try {
  await createAdministrator();
} catch (error) {
  if (error?.code === 11000) {
    logger.error('Administrator creation failed', {
      error: 'An administrator with that email already exists.',
    });
  } else {
    logger.error('Administrator creation failed', { error: error.message });
  }
  process.exitCode = 1;
  await disconnectDatabase().catch(() => {});
}
