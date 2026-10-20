/*
 * Minimal structured logger. Every entry is one JSON line so logs stay
 * machine-readable in production and readable in development.
 *
 * Callers are responsible for never passing secrets, passwords, session
 * cookies, full request bodies, or contact-message contents.
 */
function write(level, message, meta) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
  };

  if (meta && Object.keys(meta).length > 0) {
    Object.assign(entry, meta);
  }

  let line;
  try {
    line = JSON.stringify(entry);
  } catch {
    // Circular metadata must never crash the request or the process.
    line = JSON.stringify({ time: entry.time, level, message: String(message) });
  }

  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export const logger = {
  info(message, meta) {
    write('info', message, meta);
  },
  warn(message, meta) {
    write('warn', message, meta);
  },
  error(message, meta) {
    write('error', message, meta);
  },
};
