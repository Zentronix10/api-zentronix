const Card = require('../models/Card');
const CardBlockLog = require('../models/CardBlockLog');

class CardService {
  constructor(db) {
    this.db = db;
    this.config = {
      maxCardsPerUser: 5,
      maxVirtualCardsPerUser: 3,
      temporaryBlockHours: 24,
      autoBlockOnSuspiciousActivity: true,
      requireReasonForBlock: true,
      allowedBlockReasons: [
        'lost_card',
        'stolen_card',
        'suspicious_activity',
        'unauthorized_use',
        'damaged_card',
        'user_request',
        'fraud_alert',
        'expired_card'
      ]
    };
  }

  // Create a new card
  async createCard(userId, accountId, cardData) {
    // Check card limits
    const userCards = this.db.cards?.filter(c => c.userId === userId && c.status !== 'canceled') || [];
    
    if (cardData.cardType === 'virtual') {
      const virtualCards = userCards.filter(c => c.cardType === 'virtual');
      if (virtualCards.length >= this.config.maxVirtualCardsPerUser) {
        throw new Error(`Maximum ${this.config.maxVirtualCardsPerUser} virtual cards allowed`);
      }
    } else {
      if (userCards.length >= this.config.maxCardsPerUser) {
        throw new Error(`Maximum ${this.config.maxCardsPerUser} cards allowed`);
      }
    }

    const card = new Card({
      ...cardData,
      userId,
      accountId
    });

    this.db.cards = this.db.cards || [];
    this.db.cards.push(card);

    // Log card creation
    await this.logCardAction(card.id, userId, 'created', 'card_issued', 'system', null, {});

    return card;
  }

  // Get all cards for a user
  async getUserCards(userId) {
    const cards = this.db.cards?.filter(c => c.userId === userId) || [];
    
    return cards.map(card => ({
      id: card.id,
      cardNumber: this.maskCardNumber(card.cardNumber),
      cardholderName: card.cardholderName,
      cardType: card.cardType,
      cardBrand: card.cardBrand,
      status: card.status,
      expirationMonth: card.expirationMonth,
      expirationYear: card.expirationYear,
      dailyLimit: card.dailyLimit,
      monthlyLimit: card.monthlyLimit,
      transactionLimit: card.transactionLimit,
      internationalEnabled: card.internationalEnabled,
      onlineEnabled: card.onlineEnabled,
      atmEnabled: card.atmEnabled,
      contactlessEnabled: card.contactlessEnabled,
      isBlocked: card.isBlocked(),
      lastUsedAt: card.lastUsedAt,
      createdAt: card.createdAt
    }));
  }

  // Get card by ID
  async getCardById(cardId, userId) {
    const card = this.db.cards?.find(c => c.id === cardId && c.userId === userId);
    
    if (!card) {
      throw new Error('Card not found');
    }

    return card;
  }

  // Instant block card
  async instantBlockCard(cardId, userId, reason, performedBy, ipAddress, userAgent, details = {}) {
    const card = await this.getCardById(cardId, userId);

    if (!this.config.allowedBlockReasons.includes(reason)) {
      throw new Error(`Invalid block reason. Allowed: ${this.config.allowedBlockReasons.join(', ')}`);
    }

    if (card.isBlocked()) {
      throw new Error('Card is already blocked');
    }

    // Block the card
    card.block(reason, performedBy);

    // Log the block action
    const blockLog = await this.logCardAction(
      cardId, 
      userId, 
      'block', 
      reason, 
      performedBy, 
      userId,
      { ...details, ipAddress, userAgent }
    );

    // Trigger additional actions (send notification, etc.)
    await this.triggerBlockActions(card, reason);

    return {
      success: true,
      message: 'Card blocked successfully',
      card: {
        id: card.id,
        cardNumber: this.maskCardNumber(card.cardNumber),
        status: card.status,
        blockReason: card.blockReason,
        blockedAt: card.blockedAt
      },
      blockLogId: blockLog.id
    };
  }

