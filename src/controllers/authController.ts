import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/authService";
import { ValidationError, AuthenticationError } from "../utils/errors";
import { successResponse, createdResponse } from "../utils/response";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ValidationError("Missing required fields", {
          missingFields: {
            email: !email,
            password: !password,
          },
        });
      }

      const result = await this.authService.login(email, password);
      successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        throw new ValidationError("Missing required fields", {
          missingFields: {
            username: !username,
            email: !email,
            password: !password,
          },
        });
      }

      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new ValidationError("Invalid email format");
      }

      // Validate password strength
      if (password.length < 8) {
        throw new ValidationError("Password must be at least 8 characters long");
      }

      const result = await this.authService.register(username, email, password);
      createdResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Parse and validate token expiration time
   * @param expire Expiration time in seconds
   * @returns Validated expiration time
   */
  private parseExpiration(expire: any): number {
    const expiresIn = Number(expire);

    if (isNaN(expiresIn)) {
      throw new ValidationError("Token expiration must be a number representing seconds");
    }

    if (expiresIn <= 0) {
      throw new ValidationError("Token expiration must be greater than 0");
    }

    // Maximum expiration time is 30 days (in seconds)
    const MAX_EXPIRATION = 60 * 60 * 24 * 30;
    if (expiresIn > MAX_EXPIRATION) {
      throw new ValidationError(
        `Token expiration cannot exceed 30 days (${MAX_EXPIRATION} seconds)`
      );
    }

    return expiresIn;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
