import { Request, Response } from "express";
import {
  IntegrationService,
  IntegrationCreateData,
  IntegrationUpdateData,
  IntegrationUpsertData,
} from "../services/integrationService";
import { successResponse, createdResponse, noContentResponse } from "../utils/response";
import asyncHandler from "../utils/asyncHandler";
import { ValidationError, NotFoundError, DatabaseError } from "../utils/errors";
import mongoose from "mongoose";

export class IntegrationController {
  private integrationService: IntegrationService;

  constructor() {
    this.integrationService = new IntegrationService();
  }

  /**
   * Get all integrations
   */
  getAllIntegrations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const integrations = await this.integrationService.getAllIntegrations();
    successResponse(res, integrations);
  });

  /**
   * Get all integrations for a user
   */
  getUserIntegrations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.userid;

    if (!userId) {
      throw new ValidationError("User ID is required");
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(userId)) {
      throw new ValidationError("Invalid user ID format");
    }

    const integrations = await this.integrationService.getUserIntegrations(userId);
    successResponse(res, integrations);
  });

  /**
   * Get a specific integration by ID
   */
  getIntegrationById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const integrationId = req.params.id;

    if (!integrationId) {
      throw new ValidationError("Integration ID is required");
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(integrationId)) {
      throw new ValidationError("Invalid integration ID format");
    }

    const integration = await this.integrationService.getIntegrationById(integrationId);

    if (!integration) {
      throw new NotFoundError("Integration not found");
    }

    successResponse(res, integration);
  });

  /**
   * Create a new integration
   */
  createIntegration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { service, accountId, user, status, version } = req.body;

    // Validate required fields
    if (!service || !accountId) {
      throw new ValidationError(
        "Missing required fields: service and accountId are required"
      );
    }

    // Validate user object
    if (!user || !user.referrenceId) {
      throw new ValidationError("User object with referrenceId is required");
    }

    // Validate status if provided
    if (status && !['active', 'inactive', 'deleted'].includes(status)) {
      throw new ValidationError("Status must be one of: active, inactive, deleted");
    }

    const integrationData: IntegrationCreateData = {
      service,
      accountId,
      user,
      ...(status && { status }),
      ...(version !== undefined && { version }),
    };

    const integration = await this.integrationService.createIntegration(integrationData);
    createdResponse(res, integration);
  });

  /**
   * Update an existing integration
   */
  updateIntegration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Integration ID could come from the body (PUT) or params (PATCH)
    const integrationId = req.params.id || req.body.integration_id;
    const { service, accountId, user, status, version } = req.body;

    if (!integrationId) {
      throw new ValidationError("Integration ID is required");
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(integrationId)) {
      throw new ValidationError("Invalid integration ID format");
    }

    // For user field, if provided
    if (user) {
      // Validate user.referrenceId if provided
      if (user.referrenceId === "") {
        throw new ValidationError("User referrenceId cannot be empty if provided");
      }
    }

    // Validate status if provided
    if (status && !['active', 'inactive', 'deleted'].includes(status)) {
      throw new ValidationError("Status must be one of: active, inactive, deleted");
    }

    // Check if integration exists
    const existingIntegration = await this.integrationService.getIntegrationById(integrationId);
    if (!existingIntegration) {
      throw new NotFoundError("Integration not found");
    }

    const updateData: IntegrationUpdateData = {
      integration_id: integrationId,
      ...(service && { service }),
      ...(accountId && { accountId }),
      ...(user && { user }),
      ...(status && { status }),
      ...(version !== undefined && { version }),
    };

    const updatedIntegration = await this.integrationService.updateIntegration(updateData);

    if (!updatedIntegration) {
      throw new DatabaseError("Failed to update integration");
    }

    successResponse(res, updatedIntegration);
  });

  /**
   * Update integration status
   */
  updateIntegrationStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const integrationId = req.params.id;
    const { status } = req.body;

    if (!integrationId) {
      throw new ValidationError("Integration ID is required");
    }

    if (!status) {
      throw new ValidationError("Status is required");
    }

    // Validate status
    if (!['active', 'inactive', 'deleted'].includes(status)) {
      throw new ValidationError("Status must be one of: active, inactive, deleted");
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(integrationId)) {
      throw new ValidationError("Invalid integration ID format");
    }

    // Check if integration exists
    const existingIntegration = await this.integrationService.getIntegrationById(integrationId);
    if (!existingIntegration) {
      throw new NotFoundError("Integration not found");
    }

    const updateData: IntegrationUpdateData = {
      integration_id: integrationId,
      status
    };

    const updatedIntegration = await this.integrationService.updateIntegration(updateData);

    if (!updatedIntegration) {
      throw new DatabaseError("Failed to update integration status");
    }

    successResponse(res, updatedIntegration);
  });

  /**
   * Delete an integration
   */
  deleteIntegration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const integrationId = req.params.id;

    if (!integrationId) {
      throw new ValidationError("Integration ID is required");
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(integrationId)) {
      throw new ValidationError("Invalid integration ID format");
    }

    // Check if integration exists
    const existingIntegration = await this.integrationService.getIntegrationById(integrationId);
    if (!existingIntegration) {
      throw new NotFoundError("Integration not found");
    }

    await this.integrationService.deleteIntegration(integrationId);
    noContentResponse(res);
  });

  /**
   * Upsert an integration (create if it doesn't exist, update if it does)
   */
  upsertIntegration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { service, accountId, user, status, version } = req.body;

    // Validate required fields
    if (!service || !accountId) {
      throw new ValidationError(
        "Missing required fields: service and accountId are required"
      );
    }

    // Validate user object
    if (!user || !user.referrenceId) {
      throw new ValidationError("User object with referrenceId is required");
    }

    // Validate status if provided
    if (status && !['active', 'inactive', 'deleted'].includes(status)) {
      throw new ValidationError("Status must be one of: active, inactive, deleted");
    }

    const integrationData: IntegrationUpsertData = {
      service,
      accountId,
      user,
      ...(status && { status }),
      ...(version !== undefined && { version }),
    };

    const integration = await this.integrationService.upsertIntegration(integrationData);
    successResponse(res, integration);
  });
}
