import mongoose from "mongoose";
import RequestLog, { IRequestLog } from "../models/RequestLog";
import { DatabaseError, NotFoundError, ValidationError } from "../utils/errors";

export interface RequestLogQueryParams {
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  method?: string;
  url?: string;
  statusCode?: number;
  apiVersion?: string;
}

export class RequestLogService {
  /**
   * Get request logs with pagination and filtering
   */
  async getRequestLogs(params: RequestLogQueryParams = {}): Promise<{
    logs: IRequestLog[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const {
        page = 1,
        limit = 50,
        startDate,
        endDate,
        method,
        url,
        statusCode,
        apiVersion,
      } = params;

      // Validate pagination parameters
      const validPage = Math.max(1, page); // Ensure page is at least 1
      const validLimit = Math.min(100, Math.max(1, limit)); // Limit between 1 and 100

      const query: any = {};

      // Apply filters if provided
      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
      }

      if (method) query.method = method;
      if (url) query.url = { $regex: url, $options: "i" };
      if (statusCode) query.statusCode = statusCode;
      if (apiVersion) query.apiVersion = apiVersion;

      // Get total count with error handling
      let total = 0;
      try {
        total = await RequestLog.countDocuments(query);
      } catch (error) {
        console.error("Error counting request logs:", error);
        // Fallback to 0 if count fails
        total = 0;
      }

      // Get paginated results
      let logs: IRequestLog[] = [];
      try {
        logs = await RequestLog.find(query)
          .sort({ timestamp: -1 })
          .skip((validPage - 1) * validLimit)
          .limit(validLimit);
      } catch (error) {
        console.error("Error retrieving request logs:", error);
        // Return empty array if retrieval fails
        logs = [];
      }

      return {
        total,
        page: validPage,
        limit: validLimit,
        pages: Math.ceil(total / validLimit) || 1,
        logs,
      };
    } catch (error: any) {
      console.error("Unexpected error in getRequestLogs:", error);
      throw new DatabaseError("Failed to fetch request logs", error);
    }
  }

  /**
   * Get a request log by ID
   */
  async getRequestLogById(logId: string): Promise<IRequestLog | null> {
    try {
      // Validate if logId is a valid ObjectId
      if (!mongoose.isValidObjectId(logId)) {
        throw new ValidationError("Invalid request log ID format");
      }

      const log = await RequestLog.findById(logId);

      // Just return null instead of throwing an error if log is not found
      // The controller will handle the 404 response
      return log;
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error("Error in getRequestLogById:", error);
      throw new DatabaseError("Failed to fetch request log", error);
    }
  }

  /**
   * Delete logs older than the specified date
   */
  async deleteOldLogs(olderThan: Date): Promise<number> {
    try {
      if (!olderThan || isNaN(olderThan.getTime())) {
        throw new ValidationError("Invalid date provided");
      }

      const result = await RequestLog.deleteMany({ timestamp: { $lt: olderThan } });
      return result.deletedCount || 0;
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error("Error in deleteOldLogs:", error);
      throw new DatabaseError("Failed to delete old logs", error);
    }
  }

  /**
   * Delete all logs
   */
  async deleteAllLogs(): Promise<number> {
    try {
      const result = await RequestLog.deleteMany({});
      return result.deletedCount || 0;
    } catch (error: any) {
      console.error("Error in deleteAllLogs:", error);
      throw new DatabaseError("Failed to delete logs", error);
    }
  }
}
