import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Generate a secure random master key
 */
function generateMasterKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Update the .env file with a new master key
 */
async function updateEnvFile(masterKey: string): Promise<void> {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    
    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      console.error('Error: .env file not found. Please create one first.');
      process.exit(1);
    }
    
    // Read current .env content
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Check if MASTER_KEYS already exists
    if (envContent.includes('MASTER_KEYS=')) {
      // Update existing MASTER_KEYS
      const currentKeys = process.env.MASTER_KEYS || '';
      const keysArray = currentKeys.split(',').map(key => key.trim()).filter(key => key);
      
      // Add new key if it doesn't already exist
      if (!keysArray.includes(masterKey)) {
        keysArray.push(masterKey);
      }
      
      // Replace the MASTER_KEYS line
      envContent = envContent.replace(
        /MASTER_KEYS=.*/,
        `MASTER_KEYS=${keysArray.join(',')}`
      );
    } else {
      // Add MASTER_KEYS line if it doesn't exist
      envContent += `\n\n# Master keys for full API access\nMASTER_KEYS=${masterKey}\n`;
    }
    
    // Write updated content back to .env
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('Master key added successfully to .env file!');
  } catch (error) {
    console.error('Error updating .env file:', error);
    process.exit(1);
  }
}

/**
 * Main function to generate and add a master key
 */
async function main() {
  console.log('Generating a secure master key...');
  const masterKey = generateMasterKey();
  console.log(`Generated master key: ${masterKey}`);
  
  await updateEnvFile(masterKey);
  
  console.log('\nYou can now use this key for full API access with either:');
  console.log(`  - Bearer token: Authorization: Bearer ${masterKey}`);
  console.log(`  - API key: Authorization: ApiKey ${masterKey}`);
  console.log('\nKEEP THIS KEY SECURE! It provides full access to your API.');
}

// Run the script
main().catch(console.error); 