import Integration, { IIntegration } from "../models/Integration";
import User, { IUser } from "../models/User";
import { ConflictError, NotFoundError, ValidationError, DatabaseError } from "../utils/errors";
import mongoose, { Document } from "mongoose";
import socketService from "./socketService";
import { SOCKET_EVENTS } from "../config/socket";
import logger from "../utils/logger";

export interface IntegrationCreateData {
  service: string;
  accountId: string;
  user: {
    user_id?: string; // Replaces id field - String field, not MongoDB ObjectId
    referrenceId: string;
    email?: string;
  };
  status?: 'active' | 'inactive' | 'deleted';
  version?: number;
}

export interface IntegrationUpdateData {
  integration_id: string;
  service?: string;
  accountId?: string;
  user?: {
    user_id?: string; // Replaces id field
    referrenceId?: string;
    email?: string;
  };
  status?: 'active' | 'inactive' | 'deleted';
  version?: number;
}

export interface IntegrationUpsertData {
  service: string;
  accountId: string;
  user: {
    user_id?: string; // Replaces id field
    referrenceId: string;
    email?: string;
  };
  status?: 'active' | 'inactive' | 'deleted';
  version?: number;
}

export class IntegrationService {
  /**
   * Get all integrations
   * @returns Array of all integrations
   */
  async getAllIntegrations(): Promise<IIntegration[]> {
    try {
      return await Integration.find().sort({ created_at: -1 });
    } catch (error: any) {
      throw new DatabaseError("Failed to fetch integrations", error);
    }
  }

  /**
   * Get all integrations for a specific user
   * @param userId User ID to fetch integrations for
   * @returns Array of integrations (empty array if none found)
   */
  async getUserIntegrations(userId: string): Promise<IIntegration[]> {
    try {
      // Check if user exists
      const user = await User.findOne({ _id: userId });
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Get integrations for the user (will return empty array if none found)
      return await Integration.find({ "user.user_id": userId }).sort({ created_at: -1 });
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to fetch user integrations", error);
    }
  }

  /**
   * Get a specific integration by ID
   * @param integrationId Integration ID to fetch
   * @returns Integration object or null if not found
   */
  async getIntegrationById(integrationId: string): Promise<IIntegration | null> {
    try {
      // Validate if integrationId is a valid ObjectId
      if (!mongoose.isValidObjectId(integrationId)) {
        throw new ValidationError("Invalid integration ID format");
      }

      return await Integration.findById(integrationId);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to fetch integration", error);
    }
  }

  /**
   * Create a new integration, optionally linked to a user
   * @param integrationData Integration data
   * @returns Created integration
   */
  async createIntegration(integrationData: IntegrationCreateData): Promise<IIntegration> {
    try {
      const { service, accountId, user, status = 'active', version = 1 } = integrationData;

      // Validate the user object
      if (!user || !user.referrenceId) {
        throw new ValidationError("User object with referrenceId is required");
      }

      // If user.user_id is provided, check if user exists
      if (user.user_id) {
        // Check if user exists - user.user_id is a string but we query User model by _id
        const userRecord = await User.findOne({ _id: user.user_id });
        if (!userRecord) {
          throw new NotFoundError("User not found");
        }

        // Check if integration already exists for this user, service, and accountId
        const existingUserIntegration = await Integration.findOne({
          "user.user_id": user.user_id,
          service,
          accountId,
        }) as IIntegration & Document;

        if (existingUserIntegration) {
          throw new ConflictError(
            `Integration for service '${service}' with account ID '${accountId}' already exists for this user`
          );
        }
      } else {
        // Check if integration already exists for this service and accountId without a user_id
        const existingIntegration = await Integration.findOne({
          "user.user_id": { $exists: false },
          service,
          accountId,
        }) as IIntegration & Document;

        if (existingIntegration) {
          throw new ConflictError(
            `Integration for service '${service}' with account ID '${accountId}' already exists`
          );
        }
      }

      // Create new integration
      const integration = new Integration({
        service,
        accountId,
        user,
        status,
        version,
      });

      const savedIntegration = await integration.save();
      
      // Emit socket event after successful creation
      if (user.user_id) {
        try {
          socketService.emitToUser(
            user.user_id, 
            SOCKET_EVENTS.INTEGRATION_CREATED, 
            {
              id: savedIntegration._id,
              service: savedIntegration.service,
              accountId: savedIntegration.accountId,
              status: savedIntegration.status
            }
          );
          
          // Also emit to admins
          socketService.emitToAdmins(
            SOCKET_EVENTS.INTEGRATION_CREATED, 
            {
              id: savedIntegration._id,
              userId: user.user_id,
              service: savedIntegration.service,
              accountId: savedIntegration.accountId,
              status: savedIntegration.status
            }
          );
        } catch (socketError) {
          // Log but don't fail the operation
          logger.error('Failed to emit integration creation socket event:', socketError);
        }
      }

      return savedIntegration;
    } catch (error: any) {
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError
      ) {
        throw error;
      }

      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new ConflictError("Integration already exists");
      }

