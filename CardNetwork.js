class CardNetwork {
  constructor(data) {
    this.id = data.id;
    this.name = data.name; // 'visa', 'mastercard', 'amex', 'google_pay', 'apple_pay', 'samsung_pay', 'elo', 'discover'
    this.displayName = data.displayName;
    this.unblockEndpoint = data.unblockEndpoint;
    this.apiKey = data.apiKey;
    this.supportsInstantUnblock = data.supportsInstantUnblock || true;
    this.supportsTemporaryUnblock = data.supportsTemporaryUnblock || true;
    this.supportsGeolocationValidation = data.supportsGeolocationValidation || false;
    this.unblockTimeoutSeconds = data.unblockTimeoutSeconds || 30;
    this.maxUnblockAttemptsPerDay = data.maxUnblockAttemptsPerDay || 3;
    this.requiredVerificationMethods = data.requiredVerificationMethods || ['pin', 'otp'];
    this.isActive = true;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

module.exports = CardNetwork;
