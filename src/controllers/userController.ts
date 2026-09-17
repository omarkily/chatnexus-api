import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserService } from '../services/userService';
import { ValidationError, NotFoundError, DatabaseError, AuthorizationError, AuthenticationError } from '../utils/errors';
import { successResponse, createdResponse, noContentResponse } from '../utils/response';
import asyncHandler from '../utils/asyncHandler';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // Wrap all controller methods with asyncHandler
  getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Disable the "get all users" functionality for everyone
    throw new AuthorizationError('Access to all users list is forbidden');
  });

  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Check if additional data should be included
    const includeIntegrations = req.query.includeIntegrations === 'true';
    const includeApplications = req.query.includeApplications === 'true';
    
    let user;
    if (includeIntegrations && includeApplications) {
      user = await this.userService.getUserWithAllData(userId);
    } else if (includeIntegrations) {
      user = await this.userService.getUserWithIntegrations(userId);
    } else if (includeApplications) {
      user = await this.userService.getUserWithApplications(userId);
    } else {
      user = await this.userService.getUserById(userId);
    }
      
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Only allow users to access their own data or admins to access any data
    if (req.user?.id !== userId && !req.user?.isAdmin) {
      throw new AuthorizationError('You can only access your own user data');
    }

    // Convert to a plain object and remove the password
    const userObject = user.toObject();
    delete userObject.password;
    
    // Clean up the response by removing Mongoose internal fields if present
    if (userObject.$__) {
      delete userObject.$__;
    }
    if (userObject.$isNew) {
      delete userObject.$isNew;
    }

    successResponse(res, userObject);
  });

  // Method to get user with integrations
  getUserWithIntegrations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.userService.getUserWithAllData(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Only allow users to access their own data or admins to access any data
    if (req.user?.id !== userId && !req.user?.isAdmin) {
      throw new AuthorizationError('You can only access your own user data');
    }

    // Convert to a plain object and remove the password
    const userObject = user.toObject();
    delete userObject.password;
    
    // Clean up the response by removing Mongoose internal fields if present
    if (userObject.$__) {
      delete userObject.$__;
    }
    if (userObject.$isNew) {
      delete userObject.$isNew;
    }

    successResponse(res, userObject);
  });

  createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      throw new ValidationError('Username, email, and password are required');
    }

    // Validate email format
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password length
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    const newUser = await this.userService.createUser(username, email, password);
    
    // Create a sanitized user object without the password
    const sanitizedUser = {
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
      isAdmin: newUser.isAdmin || false
    };
    
    createdResponse(res, sanitizedUser);
  });

  updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Only allow users to access their own data or admins to access any data
    if (req.user?.id !== userId && !req.user?.isAdmin) {
      throw new AuthorizationError('You can only access your own user data');
    }

    // Extract update data from request body
    const { username, email, full_name, avatar } = req.body;
    const updateData = {
      ...(username && { username }),
      ...(email && { email }),
      ...(full_name && { full_name }),
      ...(avatar && { avatar })
    };

    const updatedUser = await this.userService.updateUser(userId, updateData);
    successResponse(res, updatedUser);
  });

  deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Check if the user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Only allow users to delete their own account or admins to delete any account
    if (req.user?.id !== userId && !req.user?.isAdmin) {
      throw new AuthorizationError('You can only delete your own account');
    }

    await this.userService.deleteUser(userId);
    noContentResponse(res);
  });

  changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      throw new ValidationError('User ID, current password, and new password are required');
    }

    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    // Check if the user exists
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify the current password
    const isPasswordValid = await this.userService.validatePassword(user, currentPassword);
    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Update the password
    const updates = { password: newPassword };
    const updated = await this.userService.updateUser(userId, updates);
    if (!updated) {
      throw new DatabaseError('Failed to update password');
    }

    // Return success without sending the user object for security
    successResponse(res, { message: 'Password updated successfully' });
  });

  setAdminStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // This endpoint is only for setting/removing admin privileges
    // Should only be accessible by existing admins
    
    const userId = req.params.id;
    const { isAdmin } = req.body;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    if (typeof isAdmin !== 'boolean') {
      throw new ValidationError('isAdmin must be a boolean value');
    }

    // Only admins can change admin status
    if (!req.user?.isAdmin) {
      throw new AuthorizationError('Only administrators can change admin status');
    }

    // Prevent admins from removing their own admin status
    if (req.user.id === userId && !isAdmin) {
      throw new AuthorizationError('You cannot remove your own admin status');
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updatedUser = await this.userService.setUserAdmin(userId, isAdmin);
    successResponse(res, updatedUser);
  });
} 