import { Request, Response, NextFunction } from 'express';
import RequestLog from '../models/RequestLog';

/**
 * Check if a URL is a log-related endpoint
 * @param url The URL to check
 * @returns True if the URL is a log-related endpoint
 */
const isLogEndpoint = (url: string): boolean => {
  const logPatterns = [
    '/api/logs',
    '/logs',
    // Add any other log-related patterns here
  ];
  
  return logPatterns.some(pattern => url.includes(pattern));
};

/**
 * Middleware to log all HTTP requests and responses
 */
export const requestLoggerMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for OPTIONS requests to avoid excess log entries
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Skip logging for log-related endpoints to avoid recursive logging
    const url = req.originalUrl || req.url;
    if (isLogEndpoint(url)) {
      console.log(`Skipping request logging for logs endpoint: ${url}`);
      return next();
    }

    console.log(`Logging request for: ${req.method} ${url}`);
    const startTime = new Date();
    let logSaved = false;
    
    const logEntry = {
      timestamp: startTime,
      apiVersion: '1', // Default API version
      method: req.method,
      url: url,
      requestData: '',
      responseData: '',
      statusCode: 0,
      terminalLogs: [] as string[]
    };

    // Capture request body if present
    if (req.body && Object.keys(req.body).length > 0) {
      try {
        logEntry.requestData = JSON.stringify(req.body);
      } catch (error) {
        logEntry.requestData = 'Could not stringify request body';
      }
    }

    // Store original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleInfo = console.info;
    const originalConsoleDebug = console.debug;

    // Function to restore console methods
    const restoreConsoleMethods = () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.info = originalConsoleInfo;
      console.debug = originalConsoleDebug;
    };

    // Function to save the log entry
    const saveLogEntry = () => {
      if (logSaved) return; // Prevent duplicate saves
      logSaved = true;

      // Restore console methods first
      restoreConsoleMethods();

      // Save status code
      logEntry.statusCode = res.statusCode;

      // Save log entry to database
      try {
        const requestLog = new RequestLog(logEntry);
        requestLog.save().catch(err => {
          originalConsoleError('Error saving request log:', err);
        });
      } catch (error) {
        originalConsoleError('Error creating request log:', error);
      }
    };

    // Ensure console methods are restored in case of uncaught errors
    process.once('uncaughtException', () => {
      if (!logSaved) {
        restoreConsoleMethods();
      }
    });

    try {
      // Override console methods to capture logs
      console.log = (...args: any[]) => {
        try {
          const logMessage = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ');
          logEntry.terminalLogs.push(`[LOG] ${logMessage}`);
        } catch (error) {
          logEntry.terminalLogs.push(`[LOG] Error stringifying log message`);
        }
        originalConsoleLog(...args);
      };

      console.error = (...args: any[]) => {
        try {
          const logMessage = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ');
          logEntry.terminalLogs.push(`[ERROR] ${logMessage}`);
        } catch (error) {
          logEntry.terminalLogs.push(`[ERROR] Error stringifying error message`);
        }
        originalConsoleError(...args);
      };

      console.warn = (...args: any[]) => {
        try {
          const logMessage = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ');
          logEntry.terminalLogs.push(`[WARN] ${logMessage}`);
        } catch (error) {
          logEntry.terminalLogs.push(`[WARN] Error stringifying warning message`);
        }
        originalConsoleWarn(...args);
      };

      console.info = (...args: any[]) => {
        try {
          const logMessage = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ');
          logEntry.terminalLogs.push(`[INFO] ${logMessage}`);
        } catch (error) {
          logEntry.terminalLogs.push(`[INFO] Error stringifying info message`);
        }
        originalConsoleInfo(...args);
      };

      console.debug = (...args: any[]) => {
        try {
          const logMessage = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' ');
          logEntry.terminalLogs.push(`[DEBUG] ${logMessage}`);
        } catch (error) {
          logEntry.terminalLogs.push(`[DEBUG] Error stringifying debug message`);
        }
        originalConsoleDebug(...args);
      };

      // Capture the original response methods
      const originalSend = res.send;
      const originalJson = res.json;

      // Override response.send
      res.send = function(body?: any): Response {
        try {
          logEntry.responseData = typeof body === 'string' ? body : JSON.stringify(body);
        } catch (error) {
          logEntry.responseData = 'Could not stringify response body';
        }
        return originalSend.apply(res, [body]);
      };

      // Override response.json
      res.json = function(body?: any): Response {
        try {
          logEntry.responseData = JSON.stringify(body);
        } catch (error) {
          logEntry.responseData = 'Could not stringify response body';
        }
        return originalJson.apply(res, [body]);
      };

      // Use response events to capture when the response is complete
      res.on('finish', saveLogEntry);
      res.on('close', saveLogEntry);
      
      // Continue to the next middleware or route handler
      next();
    } catch (error) {
      // Restore console methods in case of error
      restoreConsoleMethods();
      
      // Continue to the next middleware even if logging setup fails
      next(error);
    }
  };
}; 