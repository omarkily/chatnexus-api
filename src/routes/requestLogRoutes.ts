import express from 'express';
import { RequestLogController } from '../controllers/requestLogController';
import { authenticate } from '../middlewares/authMiddleware';
import { ApplicationService } from '../services/applicationService';

const router = express.Router();
const requestLogController = new RequestLogController();
const applicationService = new ApplicationService();

// All routes require authentication with proper ApplicationService
router.use(authenticate(applicationService));

// Add an error handler specifically for log routes
router.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Request log route error:', err);
  
  // If response is already being sent, just pass to next error handler
  if (res.headersSent) {
    return next(err);
  }

  // Return a friendly error message
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'An error occurred while processing request logs',
      status: err.status || 500
    }
  });
});

// Get logs with filtering and pagination
router.get('/', requestLogController.getRequestLogs);

// Get a specific log by ID
router.get('/:id', requestLogController.getRequestLogById);

// Delete logs older than a specified date
router.delete('/old', requestLogController.deleteOldLogs);

// Delete all logs (admin only)
router.delete('/', requestLogController.deleteAllLogs);

export default router; 