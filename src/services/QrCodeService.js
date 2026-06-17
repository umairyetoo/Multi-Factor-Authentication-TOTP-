const QRCode = require('qrcode');

/**
 * Service class for QR Code generation.
 * Follows SRP by handling only QR generation tasks.
 */
class QrCodeService {
  /**
   * Generates a base64 Data URL containing the QR code image for a given text.
   * 
   * @param {string} text - The input text (e.g., TOTP otpauth:// URI).
   * @returns {Promise<string>} Data URL of the generated QR code.
   */
  async toDataURL(text) {
    try {
      return await QRCode.toDataURL(text);
    } catch (err) {
      throw new Error(`Failed to generate QR Code data URL: ${err.message}`);
    }
  }
}

module.exports = QrCodeService;
