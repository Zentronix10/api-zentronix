const CardUnblockRequest = require('../models/CardUnblockRequest');
const crypto = require('crypto');

class CardUnblockService {
  constructor(db, cardService, notificationService) {
    this.db = db;
    this.cardService = cardService;
    this.notificationService = notificationService;
    
    this.config = {
      maxUnblockAttemptsPerDay: 3,
      verificationCodeExpiryMinutes: 10,
      unblockCooldownMinutes: 30,
      requireIdentityVerification: true,
      supportedUnblockMethods: ['app', 'sms', 'email', 'call_center', 'atm', 'website'],
      supportedVerificationMethods: ['biometric', 'pin', 'otp', 'security_questions', '2fa', 'face_verification'],
      cardNetworks: {
        visa: {
          name: 'visa',
          displayName: 'Visa',
          supportsInstantUnblock: true,
          unblockTimeoutSeconds: 15,
          requiredVerificationMethods: ['pin', 'otp']
        },
        mastercard: {
          name: 'mastercard',
          displayName: 'Mastercard',
          supportsInstantUnblock: true,
          unblockTimeoutSeconds: 15,
          requiredVerificationMethods: ['pin', 'otp']
        },
        amex: {
          name: 'amex',
          displayName: 'American Express',
          supportsInstantUnblock: true,
          unblockTimeoutSeconds: 20,
          requiredVerificationMethods: ['pin', 'otp', 'security_questions']
        },
        google_pay: {
          name: 'google_pay',
          displayName: 'Google Pay',
          supportsInstantUnblock: true,
          unblockTimeoutSeconds: 10,
          requiredVerificationMethods: ['biometric', '2fa']
        },
        apple_pay: {
          name: 'apple_pay',
          displayName: 'Apple Pay',
          supportsInstantUnblock: true,
          unblockTimeoutSeconds: 10,
          requiredVerificationMethods: ['biometric', '2fa']
        },
        samsung_pay: {
          name: 'samsung_pay',
          displayName: 'Samsung Pay',
          supportsInstantUnblock: true,
          unblockTimeoutSeconds: 10,
          requiredVerificationMethods: ['biometric', '2fa']
        },
        elo: {
          name: 'elo',
          displayName: 'Elo',
          supportsInstantUnblock: true,
          unblockTimeoutSeconds: 15,
          requiredVerificationMethods: ['pin', 'otp']
        },
        discover: {
          name: 'discover',
          displayName: 'Discover',
          supportsInstantUnblock: true,
          unblockTimeoutSeconds: 15,
          requiredVerificationMethods: ['pin', 'otp']
        }
      }
    };
  }

  // Initialize unblock request
  async initiateUnblock(cardId, userId, unblockMethod, verificationMethod, ipAddress, userAgent, deviceId) {
    // Validate method
    if (!this.config.supportedUnblockMethods.includes(unblockMethod)) {
      throw new Error(`Unsupported unblock method: ${unblockMethod}`);
    }
    
    if (!this.config.supportedVerificationMethods.includes(verificationMethod)) {
      throw new Error(`Unsupported verification method: ${verificationMethod}`);
    }

    // Get card
    const card = await this.cardService.getCardById(cardId, userId);
    
    if (!card.isBlocked()) {
      throw new Error('Card is not blocked. Unblock not needed.');
    }

    if (card.status === 'canceled') {
      throw new Error('Canceled cards cannot be unblocked');
    }

    // Check unblock attempts
    await this.checkUnblockAttempts(cardId, userId);

    // Generate verification code
    const verificationCode = this.generateVerificationCode();

    // Create unblock request
    const unblockRequest = new CardUnblockRequest({
      cardId,
      userId,
      unblockMethod,
      verificationMethod,
      reason: card.blockReason,
      verificationCode,
      ipAddress,
      userAgent,
      deviceId
    });

    this.db.cardUnblockRequests = this.db.cardUnblockRequests || [];
    this.db.cardUnblockRequests.push(unblockRequest);

    // Send verification code based on method
    await this.sendVerificationCode(unblockRequest, verificationCode, card, unblockMethod);

    return {
      requestId: unblockRequest.id,
      verificationMethod,
      unblockMethod,
      expiresAt: unblockRequest.verificationCodeExpiresAt,
      message: `Verification code sent via ${unblockMethod}`,
      requiresAdditionalVerification: this.requiresAdditionalVerification(card)
    };
  }

