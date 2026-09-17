import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { AuthService } from '../services/authService';
import { IntegrationService } from '../services/integrationService';
import { UserService } from '../services/userService';
import { IIntegration } from '../models/Integration';

/**
 * Room name constants
 */
export const SOCKET_ROOMS = {
  USER: (userId: string) => `user:${userId}`,
  INTEGRATION: (integrationId: string) => `integration:${integrationId}`,
  ADMIN: 'admin',
  GLOBAL: 'global'
};

/**
 * Event name constants
 */
export const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  RECONNECT: 'reconnect',
  ERROR: 'error',
  
  // Authentication events
  AUTHENTICATE: 'authenticate',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
  
  // User events
  USER_UPDATED: 'user:updated',
  USER_DELETED: 'user:deleted',
  USER_STATUS_CHANGED: 'user:statusChanged',
  
  // Integration events
  INTEGRATION_CREATED: 'integration:created',
  INTEGRATION_UPDATED: 'integration:updated',
  INTEGRATION_DELETED: 'integration:deleted',
  INTEGRATION_STATUS_CHANGED: 'integration:statusChanged',
  INTEGRATION_SYNC_STARTED: 'integration:syncStarted',
  INTEGRATION_SYNC_COMPLETED: 'integration:syncCompleted',
  INTEGRATION_SYNC_FAILED: 'integration:syncFailed',
  
  // Admin events
  SYSTEM_NOTIFICATION: 'system:notification'
};

/**
 * Socket.IO configuration and management
 */
export class SocketConfig {
  private io: SocketIOServer<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;
  private connectedUsers: Map<string, string[]> = new Map(); // userId -> socketIds[]
  private authService: AuthService;
  private integrationService: IntegrationService;
  private userService: UserService;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      // Add ping timeout to detect disconnections faster
      pingTimeout: 10000,
      pingInterval: 25000
    });

    // Initialize services
    this.authService = new AuthService();
    this.integrationService = new IntegrationService();
    this.userService = new UserService();

    // Setup event handlers
    this.setupEventHandlers();
    
    logger.info('Socket.IO server initialized');
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on(SOCKET_EVENTS.CONNECT, (socket) => {
      logger.debug(`New socket connection: ${socket.id}`);
      
      // Handle socket disconnection
      socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        this.handleDisconnect(socket);
      });
      
      // Handle authentication
      socket.on(SOCKET_EVENTS.AUTHENTICATE, async (data: { token: string }) => {
        await this.handleAuthentication(socket, data.token);
      });
      
      // Send acknowledgment of connection
      socket.emit('connection:established', { socketId: socket.id });
    });
  }

  /**
   * Handle socket authentication
   */
  private async handleAuthentication(socket: any, token: string): Promise<void> {
    try {
      if (!token) {
        socket.emit(SOCKET_EVENTS.UNAUTHENTICATED, { error: 'No token provided' });
        return;
      }

      // Verify JWT token
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const userId = decoded.id;

      // Add user ID to socket data
      socket.data.userId = userId;
      
      // Join user room
      socket.join(SOCKET_ROOMS.USER(userId));
      
      // Track connected user
      if (this.connectedUsers.has(userId)) {
        this.connectedUsers.get(userId)?.push(socket.id);
      } else {
        this.connectedUsers.set(userId, [socket.id]);
      }
      
      // Check user role and join appropriate rooms
      const user = await this.userService.getUserById(userId);
      if (user && user.isAdmin) {
        socket.join(SOCKET_ROOMS.ADMIN);
      }

      // Get user's integrations and join those rooms
      const integrations = await this.integrationService.getIntegrationsByUserId(userId);
      integrations.forEach((integration: IIntegration) => {
        const integrationId = integration._id ? integration._id.toString() : '';
        if (integrationId) {
          socket.join(SOCKET_ROOMS.INTEGRATION(integrationId));
        }
      });
      
      // Emit authenticated event
      socket.emit(SOCKET_EVENTS.AUTHENTICATED, { 
        userId,
        socketId: socket.id 
      });
      
      logger.debug(`Socket ${socket.id} authenticated for user ${userId}`);
    } catch (error) {
      logger.error('Authentication error', error);
      socket.emit(SOCKET_EVENTS.UNAUTHENTICATED, { 
        error: 'Authentication failed' 
      });
    }
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socket: any): void {
    const userId = socket.data.userId;
    if (userId) {
      // Remove socket ID from user's connected sockets
      const userSockets = this.connectedUsers.get(userId) || [];
      const updatedSockets = userSockets.filter(id => id !== socket.id);
      
      if (updatedSockets.length > 0) {
        this.connectedUsers.set(userId, updatedSockets);
      } else {
        // If no more sockets, remove user from connected users
        this.connectedUsers.delete(userId);
      }
    }
    
    logger.debug(`Socket disconnected: ${socket.id}`);
  }

  /**
   * Emit event to a specific room
   */
  public emitToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
    logger.debug(`Emitted ${event} to room ${room}`, data);
  }

  /**
   * Emit event to a specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    this.emitToRoom(SOCKET_ROOMS.USER(userId), event, data);
  }

  /**
   * Emit event to a specific integration's subscribers
   */
  public emitToIntegration(integrationId: string, event: string, data: any): void {
    this.emitToRoom(SOCKET_ROOMS.INTEGRATION(integrationId), event, data);
  }

  /**
   * Emit event to all admin users
   */
  public emitToAdmins(event: string, data: any): void {
    this.emitToRoom(SOCKET_ROOMS.ADMIN, event, data);
  }

  /**
   * Emit event to all connected clients
   */
  public emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
    logger.debug(`Emitted ${event} to all connected clients`, data);
  }

  /**
   * Get the number of connected users
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get the Socket.IO server instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

export default SocketConfig; 