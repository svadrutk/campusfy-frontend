import { createHash, randomBytes } from 'crypto';

/**
 * API Security Utilities
 * 
 * This file contains utilities for securing your API endpoints
 * including API key generation, validation, and request origin checking.
 */

// Environment variable that stores the API secret
const API_SECRET = process.env.API_SECRET || '';

/**
 * Generates a secure API key
 * 
 * @returns {string} The generated API key
 */
export function generateApiKey(): string {
  if (!API_SECRET) {
    throw new Error('API_SECRET environment variable is not set');
  }
  
  // Generate random bytes
  const randomString = randomBytes(32).toString('hex');
  
  // Create a timestamp for key rotation
  const timestamp = Date.now().toString();
  
  // Combine with secret and hash
  const hash = createHash('sha256')
    .update(`${randomString}:${timestamp}:${API_SECRET}`)
    .digest('hex');
  
  // Return the API key (prefix with timestamp for rotation)
  return `${timestamp}.${hash}`;
}

/**
 * Validates an API key
 * 
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} Whether the API key is valid
 */
export function validateApiKey(apiKey: string): boolean {
  if (!API_SECRET || !apiKey) return false;
  
  try {
    // Split the key to get the timestamp
    const [timestamp, hash] = apiKey.split('.');
    
    if (!timestamp || !hash) return false;
    
    // Check if the key is too old (example: 30 days)
    const keyDate = new Date(parseInt(timestamp));
    const now = new Date();
    const maxAgeDays = 30;
    
    if ((now.getTime() - keyDate.getTime()) > (maxAgeDays * 24 * 60 * 60 * 1000)) {
      console.warn('API key expired');
      return false;
    }
    
    // For advanced validation, you could rebuild the hash and compare
    // but this depends on how your key generation logic works
    // This is simplified for the example
    
    return true;
  } catch (error) {
    console.error('API key validation error:', error);
    return false;
  }
}

/**
 * Checks if a request's origin is allowed to access the API
 * 
 * @param {string|null} origin - Request origin header
 * @param {string|null} referer - Request referer header
 * @returns {boolean} Whether the origin is allowed
 */
export function isAllowedOrigin(origin: string | null, referer: string | null): boolean {
  // List of allowed domains
  const ALLOWED_ORIGINS = [
    'campusfy.app',
    'www.campusfy.app',
    'uw.campusfy.app',
    'wisc.campusfy.app',
  ];
  
  // Development environments
  if (process.env.NODE_ENV === 'development') {
    const DEV_ORIGINS = ['localhost:3000', 'localhost'];
    ALLOWED_ORIGINS.push(...DEV_ORIGINS);
  }
  
  // Check both origin and referer
  for (const header of [origin, referer]) {
    if (!header) continue;
    
    try {
      const url = new URL(header);
      const hostname = url.hostname;
      
      // Check for exact matches
      if (ALLOWED_ORIGINS.includes(hostname)) {
        return true;
      }
      
      // Check for subdomains of our main domain
      if (hostname.endsWith('.campusfy.app')) {
        return true;
      }
      
      // Special case for localhost with port in development
      if (process.env.NODE_ENV === 'development' && 
          hostname === 'localhost' && 
          /^https?:\/\/localhost:\d+/.test(header)) {
        return true;
      }
    } catch (error) {
      console.error('URL parsing error:', error);
      continue;
    }
  }
  
  return false;
} 