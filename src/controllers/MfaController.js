const InMemoryUserRepository = require('../repositories/InMemoryUserRepository');
const TotpService = require('../services/TotpService');
const QrCodeService = require('../services/QrCodeService');
const AuthService = require('../services/AuthService');
const { BadRequestError } = require('../core/AppError');

// Instantiate services and inject dependencies
const totpService = new TotpService();
const qrCodeService = new QrCodeService();
const authService = new AuthService(InMemoryUserRepository, totpService);

/**
 * Controller handling Multi-Factor Authentication setup, validation, and verification.
 * Follows SRP by focusing purely on MFA HTTP routes and coordinate with services.
 */
class MfaController {
  constructor(
    authServiceInstance = authService,
    qrCodeServiceInstance = qrCodeService
  ) {
    this.authService = authServiceInstance;
    this.qrCodeService = qrCodeServiceInstance;
  }

  /**
   * Initiates the setup of MFA. Generates a new secret, formats the otpauth URI, 
   * generates a QR code, and saves the secret temporarily in the user session.
   */
  setupMfa = async (req, res, next) => {
    try {
      const userId = req.session.userId;
      
      // Generate temp secret and URI
      const issuer = process.env.MFA_ISSUER || 'MfaDemoApp';
      const { secret, otpauthUri } = await this.authService.initiateMfaSetup(userId, issuer);

      // Generate QR data URL from URI
      const qrCodeDataUrl = await this.qrCodeService.toDataURL(otpauthUri);

      // Save secret temporarily in session so it is only finalized upon code verification
      req.session.tempMfaSecret = secret;

      return res.status(200).json({
        status: 'success',
        message: 'MFA setup initiated. Scan the QR code to connect your authenticator.',
        data: {
          qrCode: qrCodeDataUrl,
          secret: secret
        }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Confirms the setup of MFA by verifying the first code from the authenticator.
   * If code is correct, the secret is permanently persisted to the user object.
   */
  confirmMfa = async (req, res, next) => {
    try {
      const userId = req.session.userId;
      const { code } = req.body;
      const tempSecret = req.session.tempMfaSecret;

      if (!tempSecret) {
        throw new BadRequestError('MFA setup session expired or not initiated. Please toggle MFA off and on again.');
      }

      if (!code) {
        throw new BadRequestError('Verification code from authenticator app is required.');
      }

      // Verify and persist
      const user = await this.authService.confirmMfaSetup(userId, tempSecret, code);

      // Clear the temporary session secret
      delete req.session.tempMfaSecret;

      return res.status(200).json({
        status: 'success',
        message: 'MFA has been successfully verified and enabled.',
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Disables MFA for the user. Requires a valid code from the authenticator for security.
   */
  disableMfa = async (req, res, next) => {
    try {
      const userId = req.session.userId;
      const { code } = req.body;

      if (!code) {
        throw new BadRequestError('Verification code from authenticator app is required to disable MFA.');
      }

      const user = await this.authService.disableMfa(userId, code);

      return res.status(200).json({
        status: 'success',
        message: 'MFA has been successfully disabled.',
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Verifies the TOTP code submitted during the login phase (Phase 2).
   * Upgrades the session from temporary status to fully authenticated.
   */
  verifyLoginMfa = async (req, res, next) => {
    try {
      const tempUserId = req.session.tempUserId;
      const { code } = req.body;

      if (!code) {
        throw new BadRequestError('MFA verification code is required.');
      }

      // Verify the code
      const isValid = await this.authService.verifyMfaToken(tempUserId, code);
      if (!isValid) {
        throw new BadRequestError('Invalid verification code. Please try again.');
      }

      // Code is valid! Upgrade session status
      req.session.userId = tempUserId;
      req.session.mfaRequired = false;
      
      // Cleanup temporary session data
      delete req.session.tempUserId;

      return res.status(200).json({
        status: 'success',
        message: 'MFA verification successful. Access granted.',
        data: {
          authenticated: true
        }
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new MfaController();
