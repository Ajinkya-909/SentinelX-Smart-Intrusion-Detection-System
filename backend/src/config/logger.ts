// ================================================
// LOGGER CONFIGURATION
// ================================================

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLogLevel =
  LOG_LEVELS[process.env.LOG_LEVEL as keyof typeof LOG_LEVELS] ||
  LOG_LEVELS.INFO;

const getTimestamp = (): string => {
  return new Date().toISOString();
};

const formatLog = (level: string, message: string, data?: unknown): string => {
  const timestamp = getTimestamp();
  if (data) {
    return `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}`;
  }
  return `[${timestamp}] [${level}] ${message}`;
};

const logger = {
  error: (message: string, error?: unknown) => {
    if (currentLogLevel >= LOG_LEVELS.ERROR) {
      console.error(formatLog("ERROR", message, error));
    }
  },

  warn: (message: string, data?: unknown) => {
    if (currentLogLevel >= LOG_LEVELS.WARN) {
      console.warn(formatLog("WARN", message, data));
    }
  },

  info: (message: string, data?: unknown) => {
    if (currentLogLevel >= LOG_LEVELS.INFO) {
      console.log(formatLog("INFO", message, data));
    }
  },

  debug: (message: string, data?: unknown) => {
    if (currentLogLevel >= LOG_LEVELS.DEBUG) {
      console.debug(formatLog("DEBUG", message, data));
    }
  },
};

export default logger;
