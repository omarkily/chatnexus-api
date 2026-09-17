import { Request, Response } from 'express';
import { ApplicationService } from '../services/applicationService';
import { SCOPES, SCOPE_DESCRIPTIONS } from '../utils/constants';
import { ValidationError, AuthorizationError, NotFoundError, DatabaseError, AuthenticationError } from '../utils/errors';
import { successResponse, createdResponse, noContentResponse } from '../utils/response';
import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler';

export class ApplicationController {
  private applicationService: ApplicationService;

  constructor(applicationService: ApplicationService) {
    this.applicationService = applicationService;
  }

  createApplication = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, description, scopes } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new AuthenticationError('User authentication required');
    }

    // Handle tokens with numeric IDs (from SQLite)
    if (!mongoose.isValidObjectId(userId)) {
      throw new ValidationError(
        'Your account needs to be migrated. Please logout and login again to update your token before creating applications.',
        { reason: 'INVALID_USER_ID' }
      );
    }

    // Validate required fields
    if (!name) {
      throw new ValidationError('Application name is required');
    }

    // Validate scopes
    if (scopes && !Array.isArray(scopes)) {
      throw new ValidationError('Scopes must be an array');
    }

    // Check that all provided scopes are valid
    if (scopes && scopes.length > 0) {
      // Get a flat array of all valid scopes
      const validScopes = Object.values(SCOPES).flatMap(group => Object.values(group));
      
      const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        throw new ValidationError(
          `Invalid scopes: ${invalidScopes.join(', ')}`,
          { validScopes }
        );
      }
    }

    const application = await this.applicationService.createApplication(
      userId,
      name,
      description || '',
      scopes || []
    );

    createdResponse(res, application);
  });

  getApplications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // For admin use only - we don't have a method to get all applications
    // Return empty array for now
    successResponse(res, []);
  });

  getUserApplications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AuthenticationError('User authentication required');
    }

    // Handle tokens with numeric IDs (from SQLite)
    if (!mongoose.isValidObjectId(userId)) {
      throw new ValidationError(
        'Your account needs to be migrated. Please logout and login again to update your token.',
        { reason: 'INVALID_USER_ID' }
      );
    }

    const applications = await this.applicationService.getUserApplications(userId);
    successResponse(res, applications);
  });

  getApplicationById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const applicationId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new AuthenticationError('User authentication required');
    }

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(applicationId)) {
      throw new ValidationError('Invalid application ID format');
    }

    const application = await this.applicationService.getApplicationById(applicationId);

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Security check: Ensure the user is the owner of the application
    if (application.user_id.toString() !== userId.toString()) {
      throw new AuthorizationError('You do not have access to this application');
    }

    successResponse(res, application);
  });

  updateApplication = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const applicationId = req.params.id;
    const userId = req.user?.id;
    const { name, description, scopes } = req.body;

    if (!userId) {
      throw new AuthenticationError('User authentication required');
    }

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(applicationId)) {
      throw new ValidationError('Invalid application ID format');
    }

    // Check that the application exists
    const existingApplication = await this.applicationService.getApplicationById(applicationId);
    if (!existingApplication) {
      throw new NotFoundError('Application not found');
    }

    // Security check: Ensure the user is the owner of the application
    if (existingApplication.user_id.toString() !== userId.toString()) {
      throw new AuthorizationError('You do not have permission to update this application');
    }

    // Check that all provided scopes are valid
    if (scopes && Array.isArray(scopes) && scopes.length > 0) {
      // Get a flat array of all valid scopes
      const validScopes = Object.values(SCOPES).flatMap(group => Object.values(group));
      
      const invalidScopes = scopes.filter((scope: string) => !validScopes.includes(scope));
      if (invalidScopes.length > 0) {
        throw new ValidationError(
          `Invalid scopes: ${invalidScopes.join(', ')}`,
          { validScopes }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (scopes !== undefined) updateData.scopes = scopes;

    // Update the application
    const updatedApplication = await this.applicationService.updateApplication(
      applicationId,
      userId,
      updateData
    );

    successResponse(res, updatedApplication);
  });

  deleteApplication = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const applicationId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new AuthenticationError('User authentication required');
    }

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(applicationId)) {
      throw new ValidationError('Invalid application ID format');
    }

    // Check that the application exists
    const existingApplication = await this.applicationService.getApplicationById(applicationId);
    if (!existingApplication) {
      throw new NotFoundError('Application not found');
    }

    // Security check: Ensure the user is the owner of the application
    if (existingApplication.user_id.toString() !== userId.toString()) {
      throw new AuthorizationError('You do not have permission to delete this application');
    }

    // Deactivate the application instead of deleting it
    const deactivatedApplication = await this.applicationService.deleteApplication(applicationId, userId);
    
    successResponse(res, {
      message: 'Application deactivated successfully',
      application: deactivatedApplication
    });
  });

  // Method for regenerating API key
  regenerateApiKey = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const applicationId = req.params.id;
    const userId = req.user?.id;

    if (!userId) {
      throw new AuthenticationError('User authentication required');
    }

    if (!applicationId) {
      throw new ValidationError('Application ID is required');
    }

    // Check that the application exists
    const existingApplication = await this.applicationService.getApplicationById(applicationId);
    if (!existingApplication) {
      throw new NotFoundError('Application not found');
    }

    // Security check: Ensure the user is the owner of the application
    if (existingApplication.user_id.toString() !== userId.toString()) {
      throw new AuthorizationError('You do not have permission to regenerate API key for this application');
    }

    // Since regenerateApiKey doesn't exist, we'll implement custom logic
    // Generate a new API key and update the application
    const { v4: uuidv4 } = require('uuid');
    const newApiKey = uuidv4().replace(/-/g, "");
    
    const updateData = {
      api_key: newApiKey,
      updated_at: new Date()
    };
    
    const updatedApplication = await this.applicationService.updateApplication(
      applicationId,
      userId,
      updateData
    );
    
    successResponse(res, {
      message: 'API key regenerated successfully',
      application: updatedApplication
    });
  });

  // Utility method to get all available scopes with descriptions
  getAvailableScopes = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Flatten the nested SCOPES object to get all scope values
    const allScopes = Object.values(SCOPES).flatMap(group => Object.values(group));
    
    const scopesWithDescriptions = allScopes.map((scope: string) => ({
      name: scope,
      description: SCOPE_DESCRIPTIONS[scope] || 'No description available'
    }));
    
    successResponse(res, scopesWithDescriptions);
  });
} 