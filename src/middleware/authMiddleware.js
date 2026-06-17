const { UnauthorizedError, ForbiddenError } = require('../core/AppError');

/**
 * Middleware functions to protect routes.
 * Adheres to SRP by handling request auth state checks.
 */
class AuthMiddleware {
  /**
   * Ensures the user is fully logged in and has completed MFA (if enabled).
   */
  static requireAuth(req, res, next) {
    // Check if the user ID is in the session
    if (!req.session || !req.session.userId) {
      return next(new UnauthorizedError('Please log in to access this resource.'));
    }

    // Check if they are locked in MFA verification step
    if (req.session.mfaRequired) {
      return next(new ForbiddenError('Multi-factor authentication required. Please verify your OTP.'));
    }

    // Fully authenticated, proceed
    next();
  }

  /**
   * Ensures the user has completed password auth but is currently pending MFA verification.
   */
  static requireMfaVerificationPending(req, res, next) {
    if (!req.session || !req.session.tempUserId || !req.session.mfaRequired) {
      return next(new UnauthorizedError('No authentication session found. Please log in again.'));
    }
    next();
  }
}

module.exports = AuthMiddleware;
