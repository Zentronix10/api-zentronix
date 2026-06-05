class CardUnblockController {
  constructor(cardUnblockService) {
    this.cardUnblockService = cardUnblockService;
  }

  // Initiate unblock request
  async initiateUnblock(req, res) {
    try {
      const { cardId, unblockMethod, verificationMethod } = req.body;
      const userId = req.user.id;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      const deviceId = req.headers['x-device-id'] || req.body.deviceId;

      if (!cardId || !unblockMethod || !verificationMethod) {
        return res.status(400).json({
          success: false,
          message: 'cardId, unblockMethod, and verificationMethod are required'
        });
      }

      const result = await this.cardUnblockService.initiateUnblock(
        cardId, userId, unblockMethod, verificationMethod, ipAddress, userAgent, deviceId
      );

      res.json({
        success: true,
        message: 'Unblock request initiated',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verify and unblock
  async verifyAndUnblock(req, res) {
    try {
      const { requestId, verificationCode, additionalData } = req.body;
      const userId = req.user.id;

      if (!requestId || !verificationCode) {
        return res.status(400).json({
          success: false,
          message: 'requestId and verificationCode are required'
        });
      }

      const result = await this.cardUnblockService.verifyAndUnblock(
        requestId, userId, verificationCode, additionalData
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Emergency unblock (admin only)
  async emergencyUnblock(req, res) {
    try {
      const { cardId, userId, reason, notes } = req.body;
      const adminId = req.user.id;

      if (!cardId || !userId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'cardId, userId, and reason are required'
        });
      }

      const result = await this.cardUnblockService.emergencyUnblock(
        cardId, userId, adminId, reason, notes
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Temporary unblock for transaction
  async temporaryUnblock(req, res) {
    try {
      const { cardId, amount, transactionId, durationMinutes } = req.body;
      const userId = req.user.id;

      if (!cardId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'cardId and amount are required'
        });
      }

      const result = await this.cardUnblockService.temporaryUnblockForTransaction(
        cardId, userId, amount, transactionId, durationMinutes || 5
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Cancel unblock request
  async cancelUnblockRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;

      const result = await this.cardUnblockService.cancelUnblockRequest(requestId, userId);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get unblock status
  async getUnblockStatus(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;

      const result = await this.cardUnblockService.getUnblockStatus(requestId, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get unblock history for card
  async getUnblockHistory(req, res) {
    try {
      const { cardId } = req.params;
      const userId = req.user.id;

      const history = await this.cardUnblockService.getUnblockHistory(cardId, userId);

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

  // Get user unblock attempts
  async getUserUnblockAttempts(req, res) {
    try {
      const userId = req.user.id;
      const { date } = req.query;

      const attempts = await this.cardUnblockService.getUserUnblockAttempts(userId, date ? new Date(date) : new Date());

      res.json({
        success: true,
        data: attempts
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get supported card networks
  async getSupportedNetworks(req, res) {
    try {
      const networks = this.cardUnblockService.getSupportedNetworks();

      res.json({
        success: true,
        networks
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get unblock statistics
  async getUnblockStatistics(req, res) {
    try {
      const userId = req.user.id;
      const { days } = req.query;

      const stats = await this.cardUnblockService.getUnblockStatistics(userId, days ? parseInt(days) : 30);

      res.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Validate temporary unblock session
  async validateTempSession(req, res) {
    try {
      const { sessionId, cardId } = req.body;
      const userId = req.user.id;

      const result = await this.cardUnblockService.validateTempUnblockSession(sessionId, cardId, userId);

      res.json(result);
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
      const config = this.cardUnblockService.getConfig();
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
      const config = this.cardUnblockService.updateConfig(newConfig);
      
      res.json({
        success: true,
        message: 'Unblock configuration updated',
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

module.exports = CardUnblockController;
