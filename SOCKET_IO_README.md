# Socket.IO Implementation

This document outlines the Socket.IO implementation for real-time communication in the ChatNexus backend.

## Overview

Socket.IO enables real-time, bidirectional communication between the backend and frontend clients. This implementation provides:

- User authentication
- Real-time notifications for integration updates
- Rooms for subscriptions to specific events
- Status updates and system notifications

## Socket Configuration

The main Socket.IO configuration is in `src/config/socket.ts`, which:
- Sets up the Socket.IO server
- Defines event constants
- Creates room structures
- Handles authentication
- Manages connections and disconnections

## Key Components

### Socket Service (`src/services/socketService.ts`)

This service provides easy methods to emit Socket.IO events from anywhere in the application. 
Key methods include:

- `emitToUser(userId, event, data)` - Send an event to a specific user
- `emitToIntegration(integrationId, event, data)` - Send an event to all subscribers of an integration
- `emitToAdmins(event, data)` - Send an event to all admin users
- `emitToAll(event, data)` - Broadcast an event to all connected clients
- Helper methods for common notifications

### Integration with Express Server

The Socket.IO server is initialized in `src/index.ts` by:
1. Creating an HTTP server with Express
2. Attaching Socket.IO to this HTTP server
3. Exporting the socket instance for use across the application

### Integration with Business Logic

The Socket.IO implementation is integrated with business logic in:
- `src/services/integrationService.ts` - Emits events when integrations are created, updated, or deleted
- Future services can follow the same pattern

## Events

### Connection Events
- `connect` - When a client connects
- `disconnect` - When a client disconnects
- `reconnect` - When a client reconnects after a disconnection
- `error` - When an error occurs

### Authentication Events
- `authenticate` - When a client attempts to authenticate
- `authenticated` - When authentication is successful
- `unauthenticated` - When authentication fails

### Integration Events
- `integration:created` - When a new integration is created
- `integration:updated` - When an integration is updated
- `integration:deleted` - When an integration is deleted
- `integration:statusChanged` - When an integration's status changes
- `integration:syncStarted` - When synchronization begins
- `integration:syncCompleted` - When synchronization completes
- `integration:syncFailed` - When synchronization fails

### User Events
- `user:updated` - When a user profile is updated
- `user:deleted` - When a user is deleted
- `user:statusChanged` - When a user's status changes

### System Events
- `system:notification` - For system-wide notifications

## Rooms

The implementation uses rooms to organize clients:

- `user:${userId}` - For individual user notifications
- `integration:${integrationId}` - For integration-specific events
- `admin` - For admin-only notifications
- `global` - For system-wide broadcasts

## Authentication Flow

1. Client connects to Socket.IO server
2. Client emits `authenticate` event with JWT token
3. Server verifies token and adds user to appropriate rooms
4. Server emits `authenticated` event with user details
5. Client can now receive events for their user ID and subscribed integrations

## Testing

To check the Socket.IO connection status, make a GET request to:
```
GET /api/socket/info
```

This requires authentication and returns the current status of the Socket.IO server.

## Client Implementation

Frontend clients should:

1. Connect to the Socket.IO server
2. Authenticate using the JWT token
3. Listen for relevant events
4. Handle reconnection logic

Example client connection:
```javascript
const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
});

// Authenticate
socket.emit('authenticate', { token: 'JWT_TOKEN_HERE' });

// Listen for authentication response
socket.on('authenticated', (data) => {
  console.log('Successfully authenticated', data);
  // Now ready to receive events
});

// Listen for events
socket.on('integration:updated', (data) => {
  console.log('Integration updated', data);
  // Update UI accordingly
});
```

## Error Handling

The Socket.IO implementation includes:
- Error handling for failed authentication
- Graceful handling of disconnections
- Connection status monitoring
- Debug logging for troubleshooting 