  // Verify and unblock
  async verifyAndUnblock(requestId, userId, verificationCode, additionalData = {}) {
    // Find request
    const unblockRequest = this.db.cardUnblockRequests?.find(r => r.id === requestId && r.userId === userId);
    
    if (!unblockRequest) {
      throw new Error('Unblock request not found');
    }

    if (unblockRequest.status !== 'pending') {
      throw new Error(`Unblock request is ${unblockRequest.status}`);
    }

    if (unblockRequest.isExpired()) {
      unblockRequest.expire();
      throw new Error('Verification code has expired. Please request a new unblock.');
    }

    // Verify code
    if (!unblockRequest.verifyCode(verificationCode)) {
      unblockRequest.reject('Invalid verification code');
      throw new Error('Invalid verification code');
    }

    // Additional verification for high-risk cards
    if (this.requiresAdditionalVerification(null, unblockRequest)) {
      const isValid = await this.performAdditionalVerification(unblockRequest, additionalData);
      if (!isValid) {
        unblockRequest.reject('Additional verification failed');
        throw new Error('Additional verification failed');
      }
    }

    // Get card
    const card = await this.cardService.getCardById(unblockRequest.cardId, userId);

    // Perform unblock via card network
    const unblockResult = await this.unblockViaCardNetwork(card, unblockRequest);

    if (!unblockResult.success) {
      unblockRequest.reject(unblockResult.message);
      throw new Error(unblockResult.message);
    }

    // Unblock the card
    await this.cardService.unblockCard(
      unblockRequest.cardId, 
      userId, 
      'user',
      unblockRequest.ipAddress,
      unblockRequest.userAgent
    );

    // Update request status
    unblockRequest.approve('user');

    // Send confirmation
    await this.sendUnblockConfirmation(card, unblockRequest);

    // Log successful unblock
    await this.logUnblockEvent(card, unblockRequest, true);

    return {
      success: true,
      message: 'Card successfully unblocked',
      cardId: card.id,
      cardNumber: this.cardService.maskCardNumber(card.cardNumber),
      unblockedAt: unblockRequest.unblockedAt,
      cardNetwork: card.cardBrand
    };
  }

  // Emergency unblock via call center (admin only)
  async emergencyUnblock(cardId, userId, adminId, reason, notes = {}) {
    // Verify admin permissions
    const admin = this.db.users?.find(u => u.id === adminId && u.role === 'admin');
    if (!admin) {
      throw new Error('Admin access required for emergency unblock');
    }

    // Get card
    const card = await this.cardService.getCardById(cardId, userId);

    if (!card.isBlocked()) {
      throw new Error('Card is not blocked');
    }

    // Perform unblock
    await this.cardService.unblockCard(cardId, userId, 'admin', null, null);

    // Create unblock request record
    const emergencyRequest = new CardUnblockRequest({
      cardId,
      userId,
      unblockMethod: 'call_center',
      verificationMethod: 'admin_override',
      reason: card.blockReason,
      status: 'approved',
      approvedBy: adminId,
      verifiedAt: new Date(),
      unblockedAt: new Date(),
      additionalInfo: { emergency: true, reason, notes }
    });

    this.db.cardUnblockRequests = this.db.cardUnblockRequests || [];
    this.db.cardUnblockRequests.push(emergencyRequest);

    return {
      success: true,
      message: 'Emergency unblock completed',
      cardId: card.id,
      unblockedBy: admin.email,
      timestamp: emergencyRequest.unblockedAt
    };
  }

  // Temporary unblock (for specific transaction)
  async temporaryUnblockForTransaction(cardId, userId, amount, transactionId, durationMinutes = 5) {
    const card = await this.cardService.getCardById(cardId, userId);

    if (!card.isBlocked()) {
      throw new Error('Card is not blocked');
    }

    // Create temporary unblock session
    const tempUnblockSession = {
      id: crypto.randomBytes(16).toString('hex'),
      cardId,
      userId,
      transactionId,
      amount,
      expiresAt: new Date(Date.now() + (durationMinutes * 60 * 1000)),
      createdAt: new Date()
    };

    this.db.tempUnblockSessions = this.db.tempUnblockSessions || [];
    this.db.tempUnblockSessions.push(tempUnblockSession);

    // Log temporary unblock
    console.log(`[TempUnblock] Card ${cardId} temporarily unblocked for transaction ${transactionId} for ${durationMinutes} minutes`);

    return {
      sessionId: tempUnblockSession.id,
      expiresAt: tempUnblockSession.expiresAt,
      message: `Card temporarily unblocked for ${durationMinutes} minutes to complete this transaction`
    };
  }

