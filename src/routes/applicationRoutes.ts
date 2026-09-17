import { Router } from 'express';
import { ApplicationController } from '../controllers/applicationController';
import { authenticate, requireScope } from '../middlewares/authMiddleware';
import { SCOPES } from '../utils/constants';
import { ApplicationService } from '../services/applicationService';

const router = Router();
const applicationService = new ApplicationService();
const applicationController = new ApplicationController(applicationService);

// Get available scopes
router.get('/scopes', authenticate(applicationService), applicationController.getAvailableScopes.bind(applicationController));

// Create a new application
router.post(
  '/',
  authenticate(applicationService),
  requireScope([SCOPES.APPLICATIONS.WRITE]),
  applicationController.createApplication.bind(applicationController)
);

// Get all applications for the authenticated user
router.get(
  '/',
  authenticate(applicationService),
  requireScope([SCOPES.APPLICATIONS.READ]),
  applicationController.getUserApplications.bind(applicationController)
);

// Get a specific application
router.get(
  '/:id',
  authenticate(applicationService),
  requireScope([SCOPES.APPLICATIONS.READ]),
  applicationController.getApplicationById.bind(applicationController)
);

// Update an application
router.patch(
  '/:id',
  authenticate(applicationService),
  requireScope([SCOPES.APPLICATIONS.UPDATE]),
  applicationController.updateApplication.bind(applicationController)
);

// Delete an application
router.delete(
  '/:id',
  authenticate(applicationService),
  requireScope([SCOPES.APPLICATIONS.DELETE]),
  applicationController.deleteApplication.bind(applicationController)
);

// Regenerate API key for an application
router.post(
  '/:id/regenerate-key',
  authenticate(applicationService),
  requireScope([SCOPES.APPLICATIONS.UPDATE]),
  applicationController.regenerateApiKey.bind(applicationController)
);

export default router; 