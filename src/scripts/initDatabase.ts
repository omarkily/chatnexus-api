import connectDB from '../config/database';
import User from '../models/User';
import Application from '../models/Application';
import { SCOPES } from '../utils/constants';

const initializeDatabase = async (): Promise<void> => {
  console.log('Initializing MongoDB database...');
  
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Create indexes if needed
    console.log('Ensuring indexes are created...');
    
    // User indexes
    await User.createIndexes();
    
    // Application indexes
    await Application.createIndexes();
    
    console.log('MongoDB database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing MongoDB database:', error);
    process.exit(1);
  } finally {
    // Don't disconnect as we might want to keep connection open for other operations
    console.log('Database setup complete');
  }
};

// Run the initialization
initializeDatabase(); 