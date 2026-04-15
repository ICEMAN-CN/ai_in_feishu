type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

function getLogLevel(): LogLevel {
  const env = process.env.LOG_LEVEL;
  if (env && env in LOG_LEVELS) {
    return env as LogLevel;
  }
  return 'INFO';
}

const currentLevel = getLogLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: LogLevel, module: string, message: string): string {
  return `[${level}] [${formatTimestamp()}] [${module}] ${message}`;
}

export const logger = {
  debug(module: string, message: string, ...args: unknown[]): void {
    if (shouldLog('DEBUG')) {
      console.log(formatMessage('DEBUG', module, message), ...args);
    }
  },

  info(module: string, message: string, ...args: unknown[]): void {
    if (shouldLog('INFO')) {
      console.log(formatMessage('INFO', module, message), ...args);
    }
  },

  warn(module: string, message: string, ...args: unknown[]): void {
    if (shouldLog('WARN')) {
      console.warn(formatMessage('WARN', module, message), ...args);
    }
  },

  error(module: string, message: string, ...args: unknown[]): void {
    if (shouldLog('ERROR')) {
      console.error(formatMessage('ERROR', module, message), ...args);
    }
  },
};

export type { LogLevel };
