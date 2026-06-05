class CardController {
  constructor(cardService) {
    this.cardService = cardService;
  }

  // Create new card
  async createCard(req, res) {
    try {
      const { accountId, cardholderName, cardType, cardBrand, dailyLimit, monthlyLimit, transactionLimit } = req.body;
      const userId = req.user.id;

      const card = await this.cardService.createCard(userId, accountId, {
        cardholderName,
        cardType,
        cardBrand,
        dailyLimit,
        monthlyLimit,
        transactionLimit
      });

      res.json({
        success: true,
        message: 'Card created successfully',
        card: {
          id: card.id,
          cardNumber: this.cardService.maskCardNumber(card.cardNumber),
          cardholderName: card.cardholderName,
          cardType: card.cardType,
          cardBrand: card.cardBrand,
          expirationMonth: card.expirationMonth,
          expirationYear: card.expirationYear,
          cvv: card.cvv,
          status: card.status,
          dailyLimit: card.dailyLimit,
          monthlyLimit: card.monthlyLimit,
          transactionLimit: card.transactionLimit
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all user cards
  async getUserCards(req, res) {
    try {
      const userId = req.user.id;
      const cards = await this.cardService.getUserCards(userId);
      const stats = await this.cardService.getCardStatistics(userId);

      res.json({
        success: true,
        stats,
        count: cards.length,
        cards
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get card details
  async getCardById(req, res) {
    try {
      const { cardId } = req.params;
      const userId = req.user.id;

      const card = await this.cardService.getCardById(cardId, userId);

      res.json({
        success: true,
        card: {
          id: card.id,
          cardNumber: this.cardService.maskCardNumber(card.cardNumber),
          cardholderName: card.cardholderName,
          cardType: card.cardType,
          cardBrand: card.cardBrand,
          status: card.status,
          blockReason: card.blockReason,
          blockedAt: card.blockedAt,
          temporaryBlockExpiresAt: card.temporaryBlockExpiresAt,
          isBlocked: card.isBlocked(),
          dailyLimit: card.dailyLimit,
          monthlyLimit: card.monthlyLimit,
          transactionLimit: card.transactionLimit,
          internationalEnabled: card.internationalEnabled,
          onlineEnabled: card.onlineEnabled,
          atmEnabled: card.atmEnabled,
          contactlessEnabled: card.contactlessEnabled,
          lastUsedAt: card.lastUsedAt,
          createdAt: card.createdAt
        }
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  // Instant block card
  async instantBlockCard(req, res) {
    try {
      const { cardId } = req.params;
      const { reason, details } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Block reason is required'
        });
      }

      const result = await this.cardService.instantBlockCard(
        cardId, 
        userId, 
        reason, 
        'user', 
        ipAddress, 
        userAgent, 
        details
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Instant temporary block card
  async instantTemporaryBlockCard(req, res) {
    try {
      const { cardId } = req.params;
      const { reason, hours } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Block reason is required'
        });
      }

      const result = await this.cardService.instantTemporaryBlockCard(
        cardId, 
        userId, 
        reason, 
        'user', 
        hours, 
        ipAddress, 
        userAgent
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Unblock card
  async unblockCard(req, res) {
    try {
      const { cardId } = req.params;
      const userId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await this.cardService.unblockCard(
        cardId, 
        userId, 
        'user', 
        ipAddress, 
        userAgent
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Cancel card (permanent)
  async cancelCard(req, res) {
    try {
      const { cardId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required'
        });
      }

      const result = await this.cardService.cancelCard(
        cardId, 
        userId, 
        'user', 
        reason, 
        ipAddress, 
        userAgent
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update card limits
  async updateCardLimits(req, res) {
    try {
      const { cardId } = req.params;
      const { dailyLimit, monthlyLimit, transactionLimit } = req.body;
      const userId = req.user.id;

      const result = await this.cardService.updateCardLimits(cardId, userId, {
        dailyLimit,
        monthlyLimit,
        transactionLimit
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update card flags
  async updateCardFlags(req, res) {
    try {
      const { cardId } = req.params;
      const { internationalEnabled, onlineEnabled, atmEnabled, contactlessEnabled } = req.body;
      const userId = req.user.id;

      const result = await this.cardService.updateCardFlags(cardId, userId, {
        internationalEnabled,
        onlineEnabled,
        atmEnabled,
        contactlessEnabled
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get card block history
  async getCardBlockHistory(req, res) {
    try {
      const { cardId } = req.params;
      const userId = req.user.id;

      const history = await this.cardService.getCardBlockHistory(cardId, userId);

      res.json({
        success: true,
        count: history.length,
        history
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user block logs
  async getUserBlockLogs(req, res) {
    try {
      const userId = req.user.id;
      const { limit } = req.query;

      const logs = await this.cardService.getUserBlockLogs(userId, limit ? parseInt(limit) : 50);

      res.json({
        success: true,
        count: logs.length,
        logs
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Validate card for transaction
  async validateCard(req, res) {
    try {
      const { cardId, amount, isInternational, isOnline } = req.body;
      const userId = req.user.id;

      const validation = await this.cardService.validateCardForTransaction(
        cardId, 
        userId, 
        amount, 
        isInternational, 
        isOnline
      );

      res.json(validation);
    } catch (error) {
      res.status(400).json({
        success: false,
        valid: false,
        message: error.message
      });
    }
  }

  // Get card statistics
  async getCardStatistics(req, res) {
    try {
      const userId = req.user.id;
      const stats = await this.cardService.getCardStatistics(userId);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get configuration (admin only)
  async getConfig(req, res) {
    try {
      const config = this.cardService.getConfig();
      res.json({
        success: true,
        config
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update configuration (admin only)
  async updateConfig(req, res) {
    try {
      const newConfig = req.body;
      const config = this.cardService.updateConfig(newConfig);
      
      res.json({
        success: true,
        message: 'Card configuration updated',
        config
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = CardController;
