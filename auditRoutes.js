const express = require('express');
const AuditController = require('../controllers/auditController');
const AuditService = require('../services/auditService');
const createAuditMiddleware = require('../middlewares/auditMiddleware');

module.exports = (db, authMiddleware) => {
  const router = express.Router();
  
  // Initialize services
  const auditService = new AuditService(db);
  const auditController = new AuditController(auditService);
  const auditMiddleware = createAuditMiddleware(db, auditService);
  
  // All routes require authentication
  router.use(authMiddleware);
  
  // Audit log endpoints (require audit permission)
  router.get('/logs',
    auditMiddleware.requireAuditPermission,
    (req, res) => auditController.getLogs(req, res)
  );
  
  router.get('/logs/export',
    auditMiddleware.requireAuditPermission,
    (req, res) => auditController.exportLogs(req, res)
  );
  
  router.get('/statistics',
    auditMiddleware.requireAuditPermission,
    (req, res) => auditController.getStatistics(req, res)
  );
  
  // User activity endpoints
  router.get('/users/:userId/activity',
    (req, res) => auditController.getUserActivitySummary(req, res)
  );
  
  // Session management
  router.get('/sessions',
    (req, res) => auditController.getActiveSessions(req, res)
  );
  
  router.delete('/sessions/:sessionId',
    auditMiddleware.requireAdmin,
    (req, res) => auditController.terminateSession(req, res)
  );
  
  // Admin only endpoints
  router.post('/clean',
    auditMiddleware.requireAdmin,
    (req, res) => auditController.cleanOldLogs(req, res)
  );
  
  router.get('/config',
    auditMiddleware.requireAdmin,
    (req, res) => auditController.getConfig(req, res)
  );
  
  router.put('/config',
    auditMiddleware.requireAdmin,
    (req, res) => auditController.updateConfig(req, res)
  );
  
  return router;
};
