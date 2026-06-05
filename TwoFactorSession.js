const { v4: uuidv4 } = require('uuid');

class TwoFactorSession {
  constructor(data) {
    this.id = uuidv4();
    this.userId = data.userId;
    this.code = data.code;
    this.method = data.method; // 'authenticator_app', 'sms', 'email', 'backup_code'
    this.purpose = data.purpose; // 'login', 'disable_2fa', 'change_method', 'recovery'
    this.status = 'pending'; // pending, verified, expired, failed
    this.attempts = 0;
    this.expiresAt = new Date(Date.now() + (5 * 60 * 1000)); // 5 minutes
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.createdAt = new Date();
    this.verifiedAt = null;
  }

  verify() {
    this.status = 'verified';
    this.verifiedAt = new Date();
  }

  expire() {
    this.status = 'expired';
  }

  fail() {
    this.attempts++;
    if (this.attempts >= 3) {
      this.status = 'failed';
    }
  }

  isValid() {
    return this.status === 'pending' && new Date() < this.expiresAt;
  }

  isExpired() {
    return new Date() > this.expiresAt;
  }
}

module.exports = TwoFactorSession;
