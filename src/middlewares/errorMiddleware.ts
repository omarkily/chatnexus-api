import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError, ConflictError, DatabaseError } from '../utils/errors';
import mongoose from 'mongoose';
import { MongoError } from "mongodb";
import { JsonWebTokenError, TokenExpiredError, NotBeforeError } from "jsonwebtoken";

/**
 * Helper function to create standardized error responses
 */
const errorResponse = (message: string, code?: string, details?: any) => {
  return {
    status: "error",
    message,
    code: code || 'error',
    ...(details ? { details } : {})
  };
};

// Simple middleware to handle CORS preflight requests
export const handleCorsOptions = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    // Get CORS origin configuration
    let corsOrigin: string | string[];
    
    // Check if CORS_ORIGIN contains multiple origins (comma-separated)
    if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.includes(',')) {
      corsOrigin = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
    } else {
      corsOrigin = process.env.CORS_ORIGIN || '*';
    }
    
    // Handle the case where we have multiple origins
    const requestOrigin = req.header('Origin');
    if (requestOrigin && Array.isArray(corsOrigin)) {
      if (corsOrigin.includes(requestOrigin)) {
        res.header('Access-Control-Allow-Origin', requestOrigin);
      }
    } else {
      // For simple string origin or wildcard
      res.header('Access-Control-Allow-Origin', typeof corsOrigin === 'string' ? corsOrigin : '*');
    }
    
    // Set other CORS headers
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // End the request with success status
    return res.status(204).end();
  }
  
  // Continue processing for non-OPTIONS requests
  next();
};

// Global error handler middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log errors differently based on environment
  if (process.env.NODE_ENV === 'development') {
    console.error('\x1b[31m%s\x1b[0m', '[ERROR]', err);
  } else {
    // In production, we might want to log to a file or service
    console.error(`[ERROR] ${err.message || 'Unknown error'}`);
  }

  // Set CORS headers for error responses too
  let corsOrigin: string | string[];
  
  // Check if CORS_ORIGIN contains multiple origins (comma-separated)
  if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.includes(',')) {
    corsOrigin = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  } else {
    corsOrigin = process.env.CORS_ORIGIN || '*';
  }
  
  // Handle the case where we have multiple origins
  const requestOrigin = req.header('Origin');
  if (requestOrigin && Array.isArray(corsOrigin)) {
    if (corsOrigin.includes(requestOrigin)) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
    }
  } else {
    // For simple string origin or wildcard
    res.header('Access-Control-Allow-Origin', typeof corsOrigin === 'string' ? corsOrigin : '*');
  }
  
  // Handle different types of errors
  
  // Handle our custom errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(errorResponse(
      err.message,
      err.code,
      err.details
    ));
  }
  
  // Handle ValidationError
  if (err instanceof ValidationError) {
    return res.status(400).json(errorResponse(
      err.message,
      'validation_error',
      err.details
    ));
  }
  
  // Handle AuthenticationError
  if (err instanceof AuthenticationError) {
    return res.status(401).json(errorResponse(
      err.message,
      'authentication_error',
      err.details
    ));
  }
  
  // Handle AuthorizationError
  if (err instanceof AuthorizationError) {
    return res.status(403).json(errorResponse(
      err.message,
      'authorization_error',
      err.details
    ));
  }
  
  // Handle NotFoundError
  if (err instanceof NotFoundError) {
    return res.status(404).json(errorResponse(
      err.message,
      'not_found',
      err.details
    ));
  }
  
  // Handle ConflictError
  if (err instanceof ConflictError) {
    return res.status(409).json(errorResponse(
      err.message,
      'conflict',
      err.details
    ));
  }
  
  // Handle DatabaseError
  if (err instanceof DatabaseError) {
    return res.status(500).json(errorResponse(
      err.message,
      'database_error',
      err.details
    ));
  }
  
  // Handle Mongoose validation errors
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map(error => error.message);
    return res.status(400).json(errorResponse(
      'Validation error',
      'validation_error',
      errors
    ));
  }
  
  // Handle MongoDB duplicate key error
  if (err instanceof MongoError && err.code === 11000) {
    return res.status(409).json(errorResponse(
      'Duplicate key error',
      'duplicate_key',
      err.message
    ));
  }

  // Handle operational errors (if the error has isOperational flag)
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json(errorResponse(
      err.message,
      err.code || 'operational_error',
      err.details
    ));
  }
  
  // Handle JSON parse errors
  if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
    return res.status(400).json(errorResponse(
      'Invalid JSON',
      'invalid_json',
      err.message
    ));
  }
  
  // Handle JWT errors
  if (err instanceof JsonWebTokenError) {
    return res.status(401).json(errorResponse(
      'Invalid token',
      'invalid_token',
      err.message
    ));
  }
  
  if (err instanceof TokenExpiredError) {
    return res.status(401).json(errorResponse(
      'Token expired',
      'token_expired',
      err.message
    ));
  }
  
  if (err instanceof NotBeforeError) {
    return res.status(401).json(errorResponse(
      'Token not active',
      'token_not_active',
      err.message
    ));
  }

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json(errorResponse(
      'File too large',
      'file_too_large',
      'The uploaded file exceeds the size limit'
    ));
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json(errorResponse(
      'Unexpected file',
      'unexpected_file',
      'The uploaded file was not expected'
    ));
  }
  
  // Handle TypeError
  if (err instanceof TypeError) {
    return res.status(400).json(errorResponse(
      'Type error',
      'type_error',
      process.env.NODE_ENV === 'development' ? err.message : 'A type error occurred'
    ));
  }
  
  // Handle ReferenceError
  if (err instanceof ReferenceError) {
    return res.status(500).json(errorResponse(
      'Reference error',
      'reference_error',
      process.env.NODE_ENV === 'development' ? err.message : 'A reference error occurred'
    ));
  }
  
  // Handle URIError
  if (err instanceof URIError) {
    return res.status(400).json(errorResponse(
      'Invalid URI',
      'invalid_uri',
      process.env.NODE_ENV === 'development' ? err.message : 'An invalid URI was provided'
    ));
  }
  
  // Default to 500 internal server error for unexpected errors
  return res.status(500).json(errorResponse(
    process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    'internal_error',
    process.env.NODE_ENV === 'development' ? err.stack : undefined
  ));
}; 