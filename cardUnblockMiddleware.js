const createCardUnblockMiddleware = (db, cardUnblockService) => {
  return {
    // Rate limiting for unblock requests
    rateLimitUnblock: async (req, res, next) => {
      const userId = req.user.id;
      const ipAddress = req.ip;
      
      // Check rate limit per user
      const todayAttempts = await cardUnblockService.getUserUnblockAttempts(userId);
      
      if (todayAttempts.count >= todayAttempts.maxAllowed) {
        return res.status(429).json({
          success: false,
          message: `Too many unblock attempts. Maximum ${todayAttempts.maxAllowed} per day.`,
          retryAfter: '24 hours'
        });
      }
      
      next();
    },

    // Validate unblock method
    validateUnblockMethod: (req, res, next) => {
      const { unblockMethod, verificationMethod } = req.body;
      const config = cardUnblockService.getConfig();
      
      if (unblockMethod && !config.supportedUnblockMethods.includes(unblockMethod)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported unblock method. Supported: ${config.supportedUnblockMethods.join(', ')}`
        });
      }
      
      if (verificationMethod && !config.supportedVerificationMethods.includes(verificationMethod)) {
        return res.status(400).json({
          success: false,
          message: `Unsupported verification method. Supported: ${config.supportedVerificationMethods.join(', ')}`
        });
      }
      
      next();
    },

    // Check card ownership and block status
    checkCardForUnblock: async (req, res, next) => {
      try {
        const { cardId } = req.body;
        const userId = req.user.id;
        
        const cardService = require('../services/cardService');
        const cardSvc = new cardService(db);
        const card = await cardSvc.getCardById(cardId, userId);
        
        if (!card.isBlocked()) {
          return res.status(400).json({
            success: false,
            message: 'Card is not blocked. Unblock operation not needed.'
          });
        }
        
        if (card.status === 'canceled') {
          return res.status(400).json({
            success: false,
            message: 'Canceled cards cannot be unblocked'
          });
        }
        
        req.cardForUnblock = card;
        next();
      } catch (error) {
        res.status(404).json({
          success: false,
          message: error.message
        });
      }
    },

    // Require admin role
    requireAdmin: (req, res, next) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required for this operation'
        });
      }
      next();
    },

    // Log all unblock attempts
    logUnblockAttempt: async (req, res, next) => {
      const startTime = Date.now();
      
      // Store original send function
      const originalSend = res.send;
      
      res.send = function(data) {
        const responseTime = Date.now() - startTime;
        
        // Log the attempt
        console.log(`[UnblockLog] User: ${req.user?.id}, Path: ${req.path}, Status: ${res.statusCode}, Time: ${responseTime}ms`);
        
        originalSend.call(this, data);
      };
      
      next();
    }
  };
};

module.exports = createCardUnblockMiddleware;
