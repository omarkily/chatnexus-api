import { Response } from 'express';

/**
 * Standard success response
 */
export const successResponse = (res: Response, data: any, statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    data
  });
};

/**
 * Success response with created status (201)
 */
export const createdResponse = (res: Response, data: any) => {
  return successResponse(res, data, 201);
};

/**
 * Success response with no content (204)
 */
export const noContentResponse = (res: Response) => {
  return res.status(204).send();
};

/**
 * Error response utility
 */
export const errorResponse = (
  res: Response, 
  message: string, 
  statusCode = 500, 
  code = 'INTERNAL_SERVER_ERROR',
  details?: any
) => {
  return res.status(statusCode).json({
    status: 'error',
    code,
    message,
    details: details || undefined
  });
};

/**
 * Bad request error response (400)
 */
export const badRequestResponse = (res: Response, message: string, details?: any) => {
  return errorResponse(res, message, 400, 'BAD_REQUEST', details);
};

/**
 * Unauthorized error response (401)
 */
export const unauthorizedResponse = (res: Response, message = 'Unauthorized access') => {
  return errorResponse(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Forbidden error response (403)
 */
export const forbiddenResponse = (res: Response, message = 'Access forbidden') => {
  return errorResponse(res, message, 403, 'FORBIDDEN');
};

/**
 * Not found error response (404)
 */
export const notFoundResponse = (res: Response, message = 'Resource not found') => {
  return errorResponse(res, message, 404, 'NOT_FOUND');
};

/**
 * Conflict error response (409)
 */
export const conflictResponse = (res: Response, message: string, details?: any) => {
  return errorResponse(res, message, 409, 'CONFLICT', details);
};

/**
 * Validation error response (422)
 */
export const validationErrorResponse = (res: Response, message: string, details?: any) => {
  return errorResponse(res, message, 422, 'VALIDATION_ERROR', details);
}; 