  // Instant temporary block card
  async instantTemporaryBlockCard(cardId, userId, reason, performedBy, hours = null, ipAddress = null, userAgent = null) {
    const card = await this.getCardById(cardId, userId);

    if (card.isBlocked() && card.status !== 'temporary_blocked') {
      throw new Error('Card is permanently blocked, cannot apply temporary block');
    }

    const blockHours = hours || this.config.temporaryBlockHours;

    card.temporaryBlock(reason, performedBy, blockHours);

    await this.logCardAction(
      cardId, 
      userId, 
      'temporary_block', 
      reason, 
      performedBy, 
      userId,
      { blockHours, ipAddress, userAgent }
    );

    return {
      success: true,
      message: `Card temporarily blocked for ${blockHours} hours`,
      card: {
        id: card.id,
        cardNumber: this.maskCardNumber(card.cardNumber),
        status: card.status,
        blockReason: card.blockReason,
        blockedAt: card.blockedAt,
        temporaryBlockExpiresAt: card.temporaryBlockExpiresAt
      }
    };
  }

  // Unblock card
  async unblockCard(cardId, userId, performedBy, ipAddress = null, userAgent = null) {
    const card = await this.getCardById(cardId, userId);

    if (!card.isBlocked()) {
      throw new Error('Card is not blocked');
    }

    if (card.status === 'canceled') {
      throw new Error('Canceled cards cannot be unblocked');
    }

    card.unblock();

    await this.logCardAction(
      cardId, 
      userId, 
      'unblock', 
      'user_request', 
      performedBy, 
      userId,
      { ipAddress, userAgent }
    );

    return {
      success: true,
      message: 'Card unblocked successfully',
      card: {
        id: card.id,
        cardNumber: this.maskCardNumber(card.cardNumber),
        status: card.status
      }
    };
  }

  // Cancel card (permanent)
  async cancelCard(cardId, userId, performedBy, reason, ipAddress = null, userAgent = null) {
    const card = await this.getCardById(cardId, userId);

    if (card.status === 'canceled') {
      throw new Error('Card is already canceled');
    }

    card.cancel();

    await this.logCardAction(
      cardId, 
      userId, 
      'cancel', 
      reason, 
      performedBy, 
      userId,
      { ipAddress, userAgent }
    );

    return {
      success: true,
      message: 'Card canceled permanently',
      card: {
        id: card.id,
        cardNumber: this.maskCardNumber(card.cardNumber),
        status: card.status
      }
    };
  }

  // Block card by system (fraud detection)
  async systemBlockCard(cardId, userId, reason, details = {}) {
    const card = await this.getCardById(cardId, userId);
    
    card.block(reason, 'system');

    await this.logCardAction(
      cardId, 
      userId, 
      'block', 
      reason, 
      'system', 
      null,
      { ...details, systemTriggered: true }
    );

    return {
      success: true,
      message: 'Card blocked by system',
      cardId: card.id,
      reason
    };
  }

  // Update card limits
  async updateCardLimits(cardId, userId, limits) {
    const card = await this.getCardById(cardId, userId);
    
    card.updateLimits(limits.dailyLimit, limits.monthlyLimit, limits.transactionLimit);

    await this.logCardAction(
      cardId, 
      userId, 
      'limits_updated', 
      'user_request', 
      'user', 
      userId,
      { limits }
    );

    return {
      success: true,
      message: 'Card limits updated',
      limits: {
        dailyLimit: card.dailyLimit,
        monthlyLimit: card.monthlyLimit,
        transactionLimit: card.transactionLimit
      }
    };
  }

  // Update card flags (international, online, etc.)
  async updateCardFlags(cardId, userId, flags) {
    const card = await this.getCardById(cardId, userId);
    
    card.updateFlags(
      flags.internationalEnabled,
      flags.onlineEnabled,
      flags.atmEnabled,
      flags.contactlessEnabled
    );

    await this.logCardAction(
      cardId, 
      userId, 
      'flags_updated', 
      'user_request', 
      'user', 
      userId,
      { flags }
    );

    return {
      success: true,
      message: 'Card settings updated',
      flags: {
        internationalEnabled: card.internationalEnabled,
        onlineEnabled: card.onlineEnabled,
        atmEnabled: card.atmEnabled,
        contactlessEnabled: card.contactlessEnabled
      }
    };
  }

