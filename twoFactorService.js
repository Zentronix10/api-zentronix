const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const TwoFactorSession = require('../models/TwoFactorSession');

class TwoFactorService {
  constructor(db, notificationService) {
    this.db = db;
    this.notificationService = notificationService;
    
    this.config = {
      enabled: true,
      requiredForRoles: ['admin', 'compliance'],
      optionalForRoles: ['user', 'viewer'],
      codeLength: 6,
      codeExpirySeconds: 300, // 5 minutes
      maxAttempts: 3,
      backupCodesCount: 10,
      backupCodeLength: 8,
      methods: {
        authenticator_app: {
          enabled: true,
          priority: 1,
          requiresQrCode: true
        },
        sms: {
          enabled: true,
          priority: 2,
          requiresPhoneNumber: true
        },
        email: {
          enabled: true,
          priority: 3,
          requiresEmail: true
        },
        backup_code: {
          enabled: true,
          priority: 4,
          requiresNoInput: true
        },
        hardware_token: {
          enabled: false,
          priority: 5,
          requiresDevice: true
        }
      }
    };
  }

  // Setup 2FA for a user
  async setupTwoFactor(userId, method, deviceName = null, deviceId = null) {
    if (!this.config.methods[method] || !this.config.methods[method].enabled) {
      throw new Error(`Method ${method} is not enabled`);
    }

    // Check if user already has 2FA
    let twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
    
    if (twoFactorAuth && twoFactorAuth.isEnabled) {
      throw new Error('2FA is already enabled for this user');
    }

    let secret, otpauthUrl, qrCode;

    if (method === 'authenticator_app') {
      // Generate secret for authenticator app
      secret = speakeasy.generateSecret({
        name: `ZentronixBank:${userId}`,
        length: 20
      });
      
      otpauthUrl = secret.otpauth_url;
      qrCode = await QRCode.toDataURL(otpauthUrl);
    } else {
      secret = crypto.randomBytes(20).toString('hex');
    }

    if (!twoFactorAuth) {
      twoFactorAuth = new TwoFactorAuth({
        userId,
        method,
        secret: secret.base32 || secret,
        deviceName,
        deviceId
      });
      this.db.twoFactorAuths = this.db.twoFactorAuths || [];
      this.db.twoFactorAuths.push(twoFactorAuth);
    } else {
      twoFactorAuth.method = method;
      twoFactorAuth.secret = secret.base32 || secret;
      twoFactorAuth.deviceName = deviceName;
      twoFactorAuth.deviceId = deviceId;
      twoFactorAuth.updatedAt = new Date();
    }

    // Generate backup codes
    const backupCodes = await this.generateBackupCodes();
    backupCodes.forEach(code => twoFactorAuth.addBackupCode(code));

    return {
      success: true,
      method,
      secret: twoFactorAuth.secret,
      qrCode: method === 'authenticator_app' ? qrCode : null,
      backupCodes: backupCodes,
      message: 'Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)'
    };
  }

  // Verify and enable 2FA
  async verifyAndEnable(userId, code, method) {
    const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
    
    if (!twoFactorAuth) {
      throw new Error('2FA setup not initiated');
    }

    if (twoFactorAuth.isEnabled) {
      throw new Error('2FA is already enabled');
    }

    const isValid = await this.verifyCode(userId, code, method);

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    twoFactorAuth.enable();
    twoFactorAuth.verify();

    // Send confirmation
    await this.notificationService?.sendNotification(userId, '2FA Enabled', 'Two-factor authentication has been enabled on your account');

    return {
      success: true,
      message: '2FA successfully enabled',
      recoveryCodes: twoFactorAuth.getAvailableBackupCodes().map(bc => bc.code)
    };
  }

  // Disable 2FA
  async disableTwoFactor(userId, code, method) {
    const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
    
    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new Error('2FA is not enabled');
    }

    const isValid = await this.verifyCode(userId, code, method);

    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    twoFactorAuth.disable();

    await this.notificationService?.sendNotification(userId, '2FA Disabled', 'Two-factor authentication has been disabled on your account');

