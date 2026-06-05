const express = require('express');
const NotificationController = require('../controllers/notificationController');
const NotificationService = require('../services/notificationService');
const createNotificationMiddleware = require('../middlewares/notificationMiddleware');

module.exports = (db, authMiddleware) => {
  const router = express.Router();
  
  // Initialize services
  const notificationService = new NotificationService(db);
  const notificationController = new NotificationController(notificationService);
  const notificationMiddleware = createNotificationMiddleware(db, notificationService);
  
  // All routes require authentication
  router.use(authMiddleware);
  
  // User notification endpoints
  router.get('/notifications',
    (req, res) => notificationController.getUserNotifications(req, res)
  );
  
  router.get('/notifications/unread-count',
    (req, res) => notificationController.getUnreadCount(req, res)
  );
  
  router.put('/notifications/:notificationId/read',
    (req, res) => notificationController.markAsRead(req, res)
  );
  
  router.post('/notifications/mark-all-read',
    (req, res) => notificationController.markAllAsRead(req, res)
  );
  
  // Push token management
  router.post('/notifications/push-token',
    (req, res) => notificationController.registerPushToken(req, res)
  );
  
  router.delete('/notifications/push-token',
    (req, res) => notificationController.unregisterPushToken(req, res)
  );
  
  // Notification preferences
  router.get('/notifications/preferences',
    (req, res) => notificationController.getPreferences(req, res)
  );
  
  router.put('/notifications/preferences',
    (req, res) => notificationController.updatePreferences(req, res)
  );
  
  // Test notification channel
  router.post('/notifications/test/:channel',
    (req, res) => notificationController.testChannel(req, res)
  );
  
  // Template management (admin only)
  router.get('/notifications/templates',
    notificationMiddleware.requireAdmin,
    (req, res) => notificationController.getTemplates(req, res)
  );
  
  router.post('/notifications/templates',
    notificationMiddleware.requireAdmin,
    notificationMiddleware.validateTemplate,
    (req, res) => notificationController.createTemplate(req, res)
  );
  
  router.put('/notifications/templates/:templateId',
    notificationMiddleware.requireAdmin,
    (req, res) => notificationController.updateTemplate(req, res)
  );
  
  router.delete('/notifications/templates/:templateId',
    notificationMiddleware.requireAdmin,
    (req, res) => notificationController.deleteTemplate(req, res)
  );
  
  // Send notifications (admin only)
  router.post('/notifications/send',
    notificationMiddleware.requireAdmin,
    notificationMiddleware.rateLimitNotifications,
    notificationMiddleware.validateNotification,
    (req, res) => notificationController.sendNotification(req, res)
  );
  
  router.post('/notifications/broadcast',
    notificationMiddleware.requireAdmin,
    notificationMiddleware.validateNotification,
    (req, res) => notificationController.broadcastNotification(req, res)
  );
  
  router.post('/notifications/template/send',
    notificationMiddleware.requireAdmin,
    (req, res) => notificationController.sendTemplateNotification(req, res)
  );
  
  // Statistics and configuration (admin only)
  router.get('/notifications/admin/statistics',
    notificationMiddleware.requireAdmin,
    (req, res) => notificationController.getStatistics(req, res)
  );
  
  router.get('/notifications/admin/config',
    notificationMiddleware.requireAdmin,
    (req, res) => notificationController.getConfig(req, res)
  );
  
  router.put('/notifications/admin/config',
    notificationMiddleware.requireAdmin,
    (req, res) => notificationController.updateConfig(req, res)
  );
  
  return router;
};
