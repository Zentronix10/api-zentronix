const { v4: uuidv4 } = require('uuid');

class BiometricSession {
  constructor(data) {
    this.id = uuidv4();
    this.userId = data.userId;
    this.deviceId = data.deviceId;
    this.challenge = data.challenge;
    this.challengeExpiresAt = new Date(Date.now() + (5 * 60 * 1000)); // 5 minutes
    this.status = 'pending'; // pending, verified, expired, failed
    this.verifiedAt = null;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.createdAt = new Date();
  }

  verify() {
    this.status = 'verified';
    this.verifiedAt = new Date();
  }

  expire() {
    this.status = 'expired';
  }

  fail() {
    this.status = 'failed';
  }

  isExpired() {
    return new Date() > this.challengeExpiresAt;
  }

  isValid() {
    return this.status === 'pending' && !this.isExpired();
  }
}

module.exports = BiometricSession;
