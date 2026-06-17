const { userRepository } = require('../repositories');
const TotpService = require('../services/TotpService');
const AuthService = require('../services/AuthService');

// Instantiate services and inject the persistent JSON-file repository
const totpService = new TotpService();
const authService = new AuthService(userRepository, totpService);

/**
 * Controller handling standard Authentication endpoints.
 * Follows SRP by handling HTTP parsing and response mapping for Auth events.
 */
class AuthController {
  constructor(authServiceInstance = authService) {
    this.authService = authServiceInstance;
  }

  /**
   * Register endpoint.
   */
  signup = async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const user = await this.authService.register(username, password);
      
      // Auto login user after successful signup
      req.session.userId = user.id;
      req.session.mfaRequired = false;

      return res.status(201).json({
        status: 'success',
        message: 'Registration successful.',
        data: { user }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Login endpoint.
   */
  login = async (req, res, next) => {
    try {
      const { username, password } = req.body;
      const result = await this.authService.login(username, password);

      if (result.mfaRequired) {
        // Step 1: User has credentials correct, but has MFA enabled
        // Establish temporary session status
        req.session.tempUserId = result.user.id;
        req.session.mfaRequired = true;
        
        return res.status(200).json({
          status: 'success',
          message: 'Password verified. Multi-factor authentication token required.',
          data: {
            mfaRequired: true
          }
        });
      }

      // Step 2: Fully authenticate immediately
      req.session.userId = result.user.id;
      req.session.mfaRequired = false;

      return res.status(200).json({
        status: 'success',
        message: 'Login successful.',
        data: {
          mfaRequired: false,
          user: result.user
        }
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Logout endpoint.
   */
  logout = async (req, res, next) => {
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie('connect.sid'); // default express-session cookie name
      return res.status(200).json({
        status: 'success',
        message: 'Logged out successfully.'
      });
    });
  };

  /**
   * Current user profile endpoint.
   */
  me = async (req, res, next) => {
    try {
      // Find user from the persistent repository
      const user = await userRepository.findById(req.session.userId);
      if (!user) {
        return res.status(401).json({
          status: 'fail',
          message: 'Not logged in.'
        });
      }

      // Hide secret fields
      const { password, mfaSecret, ...userProfile } = user;

      return res.status(200).json({
        status: 'success',
        data: { user: userProfile }
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = new AuthController();
