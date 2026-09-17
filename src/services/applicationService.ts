import Application, { IApplication } from "../models/Application";
import { v4 as uuidv4 } from "uuid";
import { SCOPES } from "../utils/constants";
import { ConflictError, NotFoundError, ValidationError, DatabaseError } from "../utils/errors";
import mongoose from "mongoose";

export class ApplicationService {
  async createApplication(
    userId: string,
    name: string,
    description: string,
    scopes: string[]
  ): Promise<IApplication> {
    try {
      // Handle numeric IDs from older tokens (SQLite migration)
      if (!mongoose.isValidObjectId(userId)) {
        console.log("Warning: Invalid ObjectId format for userId:", userId);
        throw new ValidationError(
          "Cannot create application with invalid user ID format. Please login again to get a new token."
        );
      }

      // Check if application with same name already exists for this user
      const existingApp = await Application.findOne({ user_id: userId, name });
      if (existingApp) {
        throw new ConflictError(`Application with name '${name}' already exists`);
      }

      // Generate API key without dashes
      const apiKey = uuidv4().replace(/-/g, "");

      // Create new application
      const application = new Application({
        user_id: userId,
        name,
        description,
        api_key: apiKey,
        scopes,
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
      });

      return await application.save();
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }

      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new ConflictError(`Application with name '${name}' already exists`);
      }

      throw new DatabaseError("Failed to create application", error);
    }
  }

  async getApplicationById(id: string): Promise<IApplication | null> {
    try {
      // Handle invalid ObjectId format
      if (!mongoose.isValidObjectId(id)) {
        console.log("Warning: Invalid ObjectId format for id:", id);
        return null;
      }

      return await Application.findById(id);
    } catch (error: any) {
      throw new DatabaseError("Failed to fetch application", error);
    }
  }

  async getApplicationByName(userId: string, name: string): Promise<IApplication | null> {
    try {
      // Handle numeric IDs from older tokens (SQLite migration)
      if (!mongoose.isValidObjectId(userId)) {
        console.log("Warning: Invalid ObjectId format for userId:", userId);
        return null;
      }

      return await Application.findOne({ user_id: userId, name });
    } catch (error: any) {
      throw new DatabaseError("Failed to fetch application by name", error);
    }
  }

  async getApplicationByApiKey(apiKey: string): Promise<IApplication | null> {
    try {
      return await Application.findOne({ api_key: apiKey, status: "active" });
    } catch (error) {
      throw new DatabaseError("Failed to fetch application by API key", error);
    }
  }

  async getUserApplications(userId: string): Promise<IApplication[]> {
    try {
      console.log("getUserApplications called with userId:", userId);
      console.log("userId type:", typeof userId);

      // Handle numeric IDs from older tokens (SQLite migration)
      if (!mongoose.isValidObjectId(userId)) {
        console.log("Warning: Invalid ObjectId format for userId:", userId);
        console.log(
          "This might be from an old SQLite token - returning empty array instead of error"
        );
        // Return empty array instead of throwing an error for backward compatibility
        return [];
      }

      return await Application.find({ user_id: userId }).sort({ created_at: -1 });
    } catch (error: any) {
      console.error("Error in getUserApplications:", error);
      throw new DatabaseError("Failed to fetch user applications", error);
    }
  }

  async updateApplication(
    id: string,
    userId: string,
    updates: Partial<IApplication>
  ): Promise<IApplication | null> {
    try {
      // Handle invalid ObjectId format
      if (!mongoose.isValidObjectId(id)) {
        console.log("Warning: Invalid ObjectId format for id:", id);
        return null;
      }

      // Handle numeric IDs from older tokens
      if (!mongoose.isValidObjectId(userId)) {
        console.log("Warning: Invalid ObjectId format for userId:", userId);
        return null;
      }

      // Find the application
      const application = await Application.findOne({ _id: id, user_id: userId });

      if (!application) {
        throw new NotFoundError("Application not found");
      }

      // Create update object
      const updateObj: any = { ...updates, updated_at: new Date() };

      // Convert scopes array to string if needed
      if (updates.scopes && Array.isArray(updates.scopes)) {
        updateObj.scopes = updates.scopes;
      }

      // Update the application
      const updatedApplication = await Application.findByIdAndUpdate(id, updateObj, {
        new: true,
        runValidators: true,
      });

      return updatedApplication;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new ConflictError("Application with this name already exists");
      }

      throw new DatabaseError("Failed to update application", error);
    }
  }

  async deleteApplication(id: string, userId: string): Promise<IApplication> {
    try {
      // Handle invalid ObjectId format
      if (!mongoose.isValidObjectId(id)) {
        console.log("Warning: Invalid ObjectId format for id:", id);
        throw new NotFoundError("Application not found");
      }

      // Handle numeric IDs from older tokens
      if (!mongoose.isValidObjectId(userId)) {
        console.log("Warning: Invalid ObjectId format for userId:", userId);
        throw new NotFoundError("Application not found");
      }

      // Find the application
      const application = await Application.findOne({ _id: id, user_id: userId });

      if (!application) {
        throw new NotFoundError("Application not found");
      }

      // Soft delete by changing status to 'deleted'
      application.status = "deleted";
      application.updated_at = new Date();

      await application.save();

      return application;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to delete application", error);
    }
  }

  async updateLastUsed(apiKey: string): Promise<void> {
    try {
      await Application.updateOne({ api_key: apiKey }, { last_used_at: new Date() });
    } catch (error) {
      throw new DatabaseError("Failed to update last used timestamp", error);
    }
  }

  validateScopes(scopes: string[]): boolean {
    const validScopes = Object.values(SCOPES).flatMap((group) => Object.values(group));
    return scopes.every((scope) => validScopes.includes(scope));
  }
}
