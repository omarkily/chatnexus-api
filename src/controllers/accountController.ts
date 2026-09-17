import { Request, Response } from "express";
import { AccountService, AccountCreateData, AccountUpdateData } from "../services/accountService";
import { successResponse, createdResponse, noContentResponse } from "../utils/response";
import asyncHandler from "../utils/asyncHandler";
import { ValidationError, NotFoundError, DatabaseError } from "../utils/errors";
import mongoose from "mongoose";

export class AccountController {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  /**
   * Get all accounts
   */
  getAllAccounts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const accounts = await this.accountService.getAllAccounts();
    successResponse(res, accounts);
  });

  /**
   * Get a specific account by ID
   */
  getAccountById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const accountId = req.params.id;

    if (!accountId) {
      throw new ValidationError("Account ID is required");
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(accountId)) {
      throw new ValidationError("Invalid account ID format");
    }

    const account = await this.accountService.getAccountById(accountId);

    if (!account) {
      throw new NotFoundError("Account not found");
    }

    successResponse(res, account);
  });

  /**
   * Get account by reference ID
   */
  getAccountByReferrenceId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const referrenceId = req.params.referrenceId;

    if (!referrenceId) {
      throw new ValidationError("Reference ID is required");
    }

    const account = await this.accountService.getAccountByReferrenceId(referrenceId);

    if (!account) {
      throw new NotFoundError("Account not found");
    }

    successResponse(res, account);
  });

  /**
   * Create a new account
   */
  createAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, referrenceId, users } = req.body;

    // Validate required fields
    if (!name || !referrenceId) {
      throw new ValidationError(
        "Missing required fields: name and referrenceId are required"
      );
    }

    // Create account data object
    const accountData: AccountCreateData = {
      name,
      referrenceId,
      ...(users && { users })
    };

    const account = await this.accountService.createAccount(accountData);
    createdResponse(res, account);
  });

  /**
   * Update an existing account
   */
  updateAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Account ID comes from params
    const accountId = req.params.id;
    const { name, referrenceId, users } = req.body;

    if (!accountId) {
      throw new ValidationError("Account ID is required");
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(accountId)) {
      throw new ValidationError("Invalid account ID format");
    }

    // Check if at least one field to update is provided
    if (!name && !referrenceId && !users) {
      throw new ValidationError("At least one field to update must be provided");
    }

    // Create update data object
    const updateData: AccountUpdateData = {
      account_id: accountId,
      ...(name && { name }),
      ...(referrenceId && { referrenceId }),
      ...(users && { users })
    };

    const updatedAccount = await this.accountService.updateAccount(updateData);

    if (!updatedAccount) {
      throw new DatabaseError("Failed to update account");
    }

    successResponse(res, updatedAccount);
  });

  /**
   * Delete an account
   */
  deleteAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const accountId = req.params.id;

    if (!accountId) {
      throw new ValidationError("Account ID is required");
    }

    // Validate MongoDB ID format
    if (!mongoose.isValidObjectId(accountId)) {
      throw new ValidationError("Invalid account ID format");
    }

    await this.accountService.deleteAccount(accountId);
    noContentResponse(res);
  });

  /**
   * Add a user to an account
   */
  addUserToAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const accountId = req.params.id;
    const { userId } = req.body;

    if (!accountId) {
      throw new ValidationError("Account ID is required");
    }

    if (!userId) {
      throw new ValidationError("User ID is required");
    }

    // Validate MongoDB ID formats
    if (!mongoose.isValidObjectId(accountId)) {
      throw new ValidationError("Invalid account ID format");
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw new ValidationError("Invalid user ID format");
    }

    const updatedAccount = await this.accountService.addUserToAccount(accountId, userId);

    if (!updatedAccount) {
      throw new DatabaseError("Failed to add user to account");
    }

    successResponse(res, updatedAccount);
  });

  /**
   * Remove a user from an account
   */
  removeUserFromAccount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const accountId = req.params.id;
    const { userId } = req.body;

    if (!accountId) {
      throw new ValidationError("Account ID is required");
    }

    if (!userId) {
      throw new ValidationError("User ID is required");
    }

    // Validate MongoDB ID formats
    if (!mongoose.isValidObjectId(accountId)) {
      throw new ValidationError("Invalid account ID format");
    }

    if (!mongoose.isValidObjectId(userId)) {
      throw new ValidationError("Invalid user ID format");
    }

    const updatedAccount = await this.accountService.removeUserFromAccount(accountId, userId);

    if (!updatedAccount) {
      throw new DatabaseError("Failed to remove user from account");
    }

    successResponse(res, updatedAccount);
  });
} 