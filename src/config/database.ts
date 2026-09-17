import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get MongoDB URI from environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatnexus';

// Connection options
const options = {
  autoIndex: true, // Build indexes
  maxPoolSize: 10, // Maximum number of sockets
  connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

// Connect to MongoDB
const connectDB = async (): Promise<mongoose.Connection> => {
  try {
    console.log('Connecting to MongoDB...');
    
    // Set up mongoose connection event listeners
    mongoose.connection.on("connected", () => {
      console.log('Connected to MongoDB successfully');
    });

    mongoose.connection.on("error", (err) => {
      console.error('MongoDB connection error:', err);
      // Don't crash the server, just log the error
    });

    mongoose.connection.on("disconnected", () => {
      console.log('MongoDB disconnected');
      // We could implement reconnection logic here if needed
    });

    // Implement reconnection logic
    let retries = 0;
    const maxRetries = 5;
    const retryInterval = 5000; // 5 seconds
    
    const tryConnect = async (): Promise<mongoose.Connection> => {
      try {
        await mongoose.connect(MONGO_URI, options);
        retries = 0; // Reset retry counter on successful connection
        return mongoose.connection;
      } catch (error) {
        retries++;
        console.error(`MongoDB connection attempt ${retries} failed:`, error);
        
        if (retries < maxRetries) {
          console.log(`Retrying connection in ${retryInterval/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryInterval));
          return tryConnect();
        } else {
          console.error(`Failed to connect after ${maxRetries} attempts`);
          // In production, don't throw - this would crash the server
          // Instead, return the connection object which will still be in disconnected state
          // The application should handle this gracefully
          if (process.env.NODE_ENV === 'production') {
            console.error('Running in degraded mode - database unavailable');
            return mongoose.connection;
          } else {
            // In development, we can throw to alert the developer
            throw new Error('Failed to connect to MongoDB');
          }
        }
      }
    };

    return await tryConnect();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // In production, log error but don't crash
    if (process.env.NODE_ENV === 'production') {
      console.error('Database connection failed, continuing in degraded mode');
      return mongoose.connection; // Return connection which will be in disconnected state
    } else {
      // In development, we can throw to alert the developer
      throw error;
    }
  }
};

// Handle process termination cleanly
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

export default connectDB; 