  // Get card block history
  async getCardBlockHistory(cardId, userId) {
    await this.getCardById(cardId, userId); // Verify ownership
    
    const logs = this.db.cardBlockLogs?.filter(log => log.cardId === cardId) || [];
    
    return logs.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get all block logs for user
  async getUserBlockLogs(userId, limit = 50) {
    const logs = this.db.cardBlockLogs?.filter(log => log.userId === userId) || [];
    
    return logs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  // Validate card for transaction
  async validateCardForTransaction(cardId, userId, amount, isInternational = false, isOnline = false) {
    const card = await this.getCardById(cardId, userId);

    // Check if card is blocked
    if (card.isBlocked()) {
      throw new Error(`Card is blocked. Reason: ${card.blockReason}`);
    }

    // Check if card is canceled
    if (card.status === 'canceled') {
      throw new Error('Card is canceled');
    }

    // Check international flag
    if (isInternational && !card.internationalEnabled) {
      throw new Error('International transactions not enabled for this card');
    }

    // Check online flag
    if (isOnline && !card.onlineEnabled) {
      throw new Error('Online transactions not enabled for this card');
    }

    // Check transaction limit
    if (amount > card.transactionLimit) {
      throw new Error(`Transaction amount exceeds card limit of $${card.transactionLimit}`);
    }

    // Check daily limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTransactions = this.db.transactions?.filter(t => 
      t.cardId === cardId &&
      new Date(t.createdAt) >= today
    ) || [];
    
    const dailyTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    if (dailyTotal + amount > card.dailyLimit) {
      throw new Error(`Daily limit exceeded. Remaining: $${(card.dailyLimit - dailyTotal).toFixed(2)}`);
    }

    // Check monthly limit
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyTransactions = this.db.transactions?.filter(t => 
      t.cardId === cardId &&
      new Date(t.createdAt) >= firstDayOfMonth
    ) || [];
    
    const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    if (monthlyTotal + amount > card.monthlyLimit) {
      throw new Error(`Monthly limit exceeded. Remaining: $${(card.monthlyLimit - monthlyTotal).toFixed(2)}`);
    }

    return {
      valid: true,
      card: {
        id: card.id,
        cardNumber: this.maskCardNumber(card.cardNumber),
        cardholderName: card.cardholderName
      }
    };
  }

  // Record card usage
  async recordCardUsage(cardId, userId, transactionId, amount) {
    const card = await this.getCardById(cardId, userId);
    card.lastUsedAt = new Date();
    card.updatedAt = new Date();
  }

  // Helper: Mask card number
  maskCardNumber(cardNumber) {
    return `**** **** **** ${cardNumber.slice(-4)}`;
  }

  // Helper: Log card action
  async logCardAction(cardId, userId, action, reason, performedBy, performedById, details) {
    const log = new CardBlockLog({
      cardId,
      userId,
      action,
      reason,
      performedBy,
      performedById,
      details
    });

    this.db.cardBlockLogs = this.db.cardBlockLogs || [];
    this.db.cardBlockLogs.push(log);

    return log;
  }

  // Helper: Trigger block actions (notifications, etc.)
  async triggerBlockActions(card, reason) {
    // This would integrate with notification service
    console.log(`[CardBlock] Card ${card.id} blocked. Reason: ${reason}`);
    
    // You can add:
    // - Send push notification to user
    // - Send email alert
    // - Trigger SMS
    // - Log to monitoring system
    // - Block any pending transactions
  }

  // Get card statistics for dashboard
  async getCardStatistics(userId) {
    const cards = await this.getUserCards(userId);
    
    const stats = {
      totalCards: cards.length,
      activeCards: cards.filter(c => c.status === 'active' && !c.isBlocked).length,
      blockedCards: cards.filter(c => c.status === 'blocked' || c.isBlocked).length,
      temporaryBlockedCards: cards.filter(c => c.status === 'temporary_blocked').length,
      canceledCards: cards.filter(c => c.status === 'canceled').length,
      physicalCards: cards.filter(c => c.cardType === 'physical').length,
      virtualCards: cards.filter(c => c.cardType === 'virtual').length,
      cardsByBrand: {
        visa: cards.filter(c => c.cardBrand === 'visa').length,
        mastercard: cards.filter(c => c.cardBrand === 'mastercard').length,
        elo: cards.filter(c => c.cardBrand === 'elo').length
      }
    };

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

module.exports = CardService;
