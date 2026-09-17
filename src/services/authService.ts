import jwt from "jsonwebtoken";
import { UserService } from "./userService";
import { AuthenticationError, ValidationError, DatabaseError } from "../utils/errors";
import { IUser } from "../models/User";
import mongoose from "mongoose";

export class AuthService {
  private userService: UserService;
  private readonly JWT_SECRET: string;
  private readonly DEFAULT_EXPIRATION = "24h"; // 24 hours default

  constructor() {
    this.userService = new UserService();
    this.JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
  }

  async login(email: string, password: string): Promise<{ token: string; user: Partial<IUser> }> {
    try {
      // Find user by email
      const user = await this.userService.getUserByEmail(email);
      if (!user) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Validate password
      const isPasswordValid = await this.userService.validatePassword(user, password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Generate token
      const token = this.generateToken(user);

      // Return token and user info (without password)
      const { password: _, ...userWithoutPassword } = user.toObject();
      return { token, user: userWithoutPassword };
    } catch (error: any) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new DatabaseError('Login failed', error);
    }
  }

  async register(username: string, email: string, password: string): Promise<{ token: string; user: Partial<IUser> }> {
    try {
      // Create new user
      const user = await this.userService.createUser(username, email, password);

      // Generate token
      const token = this.generateToken(user);

      // Return token and user info (without password)
      const { password: _, ...userWithoutPassword } = user.toObject();
      return { token, user: userWithoutPassword };
    } catch (error: any) {
      throw error; // Let the error middleware handle specific error types
    }
  }

  /**
   * Generate a JWT token for a user
   * @param user User object
   * @param expiresIn Optional expiration time in seconds
   * @returns JWT token string
   */
  private generateToken(user: IUser, expiresIn?: number): string {
    // Create sign options with the default expiration
    const options: jwt.SignOptions = {};

    // If custom expiration is provided in seconds, validate and use it
    if (expiresIn !== undefined) {
      if (expiresIn <= 0) {
        throw new ValidationError("Token expiration time must be greater than 0");
      }
      // Maximum expiration 30 days
      if (expiresIn > 60 * 60 * 24 * 30) {
        throw new ValidationError("Token expiration time cannot exceed 30 days");
      }
      options.expiresIn = expiresIn;
    } else {
      // Use default expiration (24h)
      options.expiresIn = this.DEFAULT_EXPIRATION;
    }

    // The _id property comes from mongoose Document type which IUser extends
    const userId = (user as any)._id.toString();

    return jwt.sign(
      {
        id: userId,
        email: user.email,
        isAdmin: user.isAdmin || false,
      },
      this.JWT_SECRET,
      options
    );
  }
}
