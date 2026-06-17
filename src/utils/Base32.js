/**
 * Utility class to perform Base32 encoding and decoding conforming to RFC 4648.
 * This class follows the Single Responsibility Principle, focusing purely on 
 * base32 conversion operations without external library dependencies.
 */
class Base32 {
  // Standard RFC 4648 base32 alphabet
  static ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  /**
   * Decodes a Base32 string into a Buffer.
   * Useful for converting base32 secrets into byte arrays for HMAC calculations.
   * 
   * @param {string} input - The Base32 encoded string.
   * @returns {Buffer} The decoded binary data.
   * @throws {Error} If the input contains invalid base32 characters.
   */
  static decode(input) {
    // Standardize input (uppercase, strip padding whitespace or trailing equals)
    const cleaned = input.replace(/\s+/g, '').toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    let index = 0;
    
    // Every 8 characters in Base32 represent 5 bytes (40 bits) of data.
    const output = Buffer.alloc(Math.floor((cleaned.length * 5) / 8));

    for (let i = 0; i < cleaned.length; i++) {
      const idx = this.ALPHABET.indexOf(cleaned[i]);
      if (idx === -1) {
        throw new Error(`Invalid base32 character encountered: ${cleaned[i]}`);
      }

      // Shift existing value left by 5 bits, then add the index value
      value = (value << 5) | idx;
      bits += 5;

      // When we have accumulated 8 bits or more, extract the most significant byte
      if (bits >= 8) {
        output[index++] = (value >>> (bits - 8)) & 255;
        bits -= 8;
      }
    }

    return output;
  }

  /**
   * Encodes a Buffer into a Base32 string.
   * Useful for displaying the secret key to the user in text format.
   * 
   * @param {Buffer} buffer - The binary data to encode.
   * @returns {string} The Base32 encoded string with padding.
   */
  static encode(buffer) {
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      // Shift existing value left by 8 bits, then add the new byte
      value = (value << 8) | buffer[i];
      bits += 8;

      // Extract 5-bit chunks from the value
      while (bits >= 5) {
        output += this.ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    // Process any remaining bits less than 5
    if (bits > 0) {
      output += this.ALPHABET[(value << (5 - bits)) & 31];
    }

    // Add padding '=' to align to 8-character boundaries (RFC 4648)
    while (output.length % 8 !== 0) {
      output += '=';
    }

    return output;
  }
}

module.exports = Base32;
