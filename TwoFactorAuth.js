const { v4: uuidv4 } = require('uuid');

class TwoFactorAuth {
  constructor(data) {
    this.id = uuidv4();
    this.userId = data.userId;
    this.method = data.method; // 'authenticator_app', 'sms', 'email', 'backup_code', 'hardware_token'
    this.secret = data.secret;
    this.isEnabled = data.isEnabled || false;
    this.isVerified = data.isVerified || false;
    this.backupCodes = data.backupCodes || [];
    this.recoveryEmail = data.recoveryEmail || null;
    this.recoveryPhone = data.recoveryPhone || null;
    this.deviceName = data.deviceName || null;
    this.deviceId = data.deviceId || null;
    this.lastUsedAt = null;
    this.failedAttempts = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  enable() {
    this.isEnabled = true;
    this.updatedAt = new Date();
  }

  disable() {
    this.isEnabled = false;
    this.isVerified = false;
    this.updatedAt = new Date();
  }

  verify() {
    this.isVerified = true;
    this.updatedAt = new Date();
  }

  recordSuccessfulUse() {
    this.lastUsedAt = new Date();
    this.failedAttempts = 0;
    this.updatedAt = new Date();
  }

  recordFailedAttempt() {
    this.failedAttempts++;
    this.updatedAt = new Date();
  }

  isLocked() {
    return this.failedAttempts >= 5;
  }

  addBackupCode(code) {
    this.backupCodes.push({
      code,
      used: false,
      createdAt: new Date()
    });
    this.updatedAt = new Date();
  }

  useBackupCode(code) {
    const backupCode = this.backupCodes.find(bc => bc.code === code && !bc.used);
    if (backupCode) {
      backupCode.used = true;
      backupCode.usedAt = new Date();
      this.updatedAt = new Date();
      return true;
    }
    return false;
  }

  getAvailableBackupCodes() {
    return this.backupCodes.filter(bc => !bc.used);
  }

  regenerateBackupCodes() {
    this.backupCodes = [];
    this.updatedAt = new Date();
  }
}

module.exports = TwoFactorAuth;
