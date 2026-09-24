import { encryptData, isEncryptionAvailable } from "./encryption";

/**
 * Token encryption service for GitHub OAuth tokens
 * Provides secure storage for sensitive credentials
 */

// Prefix to identify encrypted tokens
const ENCRYPTED_PREFIX = "enc:v1:";

/**
 * Encrypt a GitHub access token for database storage
 */
export function encryptToken(token: string): string {
  if (!token) {
    return token;
  }

  // Check if already encrypted
  if (token.startsWith(ENCRYPTED_PREFIX)) {
    return token;
  }

  // If encryption is not available, return token as-is
  // (Not recommended for production)
  if (!isEncryptionAvailable()) {
    console.warn("Encryption not available - storing token unencrypted");
    return token;
  }

  try {
    const encrypted = encryptData(token);
    return ENCRYPTED_PREFIX + encrypted;
  } catch (error) {
    console.error("Failed to encrypt token:", error);
    // Return original token if encryption fails
    // This is a fallback - should be monitored
    return token;
  }
}

/**
 * Encrypt refresh token (same process as access token)
 */
export function encryptRefreshToken(token: string | null): string | null {
  if (!token) {
    return null;
  }
  return encryptToken(token);
}
