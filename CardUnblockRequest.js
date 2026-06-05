const { v4: uuidv4 } = require('uuid');

class CardUnblockRequest {
  constructor(data) {
    this.id = uuidv4();
    this.cardId = data.cardId;
    this.userId = data.userId;
    this.unblockMethod = data.unblockMethod; // 'app', 'sms', 'email', 'call_center', 'atm', 'website'
    this.verificationMethod = data.verificationMethod; // 'biometric', 'pin', 'otp', 'security_questions', '2fa'
    this.status = 'pending'; // pending, approved, rejected, expired
    this.reason = data.reason;
    this.additionalInfo = data.additionalInfo;
    this.verificationCode = data.verificationCode;
    this.verificationCodeExpiresAt = new Date(Date.now() + (10 * 60 * 1000)); // 10 minutes
    this.verifiedAt = null;
    this.unblockedAt = null;
    this.rejectedAt = null;
    this.rejectionReason = null;
    this.approvedBy = null;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.deviceId = data.deviceId;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  approve(approvedBy) {
    this.status = 'approved';
    this.approvedBy = approvedBy;
    this.verifiedAt = new Date();
    this.updatedAt = new Date();
  }

  reject(reason) {
    this.status = 'rejected';
    this.rejectionReason = reason;
    this.rejectedAt = new Date();
    this.updatedAt = new Date();
  }

  expire() {
    this.status = 'expired';
    this.updatedAt = new Date();
  }

  isExpired() {
    return new Date() > this.verificationCodeExpiresAt;
  }

  verifyCode(code) {
    return this.verificationCode === code && !this.isExpired();
  }
}

module.exports = CardUnblockRequest;