      throw new DatabaseError("Failed to create integration", error);
    }
  }

  /**
   * Update an existing integration
   * @param updateData Data to update the integration with
   * @returns Updated integration
   */
  async updateIntegration(updateData: IntegrationUpdateData): Promise<IIntegration | null> {
    try {
      const { integration_id, user, status, ...updates } = updateData;

      // Validate if integration_id is a valid ObjectId
      if (!mongoose.isValidObjectId(integration_id)) {
        throw new ValidationError("Invalid integration ID format");
      }

      // Check if integration exists
      const existingIntegration = await Integration.findById(integration_id);
      if (!existingIntegration) {
        throw new NotFoundError("Integration not found");
      }

      // Create a new object with all updates
      const updatedFields: {
        service?: string;
        accountId?: string;
        user?: {
          user_id?: string;
          referrenceId?: string;
          email?: string;
        };
        status?: 'active' | 'inactive' | 'deleted';
        version?: number;
        updated_at?: Date;
      } = { ...updates };

      // Add user to update if provided
      if (user) {
        // If updating user, ensure referrenceId is present or preserved
        if (!user.referrenceId && existingIntegration.user?.referrenceId) {
          updatedFields.user = {
            ...user,
            referrenceId: existingIntegration.user.referrenceId
          };
        } else {
          updatedFields.user = user;
        }

        // If user.user_id is provided, check if user exists
        if (user.user_id) {
          // Check if user exists - user.user_id is a string but we query User model by _id
          const userRecord = await User.findOne({ _id: user.user_id });
          if (!userRecord) {
            throw new NotFoundError("User not found");
          }
        }
      }

      // Add status to update if provided
      if (status) {
        updatedFields.status = status;
      }

      // Always update the timestamp
      updatedFields.updated_at = new Date();

      // Update the integration
      const updatedIntegration = await Integration.findByIdAndUpdate(
        integration_id,
        { $set: updatedFields },
        { new: true }
      ) as IIntegration & Document;

      // Emit socket event for the update
      if (updatedIntegration) {
        try {
          // If user.user_id is available, emit to that user
          if (updatedIntegration.user?.user_id) {
            socketService.emitToUser(
              updatedIntegration.user.user_id,
              SOCKET_EVENTS.INTEGRATION_UPDATED,
              {
                id: integration_id,
                service: updatedIntegration.service,
                accountId: updatedIntegration.accountId,
                status: updatedIntegration.status
              }
            );
          }
          
          // Emit to the integration-specific room
          socketService.emitToIntegration(
            integration_id,
            SOCKET_EVENTS.INTEGRATION_UPDATED,
            {
              id: integration_id,
              service: updatedIntegration.service,
              accountId: updatedIntegration.accountId,
              status: updatedIntegration.status
            }
          );
          
          // If status was updated, emit a status change event
          if (status) {
            this.emitStatusChangeEvents(updatedIntegration, integration_id);
          }
        } catch (socketError) {
          // Log but don't fail the operation
          logger.error('Failed to emit integration update socket event:', socketError);
        }
      }

      return updatedIntegration;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new ConflictError("Integration with these details already exists");
      }

      throw new DatabaseError("Failed to update integration", error);
    }
  }

  /**
   * Delete an integration
   * @param integrationId ID of the integration to delete
   */
  async deleteIntegration(integrationId: string): Promise<void> {
    try {
      // Validate if integrationId is a valid ObjectId
      if (!mongoose.isValidObjectId(integrationId)) {
        throw new ValidationError("Invalid integration ID format");
      }

      // Check if integration exists
      const existingIntegration = await Integration.findById(integrationId);
      if (!existingIntegration) {
        throw new NotFoundError("Integration not found");
      }

      // Instead of actually deleting, set status to 'deleted'
      const updatedIntegration = await Integration.findByIdAndUpdate(integrationId, {
        status: 'deleted',
        updated_at: new Date()
      }, { new: true }) as IIntegration;
      
      // Emit socket events for the deletion
      if (updatedIntegration) {
        try {
          // Emit deleted event to integration room
          socketService.emitToIntegration(
            integrationId,
            SOCKET_EVENTS.INTEGRATION_DELETED,
            { id: integrationId }
          );
          
          // If there's a user associated, notify them too
          if (updatedIntegration.user?.user_id) {
            socketService.emitToUser(
              updatedIntegration.user.user_id,
              SOCKET_EVENTS.INTEGRATION_DELETED,
              { id: integrationId }
            );
          }
          
          // Notify admins as well
          socketService.emitToAdmins(
            SOCKET_EVENTS.INTEGRATION_DELETED,
            { 
              id: integrationId,
              userId: updatedIntegration.user?.user_id 
            }
          );
          
          // Also emit status change events
          this.emitStatusChangeEvents(updatedIntegration, integrationId);
        } catch (socketError) {
          // Log but don't fail the operation
          logger.error('Failed to emit integration deletion socket event:', socketError);
        }
      }
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to delete integration", error);
    }
  }
  
  /**
   * Helper method to emit status change events
   */
  private emitStatusChangeEvents(integration: IIntegration, integrationId?: string): void {
    try {
      // Use passed integrationId or try to get it from the integration
      const id = integrationId || integration.id || String(integration._id);
      
      const statusEventData = {
        id,
        service: integration.service,
        accountId: integration.accountId,
        status: integration.status
      };
      
      // Emit to integration room
      socketService.emitToIntegration(
        id,
        SOCKET_EVENTS.INTEGRATION_STATUS_CHANGED,
        statusEventData
      );
      
      // If there's a user associated, notify them too
      if (integration.user?.user_id) {
        socketService.emitToUser(
          integration.user.user_id,
          SOCKET_EVENTS.INTEGRATION_STATUS_CHANGED,
          statusEventData
        );
      }
      
      // Notify admins
      socketService.emitToAdmins(
        SOCKET_EVENTS.INTEGRATION_STATUS_CHANGED,
        {
          ...statusEventData,
          userId: integration.user?.user_id
        }
      );
    } catch (error) {
      logger.error(`Failed to emit integration status change events for ${integration._id}:`, error);
    }
  }

  /**
   * Get all integrations for a specific user
   * @param userId The ID of the user
   * @returns A list of integrations
   */
  async getIntegrationsByUserId(userId: string): Promise<IIntegration[]> {
    try {      
      // Find all active integrations for this user
      const integrations = await Integration.find({
        "user.user_id": userId,
        status: { $ne: 'deleted' } // Exclude deleted integrations
      });
      
      return integrations;
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to get user integrations", error);
    }
  }

  /**
   * Upsert an integration (create if it doesn't exist, update if it does)
   * @param upsertData Integration data for upsert operation
   * @returns The created or updated integration
   */
  async upsertIntegration(upsertData: IntegrationUpsertData): Promise<IIntegration> {
    try {
      const { service, accountId, user, status = 'active', version = 1 } = upsertData;

      // Validate the user object
      if (!user || !user.referrenceId) {
        throw new ValidationError("User object with referrenceId is required");
      }

      // If user.user_id is provided, check if user exists
      if (user.user_id) {
        // Check if user exists - user.user_id is a string but we query User model by _id
        const userRecord = await User.findOne({ _id: user.user_id });
        if (!userRecord) {
          throw new NotFoundError("User not found");
        }

        // Check if integration already exists for this user, service, and accountId
        const existingUserIntegration = await Integration.findOne({
          "user.user_id": user.user_id,
          service,
          accountId,
        }) as IIntegration & Document;

        if (existingUserIntegration) {
          // Integration exists, update it
          logger.info(`Updating existing integration for service '${service}' with account ID '${accountId}'`);
          
          const updateData: IntegrationUpdateData = {
            integration_id: String(existingUserIntegration._id),
            service,
            accountId,
            user,
            status,
            version: existingUserIntegration.version + 1
          };
          
          return (await this.updateIntegration(updateData))!;
        }
      }

      // Check if integration already exists for this service and accountId without a user_id
      const existingIntegration = await Integration.findOne({
        "user.user_id": { $exists: false },
        service,
        accountId,
      }) as IIntegration & Document;

      if (existingIntegration) {
        // Integration exists, update it
        logger.info(`Updating existing non-user integration for service '${service}' with account ID '${accountId}'`);
        
        const updateData: IntegrationUpdateData = {
          integration_id: String(existingIntegration._id),
          service,
          accountId,
          user,
          status,
          version: existingIntegration.version + 1
        };
        
        return (await this.updateIntegration(updateData))!;
      }

      // No existing integration found, create a new one
      logger.info(`Creating new integration for service '${service}' with account ID '${accountId}'`);
      return await this.createIntegration({
        service,
        accountId,
        user,
        status,
        version
      });
    } catch (error: any) {
      if (
        error instanceof ValidationError ||
        error instanceof NotFoundError
      ) {
        throw error;
      }

      // Handle other errors, including conflicts
      if (error.code === 11000 || error instanceof ConflictError) {
        logger.warn(`Conflict detected during upsert for service '${upsertData.service}' with account ID '${upsertData.accountId}'`);
        
        // Try to find the conflicting record
        const query: any = {
          service: upsertData.service,
          accountId: upsertData.accountId
        };
        
        if (upsertData.user.user_id) {
          query["user.user_id"] = upsertData.user.user_id;
        }
        
        const conflictingIntegration = await Integration.findOne(query) as IIntegration & Document;
        
        if (conflictingIntegration) {
          // Update the conflicting record
          const updateData: IntegrationUpdateData = {
            integration_id: String(conflictingIntegration._id),
            service: upsertData.service,
            accountId: upsertData.accountId,
            user: upsertData.user,
            status: upsertData.status,
            version: conflictingIntegration.version + 1
          };
          
          return (await this.updateIntegration(updateData))!;
        } else {
          // If we can't find the conflicting record but got a conflict error,
          // throw a database error as this is an unexpected state
          throw new DatabaseError("Failed to upsert integration: conflict detected but record not found", error);
        }
      }

      throw new DatabaseError("Failed to upsert integration", error);
    }
  }
}
