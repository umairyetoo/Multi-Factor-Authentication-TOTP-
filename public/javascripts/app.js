/**
 * ShieldAuth SPA State Controller
 * Handles application states, fetch operations, and UI animations.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- State Object ---
  const state = {
    user: null,
    mfaEnabled: false,
    currentScreen: 'login-screen' // signup-screen | login-screen | mfa-challenge-screen | dashboard-screen
  };

  // --- DOM Elements Cache ---
  const screens = {
    signup: document.getElementById('signup-screen'),
    login: document.getElementById('login-screen'),
    challenge: document.getElementById('mfa-challenge-screen'),
    dashboard: document.getElementById('dashboard-screen')
  };

  const mainCard = document.getElementById('main-card');
  const alertBanner = document.getElementById('alert-banner');
  const alertMessage = document.getElementById('alert-message');
  const alertCloseBtn = document.getElementById('alert-close-btn');

  // --- Auth Forms ---
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');
  const mfaChallengeForm = document.getElementById('mfa-challenge-form');

  // --- Dashboard Elements ---
  const usernameDisplay = document.getElementById('username-display');
  const logoutBtn = document.getElementById('logout-btn');
  const mfaToggle = document.getElementById('mfa-toggle');
  const mfaStatusBadge = document.getElementById('mfa-status-badge');
  const mfaSetupSection = document.getElementById('mfa-setup-section');
  const mfaDisableSection = document.getElementById('mfa-disable-section');
  const backupCodesSection = document.getElementById('backup-codes-section');
  const backupCodesGrid = document.getElementById('backup-codes-grid');
  const backupCodesSavedBtn = document.getElementById('backup-codes-saved-btn');

  // --- MFA Activation/Cancellation ---
  const mfaQrImg = document.getElementById('mfa-qr-img');
  const qrLoading = document.getElementById('qr-loading');
  const mfaSecretText = document.getElementById('mfa-secret-text');
  const mfaConfirmForm = document.getElementById('mfa-confirm-form');
  const mfaDisableForm = document.getElementById('mfa-disable-form');

  // --- Navigation Buttons ---
  const gotoLoginBtn = document.getElementById('goto-login-btn');
  const gotoSignupBtn = document.getElementById('goto-signup-btn');
  const cancelMfaBtn = document.getElementById('cancel-mfa-btn');

  const toggleBackupCodeBtn = document.getElementById('toggleBackupCodeBtn') || document.getElementById('toggle-backup-code-btn');
  const mfaChallengeTitle = document.getElementById('mfa-challenge-title');
  const mfaChallengeDesc = document.getElementById('mfa-challenge-desc');

  let isUsingBackupCode = false;

  // ================= UI Helper Functions =================

  /**
   * Switches the visible card screen with a clean transition.
   */
  function switchScreen(screenId) {
    // Hide alert on screen change
    hideAlert();

    // Set transitions
    Object.keys(screens).forEach(key => {
      const el = screens[key];
      if (el.id === screenId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
    state.currentScreen = screenId;
  }

  /**
   * Displays a sliding notification banner at the top of the card.
   */
  function showAlert(message, type = 'danger') {
    alertBanner.className = `alert alert-${type}`;
    alertMessage.textContent = message;
    alertBanner.classList.remove('hidden');
  }

  function hideAlert() {
    alertBanner.classList.add('hidden');
  }

  /**
   * Shakes the main card container to notify the user of validation errors.
   */
  function triggerShake() {
    mainCard.classList.add('shake');
    setTimeout(() => {
      mainCard.classList.remove('shake');
    }, 400);
  }

  /**
   * Toggles button loading spinners during requests.
   */
  function setBtnLoading(buttonId, spinnerId, isLoading) {
    const btn = document.getElementById(buttonId);
    const spinner = document.getElementById(spinnerId);
    const textSpan = btn.querySelector('span');

    if (isLoading) {
      btn.disabled = true;
      spinner.classList.remove('hidden');
      if (textSpan) textSpan.style.opacity = '0.5';
    } else {
      btn.disabled = false;
      spinner.classList.add('hidden');
      if (textSpan) textSpan.style.opacity = '1';
    }
  }

  /**
   * Standardizes input to only accept numeric keys for 2FA.
   */
  function restrictToNumeric(inputElement) {
    inputElement.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
    });
  }

  function restrictToAlphanumericUpper(inputElement) {
    inputElement.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    });
  }

  // Allow alphanumeric for challenge (backup codes)
  restrictToAlphanumericUpper(document.getElementById('mfa-otp-code'));
  restrictToNumeric(document.getElementById('mfa-confirm-code'));
  restrictToNumeric(document.getElementById('mfa-disable-code'));

  // ================= API Request Handlers =================

  /**
   * Performs standard HTTP operations with built-in JSON parsing and error handling.
   */
  async function makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'An unexpected error occurred.');
      }
      return data;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Checks current login session. If cookie is active, auto-restores dashboard.
   */
  async function checkSession() {
    try {
      const res = await makeRequest('/api/auth/me');
      if (res.status === 'success' && res.data.user) {
        renderDashboard(res.data.user);
      } else {
        switchScreen('login-screen');
      }
    } catch (err) {
      // Not authenticated, stay on login page
      switchScreen('login-screen');
    }
  }

  /**
   * Populates and renders the user dashboard view.
   */
  function renderDashboard(user) {
    state.user = user;
    state.mfaEnabled = user.mfaEnabled;
    
    usernameDisplay.textContent = user.username;
    
    // Configure badge and toggle states
    if (user.mfaEnabled) {
      mfaStatusBadge.textContent = 'Active';
      mfaStatusBadge.className = 'badge badge-active';
      mfaToggle.checked = true;
    } else {
      mfaStatusBadge.textContent = 'Inactive';
      mfaStatusBadge.className = 'badge badge-inactive';
      mfaToggle.checked = false;
    }

    // Hide any setup/disable sections that might be open
    mfaSetupSection.classList.add('hidden');
    mfaDisableSection.classList.add('hidden');
    backupCodesSection.classList.add('hidden');

    switchScreen('dashboard-screen');
  }

  // ================= Event Listeners =================

  // Close alert button
  alertCloseBtn.addEventListener('click', hideAlert);

  // Screen Navigations
  gotoLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchScreen('login-screen');
  });

  gotoSignupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchScreen('signup-screen');
  });

  cancelMfaBtn.addEventListener('click', (e) => {
    e.preventDefault();
    // Log out from the temporary session to avoid hanging MFA blocks
    makeRequest('/api/auth/logout', { method: 'POST' }).finally(() => {
      switchScreen('login-screen');
    });
  });

  // --- Toggle Backup Code ---
  toggleBackupCodeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    hideAlert();
    const otpInput = document.getElementById('mfa-otp-code');
    
    isUsingBackupCode = !isUsingBackupCode;
    
    if (isUsingBackupCode) {
      mfaChallengeDesc.textContent = "Enter an 8-character backup code.";
      otpInput.placeholder = "XXXXXXXX";
      otpInput.maxLength = 8;
      otpInput.value = "";
      toggleBackupCodeBtn.textContent = "Use authenticator app instead";
    } else {
      mfaChallengeDesc.textContent = "Enter the 6-digit verification code from your authenticator app.";
      otpInput.placeholder = "000000";
      otpInput.maxLength = 6;
      otpInput.value = "";
      toggleBackupCodeBtn.textContent = "App not available? Use a backup code";
    }
  });

  // --- Sign Up Submit ---
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;

    if (!username || !password) {
      showAlert('Please enter both a username and password.');
      triggerShake();
      return;
    }

    setBtnLoading('signup-submit-btn', 'signup-spinner', true);
    try {
      const res = await makeRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      
      showAlert('Account registered successfully!', 'success');
      setTimeout(() => {
        renderDashboard(res.data.user);
        signupForm.reset();
      }, 1000);
    } catch (err) {
      showAlert(err.message);
      triggerShake();
    } finally {
      setBtnLoading('signup-submit-btn', 'signup-spinner', false);
    }
  });

  // --- Log In Submit ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      showAlert('Please enter both username and password.');
      triggerShake();
      return;
    }

    setBtnLoading('login-submit-btn', 'login-spinner', true);
    try {
      const res = await makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res.data.mfaRequired) {
        // Redirection to TOTP screen
        switchScreen('mfa-challenge-screen');
      } else {
        // Logged in immediately
        showAlert('Log in successful!', 'success');
        setTimeout(() => {
          renderDashboard(res.data.user);
          loginForm.reset();
        }, 800);
      }
    } catch (err) {
      showAlert(err.message);
      triggerShake();
    } finally {
      setBtnLoading('login-submit-btn', 'login-spinner', false);
    }
  });

  // --- MFA Token Login (Phase 2 Challenge) ---
  mfaChallengeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const code = document.getElementById('mfa-otp-code').value;

    if (isUsingBackupCode) {
      if (!code || code.length !== 8) {
        showAlert('Please enter a valid 8-character backup code.');
        triggerShake();
        return;
      }
    } else {
      if (!code || code.length !== 6) {
        showAlert('Please enter a valid 6-digit code.');
        triggerShake();
        return;
      }
    }

    setBtnLoading('mfa-challenge-submit-btn', 'challenge-spinner', true);
    try {
      await makeRequest('/api/mfa/verify-login', {
        method: 'POST',
        body: JSON.stringify({ code })
      });

      showAlert('Verification code accepted. Access granted.', 'success');
      
      // Fetch full user details to populate dashboard
      const profileRes = await makeRequest('/api/auth/me');
      setTimeout(() => {
        renderDashboard(profileRes.data.user);
        mfaChallengeForm.reset();
      }, 800);
    } catch (err) {
      showAlert(err.message);
      triggerShake();
    } finally {
      setBtnLoading('mfa-challenge-submit-btn', 'challenge-spinner', false);
    }
  });

  // --- Log Out Submit ---
  logoutBtn.addEventListener('click', async () => {
    try {
      await makeRequest('/api/auth/logout', { method: 'POST' });
      state.user = null;
      state.mfaEnabled = false;
      showAlert('Logged out successfully.', 'success');
      switchScreen('login-screen');
    } catch (err) {
      showAlert('Failed to sign out cleanly. Please try again.');
    }
  });

  // --- MFA Toggle Switch Logic ---
  mfaToggle.addEventListener('change', async () => {
    hideAlert();

    // Checkbox is toggled, but do not change the visual state permanently until confirmed
    const wantToEnable = mfaToggle.checked;

    if (wantToEnable) {
      // User turned toggle ON -> Initiate setup
      mfaToggle.checked = false; // Reset visually until verified
      mfaDisableSection.classList.add('hidden');
      mfaSetupSection.classList.remove('hidden');

      // Reset loading QR image state
      mfaQrImg.classList.add('hidden');
      qrLoading.classList.remove('hidden');
      mfaSecretText.textContent = 'Generating...';

      try {
        const res = await makeRequest('/api/mfa/setup');
        
        mfaQrImg.src = res.data.qrCode;
        mfaQrImg.classList.remove('hidden');
        qrLoading.classList.add('hidden');
        
        mfaSecretText.textContent = res.data.secret;
      } catch (err) {
        showAlert('Failed to initialize MFA setup: ' + err.message);
        mfaSetupSection.classList.add('hidden');
        triggerShake();
      }
    } else {
      // User turned toggle OFF -> Request confirmation code to disable
      mfaToggle.checked = true; // Keep checked visually until verified
      mfaSetupSection.classList.add('hidden');
      mfaDisableSection.classList.remove('hidden');
    }
  });

  // --- MFA Enable Confirmation ---
  mfaConfirmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const code = document.getElementById('mfa-confirm-code').value;

    if (!code || code.length !== 6) {
      showAlert('Please enter a 6-digit confirmation code.');
      triggerShake();
      return;
    }

    setBtnLoading('mfa-confirm-submit-btn', 'confirm-spinner', true);
    try {
      const res = await makeRequest('/api/mfa/confirm', {
        method: 'POST',
        body: JSON.stringify({ code })
      });

      showAlert('MFA successfully enabled!', 'success');
      
      // Render dashboard and then show backup codes
      renderDashboard(res.data.user);
      mfaConfirmForm.reset();
      
      // Show backup codes
      if (res.data.backupCodes) {
        backupCodesGrid.innerHTML = '';
        res.data.backupCodes.forEach(code => {
          const div = document.createElement('div');
          div.className = 'backup-code-item';
          div.textContent = code;
          backupCodesGrid.appendChild(div);
        });
        
        mfaSetupSection.classList.add('hidden');
        backupCodesSection.classList.remove('hidden');
      }
    } catch (err) {
      showAlert(err.message);
      triggerShake();
    } finally {
      setBtnLoading('mfa-confirm-submit-btn', 'confirm-spinner', false);
    }
  });

  // --- Hide Backup Codes Form ---
  backupCodesSavedBtn.addEventListener('click', (e) => {
    e.preventDefault();
    backupCodesSection.classList.add('hidden');
  });

  // --- MFA Disable Confirmation ---
  mfaDisableForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const code = document.getElementById('mfa-disable-code').value;

    if (!code || code.length !== 6) {
      showAlert('Please enter a 6-digit verification code.');
      triggerShake();
      return;
    }

    setBtnLoading('mfa-disable-submit-btn', 'disable-spinner', true);
    try {
      const res = await makeRequest('/api/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ code })
      });

      showAlert('MFA successfully disabled.', 'success');
      setTimeout(() => {
        renderDashboard(res.data.user);
        mfaDisableForm.reset();
      }, 1000);
    } catch (err) {
      showAlert(err.message);
      triggerShake();
    } finally {
      setBtnLoading('mfa-disable-submit-btn', 'disable-spinner', false);
    }
  });

  // --- App Initialization ---
  checkSession();
});
