import {
  decryptData,
  encryptData,
  hashData,
  isEncryptionAvailable,
} from "./encryption";

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
 * Decrypt a GitHub access token from database
 * @param encryptedToken - The encrypted token from database
 * @param privateKey - PEM formatted private key
 */
export function decryptToken(
  encryptedToken: string,
  privateKey: string,
): string {
  if (!encryptedToken) {
    return encryptedToken;
  }

  // Check if token is encrypted
  if (!encryptedToken.startsWith(ENCRYPTED_PREFIX)) {
    // Token is not encrypted, return as-is
    return encryptedToken;
  }

  try {
    const encrypted = encryptedToken.slice(ENCRYPTED_PREFIX.length);
    return decryptData(encrypted, privateKey);
  } catch (error) {
    console.error("Failed to decrypt token:", error);
    throw new Error("Token decryption failed");
  }
}

/**
 * Check if a token is encrypted
 */
export function isTokenEncrypted(token: string): boolean {
  return token?.startsWith(ENCRYPTED_PREFIX) ?? false;
}

/**
 * Create a hash of the token for comparison purposes
 * This allows checking if two tokens are the same without decryption
 */
export function hashToken(token: string): string {
  // If encrypted, we can't hash the original value
  // Return a hash of the encrypted value instead
  if (isTokenEncrypted(token)) {
    return hashData(token);
  }
  return hashData(token);
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

/**
 * Decrypt refresh token
 */
export function decryptRefreshToken(
  encryptedToken: string | null,
  privateKey: string,
): string | null {
  if (!encryptedToken) {
    return null;
  }
  return decryptToken(encryptedToken, privateKey);
}