  // Validate temporary unblock session
  async validateTempUnblockSession(sessionId, cardId, userId) {
    const session = this.db.tempUnblockSessions?.find(s => 
      s.id === sessionId && s.cardId === cardId && s.userId === userId
    );

    if (!session) {
      return { valid: false, message: 'Invalid temporary unblock session' };
    }

    if (new Date() > session.expiresAt) {
      return { valid: false, message: 'Temporary unblock session expired' };
    }

    return { valid: true, session };
  }

  // Cancel unblock request
  async cancelUnblockRequest(requestId, userId) {
    const unblockRequest = this.db.cardUnblockRequests?.find(r => r.id === requestId && r.userId === userId);
    
    if (!unblockRequest) {
      throw new Error('Unblock request not found');
    }

    if (unblockRequest.status !== 'pending') {
      throw new Error(`Cannot cancel request with status: ${unblockRequest.status}`);
    }

    unblockRequest.reject('Cancelled by user');

    return {
      success: true,
      message: 'Unblock request cancelled'
    };
  }

  // Get unblock status
  async getUnblockStatus(requestId, userId) {
    const unblockRequest = this.db.cardUnblockRequests?.find(r => r.id === requestId && r.userId === userId);
    
    if (!unblockRequest) {
      throw new Error('Unblock request not found');
    }

    return {
      requestId: unblockRequest.id,
      status: unblockRequest.status,
      cardId: unblockRequest.cardId,
      unblockMethod: unblockRequest.unblockMethod,
      verificationMethod: unblockRequest.verificationMethod,
      createdAt: unblockRequest.createdAt,
      expiresAt: unblockRequest.verificationCodeExpiresAt,
      verifiedAt: unblockRequest.verifiedAt,
      unblockedAt: unblockRequest.unblockedAt,
      rejectionReason: unblockRequest.rejectionReason
    };
  }

