import { socketIo } from '../index';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../config/socket';
import logger from '../utils/logger';

/**
 * Service to easily emit socket events from anywhere in the application
 */
class SocketService {
  /**
   * Emits an event to a specific user
   */
  public emitToUser(userId: string, event: string, data: any): void {
    try {
      if (!socketIo) {
        logger.warn('Socket.IO not initialized, skipping emit to user');
        return;
      }
      
      socketIo.emitToUser(userId, event, data);
    } catch (error) {
      logger.error(`Error emitting socket event to user ${userId}:`, error);
    }
  }

  /**
   * Emits an event to a specific integration's room
   */
  public emitToIntegration(integrationId: string, event: string, data: any): void {
    try {
      if (!socketIo) {
        logger.warn('Socket.IO not initialized, skipping emit to integration');
        return;
      }
      
      socketIo.emitToIntegration(integrationId, event, data);
    } catch (error) {
      logger.error(`Error emitting socket event to integration ${integrationId}:`, error);
    }
  }

  /**
   * Emits an event to all admin users
   */
  public emitToAdmins(event: string, data: any): void {
    try {
      if (!socketIo) {
        logger.warn('Socket.IO not initialized, skipping emit to admins');
        return;
      }
      
      socketIo.emitToAdmins(event, data);
    } catch (error) {
      logger.error('Error emitting socket event to admins:', error);
    }
  }

  /**
   * Emits an event to all connected clients
   */
  public emitToAll(event: string, data: any): void {
    try {
      if (!socketIo) {
        logger.warn('Socket.IO not initialized, skipping emit to all');
        return;
      }
      
      socketIo.emitToAll(event, data);
    } catch (error) {
      logger.error('Error emitting socket event to all clients:', error);
    }
  }

  /**
   * Notifies about integration status changes
   */
  public notifyIntegrationStatusChange(integrationId: string, userId: string, status: string): void {
    try {
      // Emit to both the user and the integration room
      this.emitToUser(
        userId, 
        SOCKET_EVENTS.INTEGRATION_STATUS_CHANGED, 
        { integrationId, status }
      );
      
      this.emitToIntegration(
        integrationId, 
        SOCKET_EVENTS.INTEGRATION_STATUS_CHANGED, 
        { integrationId, status }
      );
      
      // Also notify admins
      this.emitToAdmins(
        SOCKET_EVENTS.INTEGRATION_STATUS_CHANGED, 
        { integrationId, userId, status }
      );
    } catch (error) {
      logger.error(`Error notifying integration status change for ${integrationId}:`, error);
    }
  }

  /**
   * Notifies about integration updates
   */
  public notifyIntegrationUpdated(integrationId: string, userId: string, data: any): void {
    try {
      this.emitToUser(
        userId, 
        SOCKET_EVENTS.INTEGRATION_UPDATED, 
        { integrationId, ...data }
      );
      
      this.emitToIntegration(
        integrationId, 
        SOCKET_EVENTS.INTEGRATION_UPDATED, 
        { integrationId, ...data }
      );
    } catch (error) {
      logger.error(`Error notifying integration update for ${integrationId}:`, error);
    }
  }

  /**
   * Notifies about user updates
   */
  public notifyUserUpdated(userId: string, data: any): void {
    try {
      this.emitToUser(userId, SOCKET_EVENTS.USER_UPDATED, data);
    } catch (error) {
      logger.error(`Error notifying user update for ${userId}:`, error);
    }
  }

  /**
   * Sends a system notification to all admins
   */
  public sendSystemNotification(title: string, message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    try {
      this.emitToAdmins(SOCKET_EVENTS.SYSTEM_NOTIFICATION, {
        title,
        message,
        level,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error sending system notification:', error);
    }
  }

  /**
   * Gets the count of connected users
   */
  public getConnectedUsersCount(): number {
    if (!socketIo) {
      return 0;
    }
    
    return socketIo.getConnectedUsersCount();
  }
}

export default new SocketService(); 