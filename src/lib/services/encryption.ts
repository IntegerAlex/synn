import crypto from 'crypto';

/**
 * Encryption service using RSA public/private key pairs
 * Uses hybrid encryption: RSA for key exchange, AES for data
 */

// Embedded public key (public keys are safe to include in application code)
const EMBEDDED_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAnv8YfXH5qOKrj1YyhYqm
nsj7ZKVAXksQxKigYMaNnam77rP8PoXfIFsvirissRjKgh3aiKWqnwL1wLkPTz7C
M9w6fMVV8QvWtC14GpN1BLklJRWPrcTDDVY5QXiBZ1t0ixynIWQkZ0/30ocLqwox
2fRVntb43SDAahUpFPVXV2dycg55z5Wli5wguoFZcKEe9yH0ftDg3C6pR9t8RFTX
2blm2rFthtrORa4bBsIKj9ng8Ef7kpgwFIFTWKB+1LjFzSlCZmUvNDlL2AkOcX4z
+vMbdk5fQl0DDP+yQs26IZbSuuFqUYivqnAa+mD225dq5l+up3fWZtpYeeZbIw0J
rOKpw0E/DTPBa9XjO9oMN5CleY+xplegBKvb5GgeoIxuCuA0iGBJuwQrOxPjbJDr
buLQuvwNvU2H7ijYipgaqjAeQlPlcT/S1u7jEAVvV9r10g5pP3C7aDiZo4frC5/R
Jq8scXQuXmmtOXDd5nfJN5ha0iB3JQu7sQJ7NMA7BkgzgwuA1vBNsDFhlL+ChAxQ
n5ICzoLe864ZGXNORKxymeZRyM5DjOWo5DOJEgI9ESwdhlKa8HveuXedCUB6d3rJ
NfRpihQZjTl3O+SqONKFEP49kavxrM2u/uZc+o6sm5v8Yv+dMblk7vvTTG7CgnfU
UwUuBVTrqO/g0kMqgRO5kBECAwEAAQ==
-----END PUBLIC KEY-----`;

/**
 * Load public key (embedded in application code)
 */
function loadPublicKey(): string {
  return EMBEDDED_PUBLIC_KEY;
}

/**
 * Generate a random AES key for symmetric encryption
 */
function generateAESKey(): Buffer {
  return crypto.randomBytes(32); // 256-bit key
}

/**
 * Generate a random IV for AES encryption
 */
function generateIV(): Buffer {
  return crypto.randomBytes(16); // 128-bit IV
}

/**
 * Encrypt data using hybrid encryption (RSA + AES)
 * - Generate random AES key
 * - Encrypt data with AES
 * - Encrypt AES key with RSA public key
 * - Return combined encrypted package
 */
export function encryptData(data: string): string {
  try {
    const publicKey = loadPublicKey();
    
    // Generate AES key and IV
    const aesKey = generateAESKey();
    const iv = generateIV();
    
    // Encrypt data with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
    let encryptedData = cipher.update(data, 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    
    // Encrypt AES key with RSA public key
    const encryptedKey = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      aesKey
    );
    
    // Package everything together
    const package_ = {
      v: 1, // Version for future compatibility
      key: encryptedKey.toString('base64'),
      iv: iv.toString('base64'),
      tag: authTag.toString('base64'),
      data: encryptedData,
    };
    
    return Buffer.from(JSON.stringify(package_)).toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using private key (provided at runtime)
 * @param encryptedPackage - Base64 encoded encrypted package
 * @param privateKeyPem - PEM formatted private key
 */
export function decryptData(encryptedPackage: string, privateKeyPem: string): string {
  try {
    // Parse the package
    const package_ = JSON.parse(Buffer.from(encryptedPackage, 'base64').toString('utf8'));
    
    if (package_.v !== 1) {
      throw new Error('Unsupported encryption version');
    }
    
    // Decrypt AES key with RSA private key
    const encryptedKey = Buffer.from(package_.key, 'base64');
    const aesKey = crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      encryptedKey
    );
    
    // Decrypt data with AES
    const iv = Buffer.from(package_.iv, 'base64');
    const authTag = Buffer.from(package_.tag, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(authTag);
    
    let decryptedData = decipher.update(package_.data, 'base64', 'utf8');
    decryptedData += decipher.final('utf8');
    
    return decryptedData;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Invalid key or corrupted data.');
  }
}

/**
 * Encrypt sensitive fields in an object
 * Only encrypts string values, leaves other types unchanged
 */
export function encryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...data };
  
  for (const field of fieldsToEncrypt) {
    if (typeof result[field] === 'string' && result[field]) {
      (result as any)[field] = encryptData(result[field]);
    } else if (typeof result[field] === 'object' && result[field] !== null) {
      (result as any)[field] = encryptData(JSON.stringify(result[field]));
    }
  }
  
  return result;
}

/**
 * Decrypt sensitive fields in an object
 */
export function decryptSensitiveFields<T extends Record<string, any>>(
  data: T,
  fieldsToDecrypt: (keyof T)[],
  privateKeyPem: string
): T {
  const result = { ...data };
  
  for (const field of fieldsToDecrypt) {
    if (typeof result[field] === 'string' && result[field]) {
      try {
        const decrypted = decryptData(result[field], privateKeyPem);
        // Try to parse as JSON, otherwise keep as string
        try {
          (result as any)[field] = JSON.parse(decrypted);
        } catch {
          (result as any)[field] = decrypted;
        }
      } catch (error) {
        // Field might not be encrypted, leave as is
        console.warn(`Failed to decrypt field ${String(field)}:`, error);
      }
    }
  }
  
  return result;
}

/**
 * Check if public key is available
 * Always returns true since the key is embedded in the code
 */
export function isEncryptionAvailable(): boolean {
  return true;
}

/**
 * Simple hash function for non-reversible data (like tokens for comparison)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