  // Get unblock history for card
  async getUnblockHistory(cardId, userId) {
    await this.cardService.getCardById(cardId, userId); // Verify ownership
    
    const history = this.db.cardUnblockRequests?.filter(r => r.cardId === cardId) || [];
    
    return history.map(h => ({
      id: h.id,
      status: h.status,
      unblockMethod: h.unblockMethod,
      verificationMethod: h.verificationMethod,
      createdAt: h.createdAt,
      unblockedAt: h.unblockedAt,
      approvedBy: h.approvedBy
    })).sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get user unblock attempts
  async getUserUnblockAttempts(userId, date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attempts = this.db.cardUnblockRequests?.filter(r => 
      r.userId === userId && 
      new Date(r.createdAt) >= startOfDay &&
      new Date(r.createdAt) <= endOfDay
    ) || [];

    return {
      count: attempts.length,
      maxAllowed: this.config.maxUnblockAttemptsPerDay,
      remaining: Math.max(0, this.config.maxUnblockAttemptsPerDay - attempts.length),
      attempts: attempts.map(a => ({
        cardId: a.cardId,
        status: a.status,
        createdAt: a.createdAt
      }))
    };
  }

  // Helper: Check unblock attempts
  async checkUnblockAttempts(cardId, userId) {
    const todayAttempts = await this.getUserUnblockAttempts(userId);
    
    if (todayAttempts.count >= this.config.maxUnblockAttemptsPerDay) {
      throw new Error(`Maximum unblock attempts (${this.config.maxUnblockAttemptsPerDay}) reached for today`);
    }

    // Check cooldown for same card
    const recentAttempts = this.db.cardUnblockRequests?.filter(r => 
      r.cardId === cardId && 
      r.userId === userId &&
      new Date(r.createdAt) > new Date(Date.now() - (this.config.unblockCooldownMinutes * 60 * 1000))
    ) || [];

    if (recentAttempts.length > 0) {
      throw new Error(`Please wait ${this.config.unblockCooldownMinutes} minutes before requesting another unblock`);
    }

    return true;
  }

  // Helper: Generate verification code
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Helper: Send verification code
  async sendVerificationCode(unblockRequest, code, card, method) {
    const user = this.db.users?.find(u => u.id === unblockRequest.userId);
    
    console.log(`[Unblock] Verification code for card ${card.id}: ${code}`);
    
    // In production, implement actual sending:
    switch(method) {
      case 'sms':
        // await this.notificationService.sendSMS(user.phone, `Your Zentronix Bank unblock code: ${code}`);
        break;
      case 'email':
        // await this.notificationService.sendEmail(user.email, 'Card Unblock Code', `Your code: ${code}`);
        break;
      case 'app':
        // await this.notificationService.sendPushNotification(user.deviceToken, 'Unblock Code', code);
        break;
      default:
        // Code is returned in response for testing
        break;
    }
    
    return { sent: true, method };
  }

  // Helper: Unblock via card network
  async unblockViaCardNetwork(card, unblockRequest) {
    const network = this.config.cardNetworks[card.cardBrand];
    
    if (!network) {
      return { success: true, message: 'Unblock processed internally' };
    }

    try {
      // Simulate network API call
      console.log(`[Network] Calling ${network.displayName} unblock API for card ${card.id}`);
      
      // In production, make actual API call:
      // const response = await axios.post(network.unblockEndpoint, {
      //   cardNumber: card.cardNumber,
      //   reason: unblockRequest.reason,
      //   verifiedBy: unblockRequest.verificationMethod
      // });
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, network.unblockTimeoutSeconds * 100));
      
      return { success: true, message: `Unblocked via ${network.displayName}` };
    } catch (error) {
      console.error(`[Network] Unblock failed:`, error);
      return { success: false, message: `Failed to unblock via ${network.displayName}` };
    }
  }

  // Helper: Check if additional verification required
  requiresAdditionalVerification(card = null, unblockRequest = null) {
    // High-risk scenarios
    if (card && card.dailyLimit > 50000) return true;
    if (card && card.cardType === 'virtual') return false;
    if (unblockRequest && unblockRequest.unblockMethod === 'call_center') return false;
    
    return false;
  }

  // Helper: Perform additional verification
  async performAdditionalVerification(unblockRequest, additionalData) {
    // Implement additional verification logic
    // Example: Face verification, security questions, etc.
    
    if (unblockRequest.verificationMethod === 'security_questions') {
      return additionalData.securityAnswers?.length > 0;
    }
    
    if (unblockRequest.verificationMethod === 'face_verification') {
      return additionalData.faceMatched === true;
    }
    
    return true;
  }

  // Helper: Send unblock confirmation
  async sendUnblockConfirmation(card, unblockRequest) {
    const user = this.db.users?.find(u => u.id === unblockRequest.userId);
    
    console.log(`[Unblock] Confirmation sent to user ${user?.email} for card ${card.id}`);
    
    // In production, send actual notifications:
    // await this.notificationService.sendEmail(user.email, 'Card Unblocked', `Your card ending in ${card.cardNumber.slice(-4)} has been unblocked`);
    // await this.notificationService.sendPushNotification(user.deviceToken, 'Card Unblocked', 'Your card is now active');
  }

  // Helper: Log unblock event
  async logUnblockEvent(card, unblockRequest, success) {
    const log = {
      id: crypto.randomBytes(16).toString('hex'),
      cardId: card.id,
      userId: unblockRequest.userId,
      event: success ? 'unblock_success' : 'unblock_failure',
      method: unblockRequest.unblockMethod,
      verificationMethod: unblockRequest.verificationMethod,
      timestamp: new Date(),
      details: {
        requestId: unblockRequest.id,
        cardNetwork: card.cardBrand,
        wasBlocked: card.isBlocked(),
        previousBlockReason: card.blockReason
      }
    };

    this.db.unblockEventLogs = this.db.unblockEventLogs || [];
    this.db.unblockEventLogs.push(log);

    return log;
  }

  // Get supported card networks
  getSupportedNetworks() {
    return Object.values(this.config.cardNetworks).map(network => ({
      name: network.name,
      displayName: network.displayName,
      supportsInstantUnblock: network.supportsInstantUnblock,
      unblockTimeoutSeconds: network.unblockTimeoutSeconds
    }));
  }

  // Get unblock statistics
  async getUnblockStatistics(userId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const requests = this.db.cardUnblockRequests?.filter(r => 
      r.userId === userId && new Date(r.createdAt) >= cutoffDate
    ) || [];

    const stats = {
      totalRequests: requests.length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      expired: requests.filter(r => r.status === 'expired').length,
      successRate: 0,
      byMethod: {},
      byNetwork: {},
      averageUnblockTime: 0
    };

    stats.successRate = stats.totalRequests > 0 
      ? (stats.approved / stats.totalRequests) * 100 
      : 0;

    // Group by method
    requests.forEach(r => {
      stats.byMethod[r.unblockMethod] = (stats.byMethod[r.unblockMethod] || 0) + 1;
    });

    // Calculate average unblock time
    const approvedWithTime = requests.filter(r => r.status === 'approved' && r.createdAt && r.unblockedAt);
    if (approvedWithTime.length > 0) {
      const totalTime = approvedWithTime.reduce((sum, r) => {
        return sum + (new Date(r.unblockedAt) - new Date(r.createdAt));
      }, 0);
      stats.averageUnblockTime = totalTime / approvedWithTime.length / 1000; // in seconds
    }

    return stats;
  }

  // Get configuration
  getConfig() {
    return this.config;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }
}

module.exports = CardUnblockService;
