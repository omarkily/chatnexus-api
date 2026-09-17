import User, { IUser } from '../models/User';
import { ConflictError, NotFoundError, DatabaseError, ValidationError } from '../utils/errors';
import mongoose from 'mongoose';

export class UserService {
  async getAllUsers(): Promise<IUser[]> {
    try {
      return await User.find().sort({ created_at: -1 });
    } catch (error: any) {
      throw new DatabaseError('Failed to fetch users', error);
    }
  }

  async getUserById(id: string, includeIntegrations = false, includeApplications = false): Promise<IUser | null> {
    try {
      // Validate if id is a valid ObjectId
      if (!mongoose.isValidObjectId(id)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      let query = User.findById(id);
      
      if (includeIntegrations) {
        query = query.populate('integrations');
      }

      if (includeApplications) {
        query = query.populate({
          path: 'applications',
          model: 'Application',
          match: { user_id: id }
        });
      }
      
      const user = await query;
      return user;
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to fetch user', error);
    }
  }

  async getUserWithIntegrations(id: string): Promise<IUser | null> {
    return this.getUserById(id, true, false);
  }

  async getUserWithApplications(id: string): Promise<IUser | null> {
    return this.getUserById(id, false, true);
  }

  async getUserWithAllData(id: string): Promise<IUser | null> {
    return this.getUserById(id, true, true);
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      return await User.findOne({ email });
    } catch (error: any) {
      throw new DatabaseError('Failed to fetch user by email', error);
    }
  }

  async createUser(username: string, email: string, password: string): Promise<IUser> {
    try {
      // Check if user with this email already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Create new user
      const user = new User({
        username,
        email,
        password
      });

      return await user.save();
    } catch (error: any) {
      if (error instanceof ConflictError) {
        throw error;
      }
      
      if (error.code === 11000) { // MongoDB duplicate key error
        throw new ConflictError('User with this email or username already exists');
      }
      
      throw new DatabaseError('Failed to create user', error);
    }
  }

  async updateUser(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    try {
      // Validate if id is a valid ObjectId
      if (!mongoose.isValidObjectId(id)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      // Check if user exists
      const existingUser = await this.getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // If email is being updated, check if new email already exists
      if (updates.email && updates.email !== existingUser.email) {
        const userWithEmail = await this.getUserByEmail(updates.email);
        if (userWithEmail) {
          throw new ConflictError('User with this email already exists');
        }
      }

      // Update the user
      const user = await User.findByIdAndUpdate(
        id,
        { ...updates, updated_at: new Date() },
        { new: true, runValidators: true }
      );

      return user;
    } catch (error: any) {
      if (error instanceof ValidationError || 
          error instanceof NotFoundError || 
          error instanceof ConflictError) {
        throw error;
      }
      
      if (error.code === 11000) { // MongoDB duplicate key error
        throw new ConflictError('User with this email or username already exists');
      }
      
      throw new DatabaseError('Failed to update user', error);
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // Validate if id is a valid ObjectId
      if (!mongoose.isValidObjectId(id)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      // Check if user exists
      const existingUser = await this.getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      await User.findByIdAndDelete(id);
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete user', error);
    }
  }

  async validatePassword(user: IUser, password: string): Promise<boolean> {
    return user.validatePassword(password);
  }

  /**
   * Set or unset a user as admin
   * @param id User ID
   * @param isAdmin Boolean indicating if user should be admin
   * @returns Updated user
   */
  async setUserAdmin(id: string, isAdmin: boolean): Promise<IUser | null> {
    try {
      // Validate if id is a valid ObjectId
      if (!mongoose.isValidObjectId(id)) {
        throw new ValidationError('Invalid user ID format');
      }
      
      // Check if user exists
      const existingUser = await this.getUserById(id);
      if (!existingUser) {
        throw new NotFoundError('User not found');
      }

      // Update the user's admin status
      const user = await User.findByIdAndUpdate(
        id,
        { isAdmin, updated_at: new Date() },
        { new: true, runValidators: true }
      );

      return user;
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      throw new DatabaseError('Failed to update user admin status', error);
    }
  }
} 