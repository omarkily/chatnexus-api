import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ApplicationService } from "../services/applicationService";
import { SCOPES, SCOPE_MAPS, MASTER_KEYS } from "../utils/constants";
import { AuthenticationError, AuthorizationError, ValidationError } from "../utils/errors";
import mongoose from "mongoose";

dotenv.config();

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username?: string;
        isAdmin?: boolean;
      };
      token?: {
        id: string;
        scopes: string[];
      };
      application?: {
        id: string;
        user_id: string;
        scopes: string[];
      };
      isMasterKeyAuth?: boolean;
    }
  }
}

/**
 * Check if the token is a master key
 * @param token The token to check
 * @returns Boolean indicating if the token is a master key
 */
const isMasterKey = (token: string): boolean => {
  return MASTER_KEYS.includes(token);
};

/**
 * Authenticate a request using either JWT or API key
 */
export const authenticate = (applicationService: ApplicationService) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new AuthenticationError("Authentication credentials are required");
      }

      const [type, token] = authHeader.split(" ");

      if (!token) {
        throw new AuthenticationError("Invalid authorization format");
      }

      // Check if the token is a master key
      if (isMasterKey(token)) {
        // Set flag to indicate this is a master key authentication
        req.isMasterKeyAuth = true;
        
        // Set user info with admin privileges
        req.user = {
          id: 'master',
          email: 'master@admin.com',
          isAdmin: true
        };
        
        // Add all possible scopes
        const allScopes = Object.values(SCOPES)
          .flatMap(scopeGroup => Object.values(scopeGroup));

        req.application = {
          id: 'master',
          user_id: 'master',
          scopes: allScopes
        };
        
        next();
        return;
      }

      if (type === "Bearer") {
        // Handle JWT authentication
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as {
            id: string;
            email: string;
            isAdmin?: boolean;
          };
          
          // Validate that the id is a valid MongoDB ObjectId before proceeding
          if (!mongoose.isValidObjectId(decoded.id)) {
            throw new ValidationError('Invalid user ID format in token');
          }
          
          req.user = decoded;
          next();
        } catch (error: any) {
          if (error.name === "TokenExpiredError") {
            throw new AuthenticationError("Token has expired");
          } else if (error instanceof ValidationError) {
            throw error;
          } else {
            throw new AuthenticationError("Invalid token");
          }
        }
      } else if (type === "ApiKey") {
        // Handle API key authentication
        const application = await applicationService.getApplicationByApiKey(token);

        if (!application) {
          throw new AuthenticationError("Invalid API key");
        }

        if (application.status !== "active") {
          throw new AuthenticationError("Application is inactive");
        }

        // Update last used timestamp
        await applicationService.updateLastUsed(token);

        // Expand any wildcard scopes (e.g., "users.all" to individual scopes)
        let expandedScopes = application.scopes;
        expandedScopes = expandWildcardScopes(expandedScopes);

        // Add application info to request
        req.application = {
          id: (application as any)._id.toString(),
          user_id: application.user_id.toString(),
          scopes: expandedScopes,
        };

        // Set user info from application
        req.user = {
          id: application.user_id.toString(),
          email: "", // We don't have the email in the application context
        };

        next();
      } else {
        throw new AuthenticationError("Invalid authorization type, expected Bearer or ApiKey");
      }
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require specific scope to access a route
 * Must be used after authenticate middleware
 */
export const requireScope = (requiredScopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // If using master key authentication, bypass scope checks
      if (req.isMasterKeyAuth) {
        next();
        return;
      }
      
      // If no application in request, we're using JWT authentication
      // which doesn't have scope restrictions
      if (!req.application) {
        next();
        return;
      }

      // Check if the application has all required scopes
      const hasRequiredScopes = requiredScopes.every(scope => 
        req.application?.scopes.includes(scope)
      );

      if (!hasRequiredScopes) {
        const missingScopes = requiredScopes.filter(scope => 
          !req.application?.scopes.includes(scope)
        );
        
        const error = new AuthorizationError("Insufficient permissions");
        error.details = {
          requiredScopes,
          availableScopes: req.application?.scopes,
          missingScopes
        };
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require admin privileges to access a route
 * Must be used after authenticate middleware
 */
export const requireAdmin = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // If using master key authentication, bypass admin checks
      if (req.isMasterKeyAuth) {
        next();
        return;
      }
      
      if (!req.user) {
        throw new AuthenticationError("Authentication required");
      }

      if (!req.user.isAdmin) {
        throw new AuthorizationError("Admin privileges required");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Expand wildcard scopes using the scope maps
 */
function expandWildcardScopes(scopes: string[]): string[] {
  const expandedScopes = new Set<string>();
  
  for (const scope of scopes) {
    expandedScopes.add(scope);
    
    // Add individual scopes if this is a wildcard scope
    if (SCOPE_MAPS[scope]) {
      SCOPE_MAPS[scope].forEach(s => expandedScopes.add(s));
    }
  }
  
  return Array.from(expandedScopes);
}
