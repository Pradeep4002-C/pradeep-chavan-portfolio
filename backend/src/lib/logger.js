/*
 * Small dependency-free logger with two deliberate output modes:
 *
 * - production: one JSON object per line, suitable for Render or any log drain;
 * - development: a readable timestamp, level, message, and labelled metadata.
 *
 * Development colour is used only for a real terminal. NO_COLOR and redirected
 * output always produce plain text with no ANSI escape sequences.
 *
 * Callers must still avoid passing secrets. As a defence in depth, known
 * sensitive metadata keys are redacted and connection strings, password
 * hashes, bearer tokens, cookies, and authorization values are scrubbed from
 * strings before anything is written.
 */

const LEVEL_LABELS = Object.freeze({
  info: 'INFO',
  success: 'SUCCESS',
  warn: 'WARN',
  error: 'ERROR',
  debug: 'DEBUG',
});

const PRODUCTION_LEVELS = Object.freeze({
  info: 'info',
  success: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
});

const COLORS = Object.freeze({
  reset: '\u001b[0m',
  dim: '\u001b[2m',
  cyan: '\u001b[36m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  gray: '\u001b[90m',
});

const LEVEL_COLORS = Object.freeze({
  info: COLORS.cyan,
  success: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
  debug: COLORS.gray,
});

const META_LABELS = Object.freeze({
  env: 'Mode',
  port: 'Port',
  database: 'Database',
  host: 'Host',
  url: 'URL',
  envFile: 'Env file',
  envFileExists: 'Env file exists',
  signal: 'Signal',
  error: 'Error',
  code: 'Code',
  hint: 'Hint',
  issues: 'Issues',
  frontend: 'Frontend',
  expected: 'Expected path',
  status: 'Status',
  method: 'Method',
  path: 'Path',
  errorCode: 'Error code',
  stack: 'Stack',
});

const SENSITIVE_KEY_PATTERN =
  /pass(?:word|wd)?|hash|secret|cookie|authoriz|session|token|credential|body|message|content|email|mongo(?:db)?_?uri|connection.?string|dsn/i;

const INDENT = ' '.repeat(20);

function scrubString(value) {
  return String(value)
    .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[redacted-mongodb-uri]')
    .replace(/\$argon2(?:id|i|d)\$[^\s]+/gi, '[redacted-password-hash]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(
      /\b(password|passwd|pwd|secret|token|sessionSecret|authorization|cookie)\s*[:=]\s*[^\s,;]+/gi,
      '$1=[redacted]',
    );
}

function redact(value, key, seen, depth = 0) {
  if (key && SENSITIVE_KEY_PATTERN.test(key)) {
    return '[redacted]';
  }
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return scrubString(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubString(value.message),
      ...(value.stack ? { stack: scrubString(value.stack) } : {}),
    };
  }
  if (seen.has(value)) {
    return '[circular]';
  }
  if (depth > 5) {
    return '[max-depth]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, undefined, seen, depth + 1));
  }

  const result = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    result[childKey] = redact(childValue, childKey, seen, depth + 1);
  }
  return result;
}

function redactMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return {};
  }
  return redact(meta, undefined, new WeakSet());
}

function localTime(date) {
  const pieces = [date.getHours(), date.getMinutes(), date.getSeconds()];
  return pieces.map((piece) => String(piece).padStart(2, '0')).join(':');
}

function formatValue(value) {
  if (typeof value === 'string') {
    return value.replace(/\n/g, `\n${INDENT}`);
  }
  if (value === undefined) {
    return '';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[unserialisable]';
    }
  }
  return String(value);
}

function formatDevelopmentLine(level, message, meta, date, color) {
  const label = LEVEL_LABELS[level] ?? String(level).toUpperCase();
  const levelColor = LEVEL_COLORS[level] ?? '';
  const prefix = color
    ? `${COLORS.dim}[${localTime(date)}]${COLORS.reset} ${levelColor}${label.padEnd(7)}${COLORS.reset}`
    : `[${localTime(date)}] ${label.padEnd(7)}`;

  const lines = [`${prefix} ${formatValue(message)}`];
  for (const [key, value] of Object.entries(meta ?? {})) {
    if (value === undefined) {
      continue;
    }
    const metaLabel = META_LABELS[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');
    const labelText = `${metaLabel}:`;
    const rendered = formatValue(value);
    const metaPrefix = color ? `${INDENT}${COLORS.dim}${labelText}${COLORS.reset}` : `${INDENT}${labelText}`;
    lines.push(`${metaPrefix} ${rendered}`);
  }

  return lines.join('\n');
}

function formatProductionLine(level, message, meta, date) {
  const safeMeta = redactMeta(meta);
  const entry = {
    ...safeMeta,
    time: date.toISOString(),
    level: PRODUCTION_LEVELS[level] ?? 'info',
    message: scrubString(message),
  };

  try {
    return JSON.stringify(entry);
  } catch {
    return JSON.stringify({
      time: entry.time,
      level: entry.level,
      message: scrubString(message),
    });
  }
}

/**
 * Creates a logger with injectable streams and clock so both output modes can
 * be tested without touching the real terminal.
 */
export function createLogger({
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr,
  now = () => new Date(),
  tty,
  color,
} = {}) {
  const production = env.NODE_ENV === 'production';
  const configuredTty = tty ?? Boolean(stdout?.isTTY ?? false);
  const useConfiguredColor = color ?? (configuredTty && !env.NO_COLOR && !production);

  function write(level, message, meta) {
    const stream = level === 'error' || level === 'warn' ? stderr : stdout;
    const date = now();

    let line;
    try {
      if (production) {
        line = formatProductionLine(level, String(message), meta, date);
      } else {
        line = formatDevelopmentLine(
          level,
          String(message),
          redactMeta(meta),
          date,
          useConfiguredColor,
        );
      }
    } catch {
      // Logging must never crash a request or hide a startup failure.
      const fallback = {
        time: date.toISOString(),
        level: PRODUCTION_LEVELS[level] ?? 'info',
        message: scrubString(message),
      };
      line = JSON.stringify(fallback);
    }

    try {
      stream.write(`${line}\n`);
    } catch {
      // A closed test stream or broken pipe must not take the process down.
    }
  }

  return {
    info(message, meta) {
      write('info', message, meta);
    },
    // A development convenience label. Production still emits level "info".
    success(message, meta) {
      write('success', message, meta);
    },
    warn(message, meta) {
      write('warn', message, meta);
    },
    error(message, meta) {
      write('error', message, meta);
    },
    debug(message, meta) {
      write('debug', message, meta);
    },
  };
}

export const logger = createLogger();
