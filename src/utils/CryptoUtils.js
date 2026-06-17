const crypto = require('crypto');

/**
 * Utility class for cryptographic operations such as secure password hashing
 * and timing-safe comparisons. Adheres to the Single Responsibility Principle.
 */
class CryptoUtils {
  /**
   * Hashes a plain text password using scrypt.
   * 
   * @param {string} password - Plain text password to hash.
   * @returns {string} The formatted hash string including salt (salt:hash).
   */
  static hashPassword(password) {
    // Generate a secure 16-byte random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password with the salt using scrypt (64-byte key length)
    const derivedKey = crypto.scryptSync(password, salt, 64);
    
    // Return salt and hash combined
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Verifies a plain text password against a stored hash using timing-safe comparison.
   * 
   * @param {string} password - Plain text password input.
   * @param {string} storedHash - Combined stored salt:hash string.
   * @returns {boolean} True if password matches, false otherwise.
   */
  static verifyPassword(password, storedHash) {
    if (!storedHash || !storedHash.includes(':')) {
      return false;
    }

    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    
    // Re-derive the key with the stored salt
    const derivedKey = crypto.scryptSync(password, salt, 64);
    
    // Use timing-safe equality comparison to prevent timing side-channel attacks
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  /**
   * Generates a cryptographically secure random buffer of a given length.
   * Useful for generating high-entropy MFA secret seeds.
   * 
   * @param {number} size - Number of bytes to generate.
   * @returns {Buffer}
   */
  static randomBytes(size) {
    return crypto.randomBytes(size);
  }
}

module.exports = CryptoUtils;
