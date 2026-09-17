import { Router, Request, Response } from "express";
import userRoutes from "./userRoutes";
import authRoutes from "./authRoutes";
import applicationRoutes from "./applicationRoutes";
import integrationRoutes from "./integrationRoutes";
import accountRoutes from "./accountRoutes";
import requestLogRoutes from "./requestLogRoutes";
import channelRoutes from "./channelRoutes";
import { authenticate } from "../middlewares/authMiddleware";
import { ApplicationService } from "../services/applicationService";
import { socketIo } from "../index";

const router = Router();
const applicationService = new ApplicationService();

// Handle preflight OPTIONS requests for all routes
router.options('*', (req, res) => {
  // Send 204 status with CORS headers set by our global middleware
  res.status(204).end();
});

// Test CORS endpoint
router.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS is working!',
    headers: req.headers,
    origin: req.get('origin') || 'No origin',
    time: new Date().toISOString()
  });
});

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "API is working correctly" });
});

// Mount auth routes without authentication
router.use("/auth", authRoutes);

// Mount protected routes with authentication
router.use("/users", authenticate(applicationService), userRoutes);
router.use("/applications", authenticate(applicationService), applicationRoutes);
router.use("/channels", channelRoutes);

// Mount integration routes (authentication is handled inside the integration routes)
router.use("/integrations", integrationRoutes);

// Mount account routes (authentication is handled inside the account routes)
router.use("/accounts", accountRoutes);

// Mount request log routes (authentication is handled inside the routes)
router.use("/logs", requestLogRoutes);

// Add Socket.IO info endpoint
router.get('/socket/info', authenticate, (req: Request, res: Response) => {
  if (!socketIo) {
    return res.status(503).json({
      status: 'error',
      message: 'Socket.IO server not initialized'
    });
  }
  
  const connectedUsers = socketIo.getConnectedUsersCount();
  
  return res.status(200).json({
    status: 'success',
    data: {
      initialized: true,
      connectedUsers,
      socketServer: 'active'
    }
  });
});

// Add a catch-all route for unknown endpoints
router.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.originalUrl}`,
      status: 404
    }
  });
});

export default router;
