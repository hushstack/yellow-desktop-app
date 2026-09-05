/**
 * Structured logging, shared by the main process and the renderer.
 *
 * One choke point, one shape: `{ ts, level, scope, event, ...context }` emitted
 * as a single JSON line. Context values are redacted before they are written, so
 * a token or password cannot reach a log or a crash report by accident
 * (OWASP A04 / A09).
 */
const REDACTED = '[redacted]';

const SENSITIVE_KEY_PATTERN =
  /(token|password|secret|authorization|cookie|credential|session|email|phone)/i;

const MAX_STRING_LENGTH = 300;

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }
  if (value instanceof Error) {
    return value.name;
  }
  if (typeof value === 'object') {
    return 'object';
  }
  return typeof value;
}

function redactContext(context: LogContext): LogContext {
  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    safe[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactValue(value);
  }
  return safe;
}

function emit(level: LogLevel, scope: string, event: string, context: LogContext): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    event,
    ...redactContext(context),
  });

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export interface Logger {
  debug(event: string, context?: LogContext): void;
  info(event: string, context?: LogContext): void;
  warn(event: string, context?: LogContext): void;
  error(event: string, context?: LogContext): void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (event, context = {}) => {
      emit('debug', scope, event, context);
    },
    info: (event, context = {}) => {
      emit('info', scope, event, context);
    },
    warn: (event, context = {}) => {
      emit('warn', scope, event, context);
    },
    error: (event, context = {}) => {
      emit('error', scope, event, context);
    },
  };
}
