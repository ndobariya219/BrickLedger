import { Platform } from 'react-native';

// You can enhance this logger with more transports (e.g., remote logging, file logging)
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

const isDev = __DEV__;

function formatMessage(level: LogLevel, message: string, context?: Record<string, any>, sourceFile?: string, transactionId?: string) {
  const time = new Date().toISOString();
  let base = `\u001b[36m[${time}]\u001b[0m`;
  base += ` \u001b[35m[${level}]\u001b[0m`;
  if (transactionId) base += ` \u001b[32m[TX:${transactionId}]\u001b[0m`;
  if (sourceFile) base += ` \u001b[33m[${sourceFile}]\u001b[0m`;
  base += ` ${message}`;
  if (context) {
    base += ` | Context: ${JSON.stringify(context)}`;
  }
  return base;
}

let currentLogLevel: LogLevel = LogLevel.INFO;
let outputTarget: 'console' | 'file' | 'remote' = 'console';
let remoteLogger: ((msg: string, level: LogLevel) => void) | null = null;

function safeConsoleLog(level: LogLevel, message: string) {
  try {
    const fallback = typeof console?.log === 'function' ? console.log.bind(console) : null;
    const debug = typeof console?.debug === 'function' ? console.debug.bind(console) : fallback;
    const info = typeof console?.info === 'function' ? console.info.bind(console) : fallback;
    const warn = typeof console?.warn === 'function' ? console.warn.bind(console) : fallback;
    const errorMethod = Platform.OS === 'web' ? console?.error : console?.log;
    const error = typeof errorMethod === 'function' ? errorMethod.bind(console) : fallback;

    switch (level) {
      case LogLevel.DEBUG:
        if (isDev && debug) debug(message);
        break;
      case LogLevel.INFO:
        if (info) info(message);
        break;
      case LogLevel.WARN:
        if (warn) warn(message);
        break;
      case LogLevel.ERROR:
        if (error) error(message);
        break;
    }
  } catch (error) {
    try {
      if (typeof console?.log === 'function') {
        console.log(`[LoggerFallback:${level}] ${message}`);
      }
    } catch {
      // Swallow to avoid recursive logging failures.
    }
  }
}

function shouldLog(level: LogLevel): boolean {
  const order = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  return order.indexOf(level) >= order.indexOf(currentLogLevel);
}

function outputLog(formatted: string, level: LogLevel) {
  if (outputTarget === 'console') {
    safeConsoleLog(level, formatted);
  } else if (outputTarget === 'file') {
    // TODO: Implement file logging for supported platforms
    // For now, fallback to console
    safeConsoleLog(LogLevel.INFO, `[FILE] ${formatted}`);
  } else if (outputTarget === 'remote' && remoteLogger) {
    try {
      remoteLogger(formatted, level);
    } catch (error) {
      safeConsoleLog(LogLevel.ERROR, formatted);
    }
  }
}

export const Logger = {
  debug: (message: string, context?: Record<string, any>, sourceFile?: string, transactionId?: string) => {
    if (shouldLog(LogLevel.DEBUG)) outputLog(formatMessage(LogLevel.DEBUG, message, context, sourceFile, transactionId), LogLevel.DEBUG);
  },
  info: (message: string, context?: Record<string, any>, sourceFile?: string, transactionId?: string) => {
    if (shouldLog(LogLevel.INFO)) outputLog(formatMessage(LogLevel.INFO, message, context, sourceFile, transactionId), LogLevel.INFO);
  },
  warn: (message: string, context?: Record<string, any>, sourceFile?: string, transactionId?: string) => {
    if (shouldLog(LogLevel.WARN)) outputLog(formatMessage(LogLevel.WARN, message, context, sourceFile, transactionId), LogLevel.WARN);
  },
  error: (message: string, context?: Record<string, any>, sourceFile?: string, transactionId?: string) => {
    if (shouldLog(LogLevel.ERROR)) outputLog(formatMessage(LogLevel.ERROR, message, context, sourceFile, transactionId), LogLevel.ERROR);
  },
  createTransactionId: () => `tx-${Date.now()}-${Math.floor(Math.random()*10000)}`,
  setLogLevel: (level: LogLevel) => { currentLogLevel = level; },
  setOutputTarget: (target: 'console' | 'file' | 'remote', remoteFn?: (msg: string, level: LogLevel) => void) => {
    outputTarget = target;
    if (target === 'remote' && remoteFn) remoteLogger = remoteFn;
  },
};
