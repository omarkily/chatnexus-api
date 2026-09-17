import { Request, Response, NextFunction } from 'express';
import { RequestLogService } from '../services/requestLogService';

export class RequestLogController {
  private requestLogService: RequestLogService;

  constructor() {
    this.requestLogService = new RequestLogService();
  }

  /**
   * Get paginated request logs with optional filtering
   */
  getRequestLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Request received for logs with query:', req.query);
      
      const { 
        page, 
        limit, 
        startDate, 
        endDate, 
        method, 
        url,
        statusCode,
        apiVersion
      } = req.query;

      // Validate query parameters
      const queryParams = {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        method: method as string | undefined,
        url: url as string | undefined,
        statusCode: statusCode ? parseInt(statusCode as string, 10) : undefined,
        apiVersion: apiVersion as string | undefined
      };

      // Check for invalid dates
      if (queryParams.startDate && isNaN(queryParams.startDate.getTime())) {
        return res.status(400).json({ error: { message: 'Invalid startDate format', status: 400 } });
      }
      
      if (queryParams.endDate && isNaN(queryParams.endDate.getTime())) {
        return res.status(400).json({ error: { message: 'Invalid endDate format', status: 400 } });
      }

      console.log('Fetching logs with params:', queryParams);
      const result = await this.requestLogService.getRequestLogs(queryParams);
      console.log(`Found ${result.total} logs, returning page ${result.page} of ${result.pages}`);
      
      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error in getRequestLogs:', error);
      return next(error);
    }
  };

  /**
   * Get a request log by ID
   */
  getRequestLogById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: { message: 'Log ID is required', status: 400 } });
      }
      
      console.log(`Fetching log with ID: ${id}`);
      const log = await this.requestLogService.getRequestLogById(id);
      
      if (!log) {
        return res.status(404).json({ error: { message: 'Log not found', status: 404 } });
      }
      
      return res.status(200).json(log);
    } catch (error: any) {
      console.error('Error in getRequestLogById:', error);
      return next(error);
    }
  };

  /**
   * Delete logs older than the specified date
   */
  deleteOldLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ error: { message: 'Date parameter is required', status: 400 } });
      }

      const olderThan = new Date(date as string);
      
      if (isNaN(olderThan.getTime())) {
        return res.status(400).json({ error: { message: 'Invalid date format', status: 400 } });
      }
      
      console.log(`Deleting logs older than: ${olderThan.toISOString()}`);
      const deletedCount = await this.requestLogService.deleteOldLogs(olderThan);
      
      return res.status(200).json({ 
        message: `Successfully deleted ${deletedCount} logs older than ${olderThan.toISOString()}` 
      });
    } catch (error: any) {
      console.error('Error in deleteOldLogs:', error);
      return next(error);
    }
  };
  
  /**
   * Delete all logs (admin only)
   */
  deleteAllLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('Request to delete all logs received');
      
      // Add confirmation check to prevent accidental deletion
      const { confirm } = req.query;
      if (confirm !== 'true') {
        return res.status(400).json({ 
          error: { 
            message: 'Confirmation required. Add ?confirm=true to confirm deletion of all logs', 
            status: 400 
          } 
        });
      }
      
      const deletedCount = await this.requestLogService.deleteAllLogs();
      console.log(`Deleted ${deletedCount} logs`);
      
      return res.status(200).json({ 
        message: `Successfully deleted all ${deletedCount} logs` 
      });
    } catch (error: any) {
      console.error('Error in deleteAllLogs:', error);
      return next(error);
    }
  };
} 