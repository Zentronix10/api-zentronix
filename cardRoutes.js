const express = require('express');
const CardController = require('../controllers/cardController');
const CardService = require('../services/cardService');
const createCardMiddleware = require('../middlewares/cardMiddleware');

module.exports = (db, authMiddleware) => {
  const router = express.Router();
  const cardService = new CardService(db);
  const cardController = new CardController(cardService);
  const cardMiddleware = createCardMiddleware(db);

  // All routes require authentication
  router.use(authMiddleware);

  // Card management
  router.post('/cards', (req, res) => cardController.createCard(req, res));
  router.get('/cards', (req, res) => cardController.getUserCards(req, res));
  router.get('/cards/statistics', (req, res) => cardController.getCardStatistics(req, res));
  router.get('/cards/logs', (req, res) => cardController.getUserBlockLogs(req, res));
  
  // Card operations (with ownership check)
  router.get('/cards/:cardId', cardMiddleware.checkCardOwnership, (req, res) => cardController.getCardById(req, res));
  
  // Block/Unblock operations - Instant blocking
  router.post('/cards/:cardId/block', cardMiddleware.checkCardOwnership, (req, res) => cardController.instantBlockCard(req, res));
  router.post('/cards/:cardId/temporary-block', cardMiddleware.checkCardOwnership, (req, res) => cardController.instantTemporaryBlockCard(req, res));
  router.post('/cards/:cardId/unblock', cardMiddleware.checkCardOwnership, (req, res) => cardController.unblockCard(req, res));
  router.post('/cards/:cardId/cancel', cardMiddleware.checkCardOwnership, (req, res) => cardController.cancelCard(req, res));
  
  // Card settings
  router.put('/cards/:cardId/limits', cardMiddleware.checkCardOwnership, (req, res) => cardController.updateCardLimits(req, res));
  router.put('/cards/:cardId/flags', cardMiddleware.checkCardOwnership, (req, res) => cardController.updateCardFlags(req, res));
  
  // Card history
  router.get('/cards/:cardId/history', cardMiddleware.checkCardOwnership, (req, res) => cardController.getCardBlockHistory(req, res));
  
  // Card validation (for transactions)
  router.post('/cards/validate', (req, res) => cardController.validateCard(req, res));
  
  // Admin routes
  router.get('/admin/config', cardMiddleware.requireAdmin, (req, res) => cardController.getConfig(req, res));
  router.put('/admin/config', cardMiddleware.requireAdmin, (req, res) => cardController.updateConfig(req, res));

  return router;
};
