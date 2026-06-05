const express = require('express');
const TwoFactorController = require('../controllers/twoFactorController');
const TwoFactorService = require('../services/twoFactorService');
const createTwoFactorMiddleware = require('../middlewares/twoFactorMiddleware');

module.exports = (db, authMiddleware, notificationService) => {
  const router = express.Router();
  
  // Initialize services
  const twoFactorService = new TwoFactorService(db, notificationService);
  const twoFactorController = new TwoFactorController(twoFactorService);
  const twoFactorMiddleware = createTwoFactorMiddleware(db, twoFactorService);
  
  // Public routes (for login flow)
  router.post('/users/:userId/2fa/generate',
    twoFactorMiddleware.rateLimitTwoFactor,
    (req, res) => twoFactorController.generateLoginCode(req, res)
  );
  
  router.post('/users/:userId/2fa/verify',
    twoFactorMiddleware.rateLimitTwoFactor,
    (req, res) => twoFactorController.verifyLoginCode(req, res)
  );
  
  // Protected routes (require authentication)
  router.use(authMiddleware);
  router.use(twoFactorMiddleware.verifyTwoFactorToken);
  
  // 2FA setup and management
  router.post('/2fa/setup',
    (req, res) => twoFactorController.setupTwoFactor(req, res)
  );
  
  router.post('/2fa/enable',
    (req, res) => twoFactorController.verifyAndEnable(req, res)
  );
  
  router.post('/2fa/disable',
    twoFactorMiddleware.requireTwoFactor,
    (req, res) => twoFactorController.disableTwoFactor(req, res)
  );
  
  router.get('/2fa/status',
    (req, res) => twoFactorController.getTwoFactorStatus(req, res)
  );
  
  router.get('/2fa/backup-codes',
    twoFactorMiddleware.requireTwoFactor,
    (req, res) => twoFactorController.getBackupCodes(req, res)
  );
  
  router.post('/2fa/backup-codes/regenerate',
    twoFactorMiddleware.requireTwoFactor,
    (req, res) => twoFactorController.regenerateBackupCodes(req, res)
  );
  
  router.get('/2fa/methods',
    (req, res) => twoFactorController.getAvailableMethods(req, res)
  );
  
  router.get('/2fa/requires/:role',
    (req, res) => twoFactorController.requiresTwoFactor(req, res)
  );
  
  // Admin only routes
  router.get('/admin/statistics',
    twoFactorMiddleware.requireAdmin,
    (req, res) => twoFactorController.getStatistics(req, res)
  );
  
  router.get('/admin/config',
    twoFactorMiddleware.requireAdmin,
    (req, res) => twoFactorController.getConfig(req, res)
  );
  
  router.put('/admin/config',
    twoFactorMiddleware.requireAdmin,
    (req, res) => twoFactorController.updateConfig(req, res)
  );
  
  router.post('/admin/emergency-disable',
    twoFactorMiddleware.requireAdmin,
    (req, res) => twoFactorController.emergencyDisable(req, res)
  );
  
  return router;
};
