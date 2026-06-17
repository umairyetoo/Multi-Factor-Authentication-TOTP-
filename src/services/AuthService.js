const CryptoUtils = require('../utils/CryptoUtils');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../core/AppError');

/**
 * Service orchestrating authentication workflow, logic, and state.
 * Uses Dependency Inversion by receiving UserRepository and TotpService as dependencies.
 */
class AuthService {
  /**
   * @param {UserRepository} userRepository 
   * @param {TotpService} totpService 
   */
  constructor(userRepository, totpService) {
    this.userRepository = userRepository;
    this.totpService = totpService;
  }

  /**
   * Registers a new user with secure password hashing.
   * 
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<Object>} The registered user.
   */
  async register(username, password) {
    if (!username || !password || username.trim() === '' || password.trim() === '') {
      throw new BadRequestError('Username and password are required.');
    }

    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new BadRequestError(`Username '${username}' is already taken.`);
    }

    const hashedPassword = CryptoUtils.hashPassword(password);
    
    const user = await this.userRepository.create({
      username: username.trim(),
      password: hashedPassword
    });

    // Strip out credentials before returning
    const { password: _, mfaSecret: __, ...userProfile } = user;
    return userProfile;
  }

  /**
   * Processes credential validation.
   * Part 1 of login flow: checks username and password.
   * If MFA is enabled, triggers MFA verification flag instead of fully logging in.
   * 
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<Object>} { user: Object, mfaRequired: boolean }
   */
  async login(username, password) {
    if (!username || !password) {
      throw new BadRequestError('Username and password are required.');
    }

    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Invalid username or password.');
    }

    // Verify Password securely using timing-safe comparison
    const isPasswordValid = CryptoUtils.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid username or password.');
    }

    // Clean user object profile
    const { password: _, mfaSecret: __, ...userProfile } = user;

    // Check if user has MFA setup and enabled
    if (user.mfaEnabled && user.mfaSecret) {
      return {
        user: userProfile,
        mfaRequired: true
      };
    }

    // MFA is not enabled; user is fully authenticated
    return {
      user: userProfile,
      mfaRequired: false
    };
  }

  /**
   * Verifies a 6-digit TOTP token against user's secret.
   * 
   * @param {number|string} userId 
   * @param {string} token 
   * @returns {Promise<boolean>}
   */
  async verifyMfaToken(userId, token) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestError('MFA is not enabled for this user.');
    }

    return this.totpService.verify(user.mfaSecret, token);
  }

  /**
   * Initiates MFA setup by generating a secret.
   * Does NOT save secret or enable MFA until verified.
   * 
   * @param {number|string} userId 
   * @param {string} appName - Issuer name
   * @returns {Promise<Object>} { secret: string, otpauthUri: string }
   */
  async initiateMfaSetup(userId, appName = 'MfaDemoApp') {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const secret = this.totpService.generateSecret();
    const label = user.username;
    const otpauthUri = this.totpService.getOtpauthUri(label, secret, appName);

    return { secret, otpauthUri };
  }

  /**
   * Finalizes MFA setup by verifying the first token and enabling MFA on success.
   * 
   * @param {number|string} userId 
   * @param {string} secret - The temporary secret being verified.
   * @param {string} token - The 6-digit token to verify.
   * @returns {Promise<Object>} Updated user profile.
   */
  async confirmMfaSetup(userId, secret, token) {
    if (!secret || !token) {
      throw new BadRequestError('Secret and code token are required.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    // Verify code against the temporary secret
    const isValid = this.totpService.verify(secret, token);
    if (!isValid) {
      throw new BadRequestError('Invalid verification code. Please scan the QR code again and enter the code.');
    }

    // Update user profile to enable MFA permanently
    const updatedUser = await this.userRepository.update(userId, {
      mfaEnabled: true,
      mfaSecret: secret
    });

    const { password: _, mfaSecret: __, ...userProfile } = updatedUser;
    return userProfile;
  }

  /**
   * Disables MFA for the user, requiring confirmation via their current TOTP token.
   * 
   * @param {number|string} userId 
   * @param {string} token - The 6-digit token to verify.
   * @returns {Promise<Object>} Updated user profile.
   */
  async disableMfa(userId, token) {
    if (!token) {
      throw new BadRequestError('MFA verification code is required to disable it.');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestError('MFA is not enabled.');
    }

    // Confirm that the user is authorized to turn it off by verifying the token
    const isValid = this.totpService.verify(user.mfaSecret, token);
    if (!isValid) {
      throw new BadRequestError('Invalid verification code. Access denied.');
    }

    // Disable MFA and wipe the secret
    const updatedUser = await this.userRepository.update(userId, {
      mfaEnabled: false,
      mfaSecret: null
    });

    const { password: _, mfaSecret: __, ...userProfile } = updatedUser;
    return userProfile;
  }
}

module.exports = AuthService;
