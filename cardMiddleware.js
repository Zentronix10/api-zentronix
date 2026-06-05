const CardService = require('../services/cardService');

const createCardMiddleware = (db) => {
  const cardService = new CardService(db);

  return {
    // Validate card before transaction
    validateCardForTransaction: async (req, res, next) => {
      try {
        const { cardId, amount, isInternational, isOnline } = req.body;
        const userId = req.user.id;

        const validation = await cardService.validateCardForTransaction(
          cardId,
          userId,
          amount,
          isInternational,
          isOnline
        );

        if (!validation.valid) {
          return res.status(403).json({
            success: false,
            message: 'Card validation failed',
            reason: validation.message
          });
        }

        req.validatedCard = validation.card;
        next();
      } catch (error) {
        res.status(403).json({
          success: false,
          message: error.message
        });
      }
    },

    // Check if card belongs to user
    checkCardOwnership: async (req, res, next) => {
      try {
        const { cardId } = req.params;
        const userId = req.user.id;

        const card = await cardService.getCardById(cardId, userId);
        
        if (!card) {
          return res.status(404).json({
            success: false,
            message: 'Card not found'
          });
        }

        req.card = card;
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
          message: 'Admin access required'
        });
      }
      next();
    }
  };
};

module.exports = createCardMiddleware;
