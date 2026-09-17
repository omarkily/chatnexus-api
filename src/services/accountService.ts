import Account, { IAccount } from "../models/Account";
import User, { IUser } from "../models/User";
import { ValidationError, NotFoundError, ConflictError, DatabaseError } from "../utils/errors";
import mongoose, { Document } from "mongoose";
import logger from "../utils/logger";

export interface AccountCreateData {
  name: string;
  referrenceId: string;
  users?: string[];
}

export interface AccountUpdateData {
  account_id: string;
  name?: string;
  referrenceId?: string;
  users?: string[];
}

export class AccountService {
  /**
   * Get all accounts
   * @returns Array of all accounts
   */
  async getAllAccounts(): Promise<IAccount[]> {
    try {
      return await Account.find().sort({ created_at: -1 });
    } catch (error: any) {
      throw new DatabaseError("Failed to fetch accounts", error);
    }
  }

  /**
   * Get a specific account by ID
   * @param accountId Account ID to fetch
   * @returns Account object or null if not found
   */
  async getAccountById(accountId: string): Promise<IAccount | null> {
    try {
      // Validate if accountId is a valid ObjectId
      if (!mongoose.isValidObjectId(accountId)) {
        throw new ValidationError("Invalid account ID format");
      }

      return await Account.findById(accountId);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to fetch account", error);
    }
  }

  /**
   * Get account by reference ID
   * @param referrenceId The reference ID to search for
   * @returns Account object or null if not found
   */
  async getAccountByReferrenceId(referrenceId: string): Promise<IAccount | null> {
    try {
      if (!referrenceId) {
        throw new ValidationError("Reference ID is required");
      }

      return await Account.findOne({ referrenceId });
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError("Failed to fetch account by reference ID", error);
    }
  }

  /**
   * Create a new account
   * @param accountData Account data
   * @returns Created account
   */
  async createAccount(accountData: AccountCreateData): Promise<IAccount> {
    try {
      const { name, referrenceId, users = [] } = accountData;

      // Validate required fields
      if (!name) {
        throw new ValidationError("Account name is required");
      }

      if (!referrenceId) {
        throw new ValidationError("Reference ID is required");
      }

      // Check if account with this reference ID already exists
      const existingAccount = await Account.findOne({ referrenceId });
      if (existingAccount) {
        throw new ConflictError("Account with this reference ID already exists");
      }

      // Validate user IDs if provided
      if (users && users.length > 0) {
        for (const userId of users) {
          if (!mongoose.isValidObjectId(userId)) {
            throw new ValidationError(`Invalid user ID format: ${userId}`);
          }

          const user = await User.findById(userId);
          if (!user) {
            throw new NotFoundError(`User not found with ID: ${userId}`);
          }
        }
      }

      // Create new account
      const account = new Account({
        name,
        referrenceId,
        users
      });

      return await account.save();
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
        throw new ConflictError("Account with this reference ID already exists");
      }

      throw new DatabaseError("Failed to create account", error);
    }
  }

  /**
   * Update an existing account
   * @param updateData Data to update the account with
   * @returns Updated account
   */
  async updateAccount(updateData: AccountUpdateData): Promise<IAccount | null> {
    try {
      const { account_id, name, referrenceId, users } = updateData;

      // Validate if account_id is a valid ObjectId
      if (!mongoose.isValidObjectId(account_id)) {
        throw new ValidationError("Invalid account ID format");
      }

      // Check if account exists
      const existingAccount = await Account.findById(account_id);
      if (!existingAccount) {
        throw new NotFoundError("Account not found");
      }

      // Create a new object with all updates
      const updatedFields: {
        name?: string;
        referrenceId?: string;
        users?: string[];
        updated_at: Date;
      } = { updated_at: new Date() };

      if (name) {
        updatedFields.name = name;
      }

      if (referrenceId) {
        // Check if another account already has this reference ID
        const accountWithReferrenceId = await Account.findOne({ 
          referrenceId, 
          _id: { $ne: account_id } 
        });
        
        if (accountWithReferrenceId) {
          throw new ConflictError("Another account with this reference ID already exists");
        }
        
        updatedFields.referrenceId = referrenceId;
      }

      if (users) {
        // Validate user IDs
        for (const userId of users) {
          if (!mongoose.isValidObjectId(userId)) {
            throw new ValidationError(`Invalid user ID format: ${userId}`);
          }

          const user = await User.findById(userId);
          if (!user) {
            throw new NotFoundError(`User not found with ID: ${userId}`);
          }
        }
        
        updatedFields.users = users;
      }

      // Update the account
      return await Account.findByIdAndUpdate(
        account_id,
        { $set: updatedFields },
        { new: true }
      );
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }

      if (error.code === 11000) {
        // MongoDB duplicate key error
        throw new ConflictError("Account with these details already exists");
      }

      throw new DatabaseError("Failed to update account", error);
    }
  }

  /**
   * Delete an account
   * @param accountId ID of the account to delete
   */
  async deleteAccount(accountId: string): Promise<void> {
    try {
      // Validate if accountId is a valid ObjectId
      if (!mongoose.isValidObjectId(accountId)) {
        throw new ValidationError("Invalid account ID format");
      }

      // Check if account exists
      const existingAccount = await Account.findById(accountId);
      if (!existingAccount) {
        throw new NotFoundError("Account not found");
      }

      // Delete the account
      await Account.findByIdAndDelete(accountId);
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to delete account", error);
    }
  }

  /**
   * Add a user to an account
   * @param accountId Account ID to add the user to
   * @param userId User ID to add
   * @returns Updated account
   */
  async addUserToAccount(accountId: string, userId: string): Promise<IAccount | null> {
    try {
      // Validate IDs
      if (!mongoose.isValidObjectId(accountId)) {
        throw new ValidationError("Invalid account ID format");
      }

      if (!mongoose.isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID format");
      }

      // Check if account exists
      const account = await Account.findById(accountId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Check if user is already in the account
      if (account.users.includes(userId as any)) {
        // User already in account, no need to update
        return account;
      }

      // Add user to account
      return await Account.findByIdAndUpdate(
        accountId,
        { 
          $addToSet: { users: userId },
          updated_at: new Date()
        },
        { new: true }
      );
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to add user to account", error);
    }
  }

  /**
   * Remove a user from an account
   * @param accountId Account ID to remove the user from
   * @param userId User ID to remove
   * @returns Updated account
   */
  async removeUserFromAccount(accountId: string, userId: string): Promise<IAccount | null> {
    try {
      // Validate IDs
      if (!mongoose.isValidObjectId(accountId)) {
        throw new ValidationError("Invalid account ID format");
      }

      if (!mongoose.isValidObjectId(userId)) {
        throw new ValidationError("Invalid user ID format");
      }

      // Check if account exists
      const account = await Account.findById(accountId);
      if (!account) {
        throw new NotFoundError("Account not found");
      }

      // Check if user exists in the account
      if (!account.users.includes(userId as any)) {
        // User not in account, no need to update
        return account;
      }

      // Remove user from account
      return await Account.findByIdAndUpdate(
        accountId,
        { 
          $pull: { users: userId },
          updated_at: new Date()
        },
        { new: true }
      );
    } catch (error: any) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError("Failed to remove user from account", error);
    }
  }
} 