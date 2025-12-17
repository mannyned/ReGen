/**
 * Structured Logging System
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured JSON output for production
 * - Pretty console output for development
 * - Context/metadata support
 * - Request tracing
 */

// ============================================
// TYPES
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  /** Unique request ID for tracing */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** API route path */
  path?: string;
  /** HTTP method */
  method?: string;
  /** Response status code */
  statusCode?: number;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Error object */
  error?: Error | unknown;
  /** Additional metadata */
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Output format */
  format: 'json' | 'pretty';
  /** Include stack traces */
  includeStack: boolean;
  /** Service name for identification */
  serviceName: string;
}

// ============================================
// LOG LEVEL ORDERING
// ============================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// ============================================
// DEFAULT CONFIGURATION
// ============================================

function getDefaultConfig(): LoggerConfig {
  const isDev = process.env.NODE_ENV === 'development';
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || (isDev ? 'debug' : 'info');

  return {
    minLevel: logLevel,
    format: isDev ? 'pretty' : 'json',
    includeStack: isDev,
    serviceName: process.env.SERVICE_NAME || 'regenr',
  };
}

// ============================================
// FORMATTERS
// ============================================

function formatPretty(entry: LogEntry): string {
  const { level, message, timestamp, context } = entry;

  // Color codes for terminal
  const colors: Record<LogLevel, string> = {
    debug: '\x1b[36m', // Cyan
    info: '\x1b[32m',  // Green
    warn: '\x1b[33m',  // Yellow
    error: '\x1b[31m', // Red
  };
  const reset = '\x1b[0m';

  const levelStr = `${colors[level]}${level.toUpperCase().padEnd(5)}${reset}`;
  const time = new Date(timestamp).toLocaleTimeString();

  let output = `${time} ${levelStr} ${message}`;

  if (context) {
    const { error, ...rest } = context;
    if (Object.keys(rest).length > 0) {
      output += ` ${JSON.stringify(rest)}`;
    }
    if (error instanceof Error && error.stack) {
      output += `\n${error.stack}`;
    }
  }

  return output;
}

function formatJSON(entry: LogEntry, config: LoggerConfig): string {
  const { level, message, timestamp, context } = entry;

  const output: Record<string, unknown> = {
    level,
    message,
    timestamp,
    service: config.serviceName,
  };

  if (context) {
    const { error, ...rest } = context;

    // Add context fields
    Object.assign(output, rest);

    // Handle error serialization
    if (error instanceof Error) {
      output.error = {
        name: error.name,
        message: error.message,
        ...(config.includeStack && { stack: error.stack }),
      };
    } else if (error) {
      output.error = error;
    }
  }

  return JSON.stringify(output);
}

// ============================================
// LOGGER CLASS
// ============================================

export class Logger {
  private config: LoggerConfig;
  private defaultContext: LogContext;

  constructor(config?: Partial<LoggerConfig>, defaultContext?: LogContext) {
    this.config = { ...getDefaultConfig(), ...config };
    this.defaultContext = defaultContext || {};
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger(this.config, { ...this.defaultContext, ...context });
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.defaultContext, ...context },
    };

    const formatted = this.config.format === 'json'
      ? formatJSON(entry, this.config)
      : formatPretty(entry);

    // Output to appropriate console method
    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  // ============================================
  // PUBLIC LOG METHODS
  // ============================================

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  /**
   * Log an error with automatic error object extraction
   */
  logError(message: string, error: unknown, context?: LogContext): void {
    this.log('error', message, { ...context, error });
  }
}

// ============================================
// GLOBAL LOGGER INSTANCE
// ============================================

export const logger = new Logger();

// ============================================
// CONVENIENCE EXPORTS
// ============================================

export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);
export const logError = logger.logError.bind(logger);

// ============================================
// REQUEST LOGGER
// ============================================

/**
 * Create a logger for a specific request
 */
export function createRequestLogger(
  requestId: string,
  context?: Partial<LogContext>
): Logger {
  return logger.child({ requestId, ...context });
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
