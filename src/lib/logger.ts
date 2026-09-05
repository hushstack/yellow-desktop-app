/**
 * Renderer logger.
 *
 * Re-exported from the shared implementation so both processes redact the same
 * key patterns and emit the same shape (OWASP A09). Application code imports
 * from here and never touches `console` directly — ESLint enforces that.
 */
export { createLogger, type Logger, type LogContext, type LogLevel } from '@shared/logger';