    return {
      success: true,
      message: '2FA successfully disabled'
    };
  }

  // Generate 2FA code for login
  async generateLoginCode(userId, method, ipAddress, userAgent) {
    const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId && tfa.isEnabled);
    
    if (!twoFactorAuth) {
      throw new Error('2FA is not enabled for this user');
    }

    if (twoFactorAuth.isLocked()) {
      throw new Error('Too many failed attempts. Please contact support.');
    }

    let code;
    
    switch(method) {
      case 'authenticator_app':
        code = this.generateTOTPCode(twoFactorAuth.secret);
        break;
      case 'sms':
        code = this.generateSMSCode();
        await this.sendSMSCode(userId, code);
        break;
      case 'email':
        code = this.generateEmailCode();
        await this.sendEmailCode(userId, code);
        break;
      default:
        throw new Error(`Unsupported method: ${method}`);
    }

    const session = new TwoFactorSession({
      userId,
      code,
      method,
      purpose: 'login',
      ipAddress,
      userAgent
    });

    this.db.twoFactorSessions = this.db.twoFactorSessions || [];
    this.db.twoFactorSessions.push(session);

    return {
      sessionId: session.id,
      method,
      expiresAt: session.expiresAt,
      message: `Verification code sent via ${method}`
    };
  }

  // Verify 2FA code
  async verifyCode(userId, code, method, sessionId = null) {
    let isValid = false;

    if (method === 'backup_code') {
      const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
      if (twoFactorAuth) {
        isValid = twoFactorAuth.useBackupCode(code);
        if (isValid) {
          await this.notificationService?.sendNotification(userId, 'Backup Code Used', 'A backup code was used to access your account');
        }
      }
    } else if (method === 'authenticator_app') {
      const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
      if (twoFactorAuth) {
        isValid = this.verifyTOTPCode(code, twoFactorAuth.secret);
      }
    } else {
      // SMS or Email verification
      const session = this.db.twoFactorSessions?.find(s => 
        s.userId === userId && 
        s.code === code && 
        s.method === method &&
        s.purpose === 'login' &&
        s.status === 'pending'
      );

      if (session && session.isValid()) {
        isValid = true;
        session.verify();
      } else if (session) {
        session.fail();
      }
    }

    // Update failed attempts
    if (!isValid) {
      const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
      if (twoFactorAuth) {
        twoFactorAuth.recordFailedAttempt();
      }
    } else {
      const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
      if (twoFactorAuth) {
        twoFactorAuth.recordSuccessfulUse();
      }
    }

    return isValid;
  }

  // Generate TOTP code
  generateTOTPCode(secret) {
    return speakeasy.totp({
      secret: secret,
      encoding: 'base32',
      step: 30,
      digits: 6
    });
  }

  // Verify TOTP code
  verifyTOTPCode(token, secret) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1,
      step: 30
    });
  }

  // Generate SMS code
  generateSMSCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate Email code
  generateEmailCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send SMS code
  async sendSMSCode(userId, code) {
    const user = this.db.users?.find(u => u.id === userId);
    if (!user || !user.phone) {
      throw new Error('User phone number not found');
    }

    console.log(`[2FA] SMS code for ${user.phone}: ${code}`);
    
    // In production, integrate with SMS provider:
    // await this.notificationService.sendSMS(user.phone, `Your Zentronix Bank verification code is: ${code}`);
    
    return true;
  }

  // Send Email code
  async sendEmailCode(userId, code) {
    const user = this.db.users?.find(u => u.id === userId);
    if (!user || !user.email) {
      throw new Error('User email not found');
    }

    console.log(`[2FA] Email code for ${user.email}: ${code}`);
    
    // In production, integrate with email provider:
    // await this.notificationService.sendEmail(user.email, '2FA Verification Code', `Your code is: ${code}`);
    
    return true;
  }

  // Generate backup codes
  async generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.config.backupCodesCount; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  // Get backup codes
  async getBackupCodes(userId) {
    const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
    
    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new Error('2FA is not enabled');
    }

    return twoFactorAuth.getAvailableBackupCodes().map(bc => bc.code);
  }

  // Regenerate backup codes
  async regenerateBackupCodes(userId, code, method) {
    const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
    
    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new Error('2FA is not enabled');
    }

    const isValid = await this.verifyCode(userId, code, method);
    
    if (!isValid) {
      throw new Error('Invalid verification code');
    }

    twoFactorAuth.regenerateBackupCodes();
    const newCodes = await this.generateBackupCodes();
    newCodes.forEach(newCode => twoFactorAuth.addBackupCode(newCode));

    await this.notificationService?.sendNotification(userId, 'Backup Codes Regenerated', 'Your 2FA backup codes have been regenerated');

    return {
      success: true,
      backupCodes: newCodes
    };
  }

  // Get 2FA status for user
  async getTwoFactorStatus(userId) {
    const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
    
    return {
      enabled: twoFactorAuth?.isEnabled || false,
      method: twoFactorAuth?.method || null,
      isVerified: twoFactorAuth?.isVerified || false,
      lastUsedAt: twoFactorAuth?.lastUsedAt || null,
      availableMethods: this.getAvailableMethods(userId)
    };
  }

  // Get available methods for user
  getAvailableMethods(userId) {
    const user = this.db.users?.find(u => u.id === userId);
    const methods = [];
    
    if (this.config.methods.authenticator_app.enabled) {
      methods.push({
        name: 'authenticator_app',
        displayName: 'Authenticator App',
        available: true
      });
    }
    
    if (this.config.methods.sms.enabled && user?.phone) {
      methods.push({
        name: 'sms',
        displayName: 'SMS',
        available: true,
        destination: this.maskPhone(user.phone)
      });
    }
    
    if (this.config.methods.email.enabled && user?.email) {
      methods.push({
        name: 'email',
        displayName: 'Email',
        available: true,
        destination: this.maskEmail(user.email)
      });
    }
    
    if (this.config.methods.backup_code.enabled) {
      methods.push({
        name: 'backup_code',
        displayName: 'Backup Code',
        available: true
      });
    }
    
    return methods;
  }

  // Check if user requires 2FA
  async requiresTwoFactor(userId, userRole) {
    if (!this.config.enabled) return false;
    
    if (this.config.requiredForRoles.includes(userRole)) {
      const status = await this.getTwoFactorStatus(userId);
      return !status.enabled;
    }
    
    return false;
  }

  // Verify 2FA for login flow
  async verifyLoginTwoFactor(userId, code, sessionId) {
    const session = this.db.twoFactorSessions?.find(s => 
      s.id === sessionId && 
      s.userId === userId && 
      s.purpose === 'login'
    );

    if (!session || !session.isValid()) {
      throw new Error('Invalid or expired session');
    }

    const isValid = await this.verifyCode(userId, code, session.method);

    if (!isValid) {
      session.fail();
      throw new Error('Invalid verification code');
    }

    session.verify();

    return {
      success: true,
      verified: true
    };
  }

  // Helper: Mask phone number
  maskPhone(phone) {
    if (!phone) return null;
    return phone.slice(0, 4) + '****' + phone.slice(-4);
  }

  // Helper: Mask email
  maskEmail(email) {
    if (!email) return null;
    const [local, domain] = email.split('@');
    return local.slice(0, 2) + '****@' + domain;
  }

  // Get 2FA statistics
  async getStatistics() {
    const all2FA = this.db.twoFactorAuths || [];
    const enabled = all2FA.filter(tfa => tfa.isEnabled);
    
    return {
      totalUsersWith2FA: all2FA.length,
      enabledCount: enabled.length,
      enabledPercentage: all2FA.length > 0 ? (enabled.length / all2FA.length) * 100 : 0,
      byMethod: {
        authenticator_app: enabled.filter(tfa => tfa.method === 'authenticator_app').length,
        sms: enabled.filter(tfa => tfa.method === 'sms').length,
        email: enabled.filter(tfa => tfa.method === 'email').length
      },
      recentActivity: this.getRecentActivity()
    };
  }

  // Get recent 2FA activity
  getRecentActivity(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const sessions = this.db.twoFactorSessions?.filter(s => 
      new Date(s.createdAt) >= cutoff
    ) || [];

    return {
      totalVerifications: sessions.length,
      successful: sessions.filter(s => s.status === 'verified').length,
      failed: sessions.filter(s => s.status === 'failed').length,
      expired: sessions.filter(s => s.status === 'expired').length
    };
  }

  // Get configuration
  getConfig() {
    return this.config;
  }

  // Update configuration (admin only)
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }

  // Emergency disable 2FA (admin only)
  async emergencyDisableTwoFactor(userId, adminId, reason) {
    const twoFactorAuth = this.db.twoFactorAuths?.find(tfa => tfa.userId === userId);
    
    if (!twoFactorAuth) {
      throw new Error('User does not have 2FA setup');
    }

    const admin = this.db.users?.find(u => u.id === adminId && u.role === 'admin');
    if (!admin) {
      throw new Error('Admin access required');
    }

    twoFactorAuth.disable();

    // Log emergency disable
    const log = {
      userId,
      adminId,
      reason,
      timestamp: new Date()
    };
    
    this.db.emergency2FADisables = this.db.emergency2FADisables || [];
    this.db.emergency2FADisables.push(log);

    await this.notificationService?.sendNotification(userId, '2FA Emergency Disabled', 
      `An administrator has disabled 2FA on your account. Reason: ${reason}`);

    return {
      success: true,
      message: '2FA has been disabled by administrator'
    };
  }
}

module.exports = TwoFactorService;
