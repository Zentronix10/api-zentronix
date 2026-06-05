const { v4: uuidv4 } = require('uuid');

class BiometricAuth {
  constructor(data) {
    this.id = uuidv4();
    this.userId = data.userId;
    this.deviceId = data.deviceId;
    this.deviceName = data.deviceName;
    this.deviceType = data.deviceType; // 'mobile', 'web', 'desktop'
    this.biometricType = data.biometricType; // 'fingerprint', 'face_id', 'voice'
    this.publicKey = data.publicKey;
    this.credentialId = data.credentialId;
    this.challenge = data.challenge;
    this.status = 'active'; // active, revoked, pending
    this.lastUsedAt = null;
    this.failedAttempts = 0;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  recordSuccessfulAttempt() {
    this.lastUsedAt = new Date();
    this.failedAttempts = 0;
    this.updatedAt = new Date();
  }

  recordFailedAttempt() {
    this.failedAttempts++;
    this.updatedAt = new Date();
    
    if (this.failedAttempts >= 5) {
      this.status = 'revoked';
    }
  }

  revoke() {
    this.status = 'revoked';
    this.updatedAt = new Date();
  }

  isRevoked() {
    return this.status === 'revoked';
  }
}

module.exports = BiometricAuth;
