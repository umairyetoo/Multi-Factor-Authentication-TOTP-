const crypto = require('crypto');
const Base32 = require('../utils/Base32');

/**
 * Service class for TOTP (Time-Based One-Time Password) management.
 * Conforms to RFC 6238 and RFC 4226 standards.
 * Follows SRP by handling only TOTP generation, validation, and URI formatting.
 */
class TotpService {
  /**
   * Generates a random base32 encoded secret key (20 bytes / 160 bits, as recommended by RFC 4226).
   * @returns {string} The base32 encoded secret string.
   */
  generateSecret() {
    // 20 bytes is standard for HMAC-SHA1 secrets
    const buffer = crypto.randomBytes(20);
    return Base32.encode(buffer);
  }

  /**
   * Generates a TOTP code for a given secret at a specific counter.
   * 
   * @param {string} secret - The Base32 encoded secret key.
   * @param {number} counter - The integer counter value (usually Unix time / 30).
   * @returns {string} The 6-digit zero-padded TOTP code.
   */
  generateToken(secret, counter) {
    // Decode base32 secret to buffer
    const secretBuffer = Base32.decode(secret);

    // Create a 8-byte big-endian buffer for the counter
    const counterBuffer = Buffer.alloc(8);
    const high = Math.floor(counter / 0x100000000);
    const low = counter % 0x100000000;
    counterBuffer.writeUInt32BE(high, 0);
    counterBuffer.writeUInt32BE(low, 4);

    // Compute HMAC-SHA1
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const hash = hmac.digest();

    // Dynamic Truncation (RFC 4226 Section 5.4)
    // The last nibble of the SHA-1 hash is used as an offset index (0 to 15)
    const offset = hash[hash.length - 1] & 0xf;

    // Read 4 bytes from hash starting at offset and clear the most significant bit
    const binary = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);

    // Generate a 6-digit code
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  /**
   * Verifies a TOTP code submitted by the user.
   * Compares the code against expected codes within a lookback/lookahead window
   * to handle system clock drift (defaults to +/- 1 step, i.e., 30s).
   * 
   * @param {string} secret - The Base32 encoded secret key.
   * @param {string} token - The 6-digit TOTP token to verify.
   * @param {number} [window=1] - The drift tolerance window in 30-second steps.
   * @returns {boolean} True if the token is valid, false otherwise.
   */
  verify(secret, token, window = 1) {
    if (!token || token.length !== 6 || isNaN(token)) {
      return false;
    }

    // Get current counter step (current Unix time divided by 30 seconds step)
    const currentUnixTime = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(currentUnixTime / 30);

    // Check tokens from (currentCounter - window) to (currentCounter + window)
    for (let i = -window; i <= window; i++) {
      const computedToken = this.generateToken(secret, currentCounter + i);
      
      // Use timing-safe compare or normal equality since tokens are short-lived.
      // But using safe comparison is always good practice.
      if (crypto.timingSafeEqual(Buffer.from(computedToken), Buffer.from(token))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Formats a TOTP standard URI for QR code generators (e.g. Google Authenticator).
   * 
   * @param {string} label - The user identification (e.g., "admin@myapp.com").
   * @param {string} secret - The Base32 encoded secret key.
   * @param {string} issuer - The name of the system (e.g., "MfaDemoApp").
   * @returns {string} The formatted otpauth URI.
   */
  getOtpauthUri(label, secret, issuer) {
    const encodedLabel = encodeURIComponent(label);
    const encodedIssuer = encodeURIComponent(issuer);
    return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
  }
}

module.exports = TotpService;
