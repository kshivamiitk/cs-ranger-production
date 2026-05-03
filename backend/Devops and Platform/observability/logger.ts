type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

const REDACTED = '[redacted]';
const SECRET_KEY_PATTERN = /(authorization|cookie|token|secret|password|signature|api[-_]?key|service[-_]?role)/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return '[depth-limit]';
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? REDACTED : sanitize(item, depth + 1),
      ])
    );
  }

  if (typeof value === 'string') {
    if (/bearer\s+[a-z0-9._-]{24,}/i.test(value)) return REDACTED;
    if (/sb-[a-z0-9-]+-auth-token=base64-[a-z0-9+/=_-]{24,}/i.test(value)) return REDACTED;
    if (/eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/.test(value)) return REDACTED;
  }

  return value;
}

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const sanitizedFields = sanitize(fields);
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...(sanitizedFields && typeof sanitizedFields === 'object' && !Array.isArray(sanitizedFields)
      ? (sanitizedFields as LogFields)
      : {}),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    if (process.env.LOG_LEVEL === 'debug') {
      write('debug', message, fields);
    }
  },
  info(message: string, fields?: LogFields) {
    write('info', message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write('warn', message, fields);
  },
  error(message: string, fields?: LogFields) {
    write('error', message, fields);
  },
};
