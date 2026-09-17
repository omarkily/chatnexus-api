import { Request, Response, NextFunction } from 'express';

/**
 * Async handler wrapper to avoid try-catch blocks in route controllers
 * This utility wraps controller functions to catch any errors and pass them to Express's next() function
 * which will then be handled by the errorHandler middleware
 * 
 * @param fn The async controller function to wrap
 * @returns A function with the same signature as the original but with error handling
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Execute the wrapped function and await its result
      await fn(req, res, next);
      
      // If response is not sent after function execution, consider it a potential error
      if (!res.headersSent) {
        console.warn(`Warning: Controller did not send a response for ${req.method} ${req.path}`);
      }
    } catch (error) {
      // Pass the error to the next middleware (which should be the error handler)
      next(error);
    }
  };
};

export default asyncHandler; 