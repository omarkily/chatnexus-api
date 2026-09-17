// Define available scopes
export const SCOPES = {
  USERS: {
    READ: 'users.read',
    WRITE: 'users.write',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    ALL: 'users.all'
  },
  APPLICATIONS: {
    READ: 'applications.read',
    WRITE: 'applications.write',
    UPDATE: 'applications.update',
    DELETE: 'applications.delete',
    ALL: 'applications.all'
  },
  CHANNELS: {
    READ: 'channels.read',
    WRITE: 'channels.write',
    UPDATE: 'channels.update',
    DELETE: 'channels.delete',
    ALL: 'channels.all'
  }
};

// Define master keys that have full access to all endpoints
// Default to an empty array, will be populated from environment variables
export const MASTER_KEYS: string[] = [];

// Load master keys from environment variable
if (process.env.MASTER_KEYS) {
  try {
    // Split by comma and trim whitespace
    const keys = process.env.MASTER_KEYS.split(',').map(key => key.trim());
    MASTER_KEYS.push(...keys);
  } catch (error) {
    console.error('Error parsing MASTER_KEYS environment variable:', error);
  }
}

// Define scope descriptions
export const SCOPE_DESCRIPTIONS: { [key: string]: string } = {
  'users.read': 'Read user data',
  'users.write': 'Create user data',
  'users.update': 'Update user data',
  'users.delete': 'Delete user data',
  'users.all': 'Full access to user data',
  'applications.read': 'Read application data',
  'applications.write': 'Create applications',
  'applications.update': 'Update applications',
  'applications.delete': 'Delete applications',
  'applications.all': 'Full access to applications',
  'channels.read': 'Read channel data',
  'channels.write': 'Create channels',
  'channels.update': 'Update channels',
  'channels.delete': 'Delete channels',
  'channels.all': 'Full access to channels'
};

// Define scope mappings to scope combinations
export const SCOPE_MAPS: { [key: string]: string[] } = {
  'users.all': ['users.read', 'users.write', 'users.update', 'users.delete'],
  'applications.all': ['applications.read', 'applications.write', 'applications.update', 'applications.delete'],
  'channels.all': ['channels.read', 'channels.write', 'channels.update', 'channels.delete']
}; 