const { v4: uuidv4 } = require('uuid');

class Card {
  constructor(data) {
    this.id = uuidv4();
    this.cardNumber = this.generateCardNumber();
    this.cardholderName = data.cardholderName;
    this.userId = data.userId;
    this.accountId = data.accountId;
    this.cardType = data.cardType; // 'physical', 'virtual'
    this.cardBrand = data.cardBrand; // 'visa', 'mastercard', 'elo'
    this.status = 'active'; // active, blocked, temporary_blocked, canceled, pending
    this.blockReason = null;
    this.blockedAt = null;
    this.blockedBy = null;
    this.temporaryBlockExpiresAt = null;
    this.cvv = this.generateCVV();
    this.expirationMonth = this.generateExpirationMonth();
    this.expirationYear = this.generateExpirationYear();
    this.dailyLimit = data.dailyLimit || 5000;
    this.monthlyLimit = data.monthlyLimit || 50000;
    this.transactionLimit = data.transactionLimit || 3000;
    this.internationalEnabled = data.internationalEnabled || false;
    this.onlineEnabled = data.onlineEnabled || true;
    this.atmEnabled = data.atmEnabled || true;
    this.contactlessEnabled = data.contactlessEnabled || true;
    this.failedPinAttempts = 0;
    this.lastUsedAt = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  generateCardNumber() {
    // Generate a random 16-digit card number
    const prefix = '4532'; // Visa prefix for demo
    const random = Math.random().toString().slice(2, 14);
    return prefix + random.padEnd(12, '0').slice(0, 12);
  }

  generateCVV() {
    return Math.floor(100 + Math.random() * 900).toString();
  }

  generateExpirationMonth() {
    const month = new Date().getMonth() + 1;
    return month.toString().padStart(2, '0');
  }

  generateExpirationYear() {
    const year = new Date().getFullYear() + 4;
    return year.toString().slice(-2);
  }

  block(reason, blockedBy) {
    this.status = 'blocked';
    this.blockReason = reason;
    this.blockedAt = new Date();
    this.blockedBy = blockedBy;
    this.updatedAt = new Date();
  }

  temporaryBlock(reason, blockedBy, hours = 24) {
    this.status = 'temporary_blocked';
    this.blockReason = reason;
    this.blockedAt = new Date();
    this.blockedBy = blockedBy;
    this.temporaryBlockExpiresAt = new Date(Date.now() + (hours * 60 * 60 * 1000));
    this.updatedAt = new Date();
  }

  unblock() {
    this.status = 'active';
    this.blockReason = null;
    this.blockedAt = null;
    this.blockedBy = null;
    this.temporaryBlockExpiresAt = null;
    this.updatedAt = new Date();
  }

  cancel() {
    this.status = 'canceled';
    this.blockReason = 'card_canceled';
    this.blockedAt = new Date();
    this.updatedAt = new Date();
  }

  isBlocked() {
    if (this.status === 'blocked') return true;
    if (this.status === 'temporary_blocked') {
      if (this.temporaryBlockExpiresAt && new Date() > this.temporaryBlockExpiresAt) {
        this.unblock();
        return false;
      }
      return true;
    }
    return false;
  }

  recordFailedPinAttempt() {
    this.failedPinAttempts++;
    this.updatedAt = new Date();
    
    if (this.failedPinAttempts >= 3) {
      this.block('excessive_pin_failures', 'system');
    }
  }

  resetFailedPinAttempts() {
    this.failedPinAttempts = 0;
    this.updatedAt = new Date();
  }

  updateLimits(dailyLimit, monthlyLimit, transactionLimit) {
    if (dailyLimit) this.dailyLimit = dailyLimit;
    if (monthlyLimit) this.monthlyLimit = monthlyLimit;
    if (transactionLimit) this.transactionLimit = transactionLimit;
    this.updatedAt = new Date();
  }

  updateFlags(internationalEnabled, onlineEnabled, atmEnabled, contactlessEnabled) {
    if (internationalEnabled !== undefined) this.internationalEnabled = internationalEnabled;
    if (onlineEnabled !== undefined) this.onlineEnabled = onlineEnabled;
    if (atmEnabled !== undefined) this.atmEnabled = atmEnabled;
    if (contactlessEnabled !== undefined) this.contactlessEnabled = contactlessEnabled;
    this.updatedAt = new Date();
  }
}

module.exports = Card;
