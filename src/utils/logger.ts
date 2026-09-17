/**
 * Simple logging utility for consistent logging across the application
 */
const logger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'production') {
      // In production, logs should be structured for easier parsing
      console.info(JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        data: args.length > 0 ? args : undefined
      }));
    } else {
      // In development, logs should be human-readable
      console.info(`[INFO] ${message}`, ...args);
    }
  },
  
  error: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'production') {
      // In production, logs should be structured for easier parsing
      console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        data: args.length > 0 ? args : undefined
      }));
    } else {
      // In development, logs should be human-readable with color
      console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`, ...args);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'production') {
      // In production, logs should be structured for easier parsing
      console.warn(JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        data: args.length > 0 ? args : undefined
      }));
    } else {
      // In development, logs should be human-readable with color
      console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`, ...args);
    }
  },
  
  debug: (message: string, ...args: any[]) => {
    // Only log debug messages if not in production or if debug level is explicitly set
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug') {
      if (process.env.NODE_ENV === 'production') {
        // In production, logs should be structured for easier parsing
        console.debug(JSON.stringify({
          level: 'debug',
          timestamp: new Date().toISOString(),
          message,
          data: args.length > 0 ? args : undefined
        }));
      } else {
        // In development, logs should be human-readable with color
        console.debug(`\x1b[36m[DEBUG]\x1b[0m ${message}`, ...args);
      }
    }
  }
};

export default logger; 