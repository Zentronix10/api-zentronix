const crypto = require('crypto');

const twoFactorHelpers = {
  // Generate random backup code
  generateBackupCode: (length = 8) => {
    return crypto.randomBytes(length / 2).toString('hex').toUpperCase();
  },
  
  // Generate multiple backup codes
  generateBackupCodes: (count = 10, length = 8) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(twoFactorHelpers.generateBackupCode(length));
    }
    return codes;
  },
  
  // Format phone number for SMS
  formatPhoneNumber: (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+${cleaned}`;
    }
    return phone;
  },
  
  // Validate 2FA code format
  isValidCodeFormat: (code, expectedLength = 6) => {
    return code && /^\d+$/.test(code) && code.length === expectedLength;
  },
  
  // Get time remaining for session
  getSessionTimeRemaining: (expiresAt) => {
    const remaining = new Date(expiresAt) - new Date();
    if (remaining <= 0) return 0;
    return Math.floor(remaining / 1000); // seconds
  },
  
  // Format time remaining for display
  formatTimeRemaining: (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },
  
  // Generate recovery kit
  generateRecoveryKit: (userId, backupCodes) => {
    return {
      userId,
      generatedAt: new Date(),
      backupCodes: backupCodes,
      instructions: `
        Store these backup codes in a safe place.
        Each code can only be used once.
        If you lose access to your authenticator app, use these codes to login.
        After using a backup code, it will be marked as used.
      `,
      qrCodeInstructions: 'Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)'
    };
  },
  
  // Check if method is supported
  isMethodSupported: (method, config) => {
    return config.methods[method] && config.methods[method].enabled;
  },
  
  // Get priority order of methods
  getMethodPriorityOrder: (config) => {
    const methods = Object.entries(config.methods)
      .filter(([_, value]) => value.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([key]) => key);
    
    return methods;
  },
  
  // Validate recovery email format
  isValidRecoveryEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Mask sensitive data for logging
  maskSensitiveData: (data) => {
    if (data.code) {
      data.code = '***';
    }
    if (data.secret) {
      data.secret = '***';
    }
    if (data.token) {
      data.token = '***';
    }
    return data;
  },
  
  // Generate 2FA event ID for tracking
  generateEventId: () => {
    return crypto.randomBytes(16).toString('hex');
  },
  
  // Check if 2FA is required for user role
  isRequiredForRole: (role, requiredRoles) => {
    return requiredRoles.includes(role);
  },
  
  // Get 2FA strength score (0-100)
  getStrengthScore: (method, backupCodesCount) => {
    const scores = {
      authenticator_app: 100,
      hardware_token: 95,
      sms: 70,
      email: 65,
      backup_code: 50
    };
    
    let score = scores[method] || 50;
    
    // Bonus for backup codes
    if (backupCodesCount > 0) {
      score += Math.min(backupCodesCount, 10);
    }
    
    return Math.min(score, 100);
  }
};

module.exports = twoFactorHelpers;
