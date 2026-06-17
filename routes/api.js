const express = require('express');
const router = express.Router();

const AuthController = require('../src/controllers/AuthController');
const MfaController = require('../src/controllers/MfaController');
const AuthMiddleware = require('../src/middleware/authMiddleware');

// --- Authentication Endpoints ---
router.post('/auth/signup', AuthController.signup);
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', AuthController.logout);
router.get('/auth/me', AuthController.me);

// --- Multi-Factor Authentication Endpoints ---
// Initiate MFA setup (requires session authentication)
router.get('/mfa/setup', AuthMiddleware.requireAuth, MfaController.setupMfa);

// Confirm MFA setup with code (requires session authentication)
router.post('/mfa/confirm', AuthMiddleware.requireAuth, MfaController.confirmMfa);

// Disable MFA (requires session authentication)
router.post('/mfa/disable', AuthMiddleware.requireAuth, MfaController.disableMfa);

// Verify MFA login token (requires credentials verified but MFA pending state)
router.post('/mfa/verify-login', AuthMiddleware.requireMfaVerificationPending, MfaController.verifyLoginMfa);

module.exports = router;
