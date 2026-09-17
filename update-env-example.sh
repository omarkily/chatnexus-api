#!/bin/bash

cat > .env.example << 'EOL'
# Server configuration
PORT=3001
NODE_ENV=development

# MongoDB connection
MONGO_URI=your_mongodb_connection_string_here

# JWT config
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h

# CORS settings
# For development, allowing specific origin
CORS_ORIGIN=https://chat-nexus-sepia.vercel.app
# For production allowing multiple origins, add to server code:
# const allowedOrigins = process.env.CORS_ORIGIN.split(',');

# Master keys for full API access (comma-separated)
# IMPORTANT: Change these keys for production and keep them secure!
MASTER_KEYS=master-key-1,master-key-2

# Logging
LOG_LEVEL=debug
EOL

echo ".env.example has been updated to include MASTER_KEYS configuration." 