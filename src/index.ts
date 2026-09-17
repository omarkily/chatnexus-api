import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { Server as HttpServer } from "http";
import connectDB from "./config/database";
import routes from "./routes";
import { errorHandler, handleCorsOptions } from "./middlewares/errorMiddleware";
import mongoose from "mongoose";
import { requestLoggerMiddleware } from "./middlewares/requestLoggerMiddleware";
import SocketConfig from "./config/socket";
import logger from "./utils/logger";

// Load environment variables
dotenv.config();

// Create Express server
const app = express();
const port = process.env.PORT || 3001;

// Create HTTP server
const httpServer = new HttpServer(app);

// Initialize Socket.IO with the HTTP server
let socketIo: SocketConfig;

// Configure CORS origin
let corsOrigin: string | string[];

// Check if CORS_ORIGIN contains multiple origins (comma-separated)
if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.includes(",")) {
  corsOrigin = process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
  logger.info(`CORS configured with multiple origins: ${JSON.stringify(corsOrigin)}`);
} else {
  corsOrigin = process.env.CORS_ORIGIN || "*";
  logger.info(`CORS configured with origin: ${corsOrigin}`);
}

// Configure CORS with dynamic origin validation
const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  maxAge: 86400, // Cache preflight response for 24 hours
};

// Handle OPTIONS requests first
app.use(handleCorsOptions);

// Apply CORS middleware
app.use(cors(corsOptions));

// Special handler for OPTIONS requests to ensure they're always handled properly
app.options("*", cors(corsOptions));

// Disable some Helmet features that can interfere with client requests
app.use(
  helmet({
    contentSecurityPolicy: false, // Can restrict some client resources
    crossOriginEmbedderPolicy: false, // Can prevent loading cross-origin resources
  })
);

// Only use morgan in development
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Enable JSON body parsing with extended options
app.use(
  express.json({
    limit: "10mb",
    strict: false,
  })
);
app.use(express.raw({ type: "application/json" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Apply request logging middleware - this should be before routes but after body parsing
app.use(requestLoggerMiddleware());

// Apply routes
app.use("/api", routes);

// Error handling middleware
app.use(errorHandler);

// Create a variable to hold the server instance so we can close it gracefully if needed
let server: any;

// Connect to MongoDB and start server
// We connect first and then start the server to ensure the database is available
connectDB()
  .then(() => {
    // Start server using httpServer instead of app.listen
    server = httpServer.listen(port, () => {
      logger.info(
        `Server is running on port ${port} in ${process.env.NODE_ENV || "development"} mode`
      );
      
      // Initialize Socket.IO after the server is running
      socketIo = new SocketConfig(httpServer);
      logger.info("Socket.IO has been initialized");
    });

    // Handle server errors
    server.on("error", (error: Error) => {
      logger.error("Server error occurred:", error);
      // Don't exit - just log the error
    });
  })
  .catch((err) => {
    logger.error("Failed to start server due to database connection error:", err);
    // Don't exit - just log the error
  });

// Improved process-level error handling

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: Error | any, promise) => {
  console.error("Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  // Log the stack trace if available
  if (reason instanceof Error) {
    console.error("Stack:", reason.stack);
  }
  // Never exit in production, just log
});

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:");
  console.error(error);
  console.error("Stack:", error.stack);
  // Never exit in production, just log
});

// Handle warnings
process.on("warning", (warning) => {
  console.warn("Warning:", warning.name);
  console.warn("Message:", warning.message);
  console.warn("Stack:", warning.stack);
});

// Graceful shutdown on SIGTERM or SIGINT (Ctrl+C)
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Graceful shutdown initiated...`);

  // Close the server first to stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");

      // Close database connections
      mongoose.connection
        .close(false)
        .then(() => {
          logger.info("MongoDB connection closed");
          logger.info("Graceful shutdown completed");
        })
        .catch((err) => {
          logger.error("Error during MongoDB connection close:", err);
        })
        .finally(() => {
          // Only in development we might want to exit the process
          if (process.env.NODE_ENV !== "production") {
            process.exit(0);
          }
        });
    });
  }
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Export the socketIo instance for use in other parts of the app
export { socketIo };

export default app;
