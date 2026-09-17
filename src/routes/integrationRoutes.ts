import { Router } from 'express';
import { IntegrationController } from '../controllers/integrationController';
import { authenticate } from '../middlewares/authMiddleware';
import { ApplicationService } from '../services/applicationService';

const router = Router();
const applicationService = new ApplicationService();
const integrationController = new IntegrationController();

// All integration routes require authentication
router.use(authenticate(applicationService));

// Get all integrations
router.get('/', integrationController.getAllIntegrations.bind(integrationController));

// Get a specific integration by ID
router.get('/:id', integrationController.getIntegrationById.bind(integrationController));

// Get all integrations for a specific user
router.get('/user/:userid', integrationController.getUserIntegrations.bind(integrationController));

// Create a new integration
router.post('/', integrationController.createIntegration.bind(integrationController));

// Upsert an integration (create if it doesn't exist, update if it does)
router.put('/upsert', integrationController.upsertIntegration.bind(integrationController));

// Update an integration (entire object)
router.put('/', integrationController.updateIntegration.bind(integrationController));

// Update an integration by ID
router.patch('/:id', integrationController.updateIntegration.bind(integrationController));

// Update integration status
router.patch('/:id/status', integrationController.updateIntegrationStatus.bind(integrationController));

// Delete an integration (set status to 'deleted')
router.delete('/:id', integrationController.deleteIntegration.bind(integrationController));

export default router; 