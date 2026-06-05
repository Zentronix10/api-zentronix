const express = require('express');
const CardUnblockController = require('../controllers/cardUnblockController');
const CardUnblockService = require('../services/cardUnblockService');
const CardService = require('../services/cardService');
const NotificationService = require('../services/notificationService');
const createCardUnblockMiddleware = require('../middlewares/cardUnblockMiddleware');

module.exports = (db, authMiddleware) => {
  const router = express.Router();
  
  // Initialize services
  const cardService = new CardService(db);
  const notificationService = new NotificationService(db);
  const cardUnblockService = new CardUnblockService(db, cardService, notificationService);
  const cardUnblockController = new CardUnblockController(cardUnblockService);
  const cardUnblockMiddleware = createCardUnblockMiddleware(db, cardUnblockService);
  
  // All routes require authentication
  router.use(authMiddleware);
  
  // Public unblock endpoints (for users)
  router.post('/unblock/initiate',
    cardUnblockMiddleware.rateLimitUnblock,
    cardUnblockMiddleware.validateUnblockMethod,
    cardUnblockMiddleware.checkCardForUnblock,
    (req, res) => cardUnblockController.initiateUnblock(req, res)
  );
  
  router.post('/unblock/verify',
    (req, res) => cardUnblockController.verifyAndUnblock(req, res)
  );
  
  router.post('/unblock/temporary',
    cardUnblockMiddleware.checkCardForUnblock,
    (req, res) => cardUnblockController.temporaryUnblock(req, res)
  );
  
  router.post('/unblock/validate-temp',
    (req, res) => cardUnblockController.validateTempSession(req, res)
  );
  
  router.delete('/unblock/:requestId/cancel',
    (req, res) => cardUnblockController.cancelUnblockRequest(req, res)
  );
  
  router.get('/unblock/:requestId/status',
    (req, res) => cardUnblockController.getUnblockStatus(req, res)
  );
  
  router.get('/cards/:cardId/unblock-history',
    (req, res) => cardUnblockController.getUnblockHistory(req, res)
  );
  
  router.get('/unblock/attempts',
    (req, res) => cardUnblockController.getUserUnblockAttempts(req, res)
  );
  
  router.get('/unblock/statistics',
    (req, res) => cardUnblockController.getUnblockStatistics(req, res)
  );
  
  router.get('/networks',
    (req, res) => cardUnblockController.getSupportedNetworks(req, res)
  );
  
  // Admin only routes
  router.post('/admin/emergency-unblock',
    cardUnblockMiddleware.requireAdmin,
    (req, res) => cardUnblockController.emergencyUnblock(req, res)
  );
  
  router.get('/admin/config',
    cardUnblockMiddleware.requireAdmin,
    (req, res) => cardUnblockController.getConfig(req, res)
  );
  
  router.put('/admin/config',
    cardUnblockMiddleware.requireAdmin,
    (req, res) => cardUnblockController.updateConfig(req, res)
  );
  
  return router;
};
