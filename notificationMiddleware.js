const createNotificationMiddleware = (db, notificationService) => {
  return {
    // Rate limit notifications
    rateLimitNotifications: async (req, res, next) => {
      const userId = req.user?.id || req.body.userId;
      const ipAddress = req.ip;
      
      // Get recent notifications for user
      const recentNotifications = db.notifications?.filter(n => 
        (n.userId === userId || n.recipient === ipAddress) &&
        new Date(n.createdAt) > new Date(Date.now() - 60 * 1000) // Last minute
      ) || [];
      
      const config = notificationService.getConfig();
      
      if (recentNotifications.length >= config.rateLimiting.maxPerMinute) {
        return res.status(429).json({
          success: false,
          message: 'Too many notifications. Please try again later.',
          retryAfter: 60
        });
      }
      
      next();
    },

    // Validate notification payload
    validateNotification: (req, res, next) => {
      const { userId, type, category, title, message } = req.body;
      
      if (!userId || !type || !category || !title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: userId, type, category, title, message'
        });
      }
      
      const validTypes = ['email', 'sms', 'push', 'in_app', 'whatsapp'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        });
      }
      
      const validCategories = ['transaction', 'security', 'promotion', 'alert', 'update', 'document'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        });
      }
      
      if (title.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Title must be less than 100 characters'
        });
      }
      
      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Message must be less than 1000 characters'
        });
      }
      
      next();
    },

    // Validate template payload
    validateTemplate: (req, res, next) => {
      const { name, type, category, subject, body } = req.body;
      
      if (!name || !type || !category || !body) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, type, category, body'
        });
      }
      
      const validTypes = ['email', 'sms', 'push', 'in_app'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`
        });
      }
      
      next();
    },

    // Log notification activity
    logNotificationActivity: async (req, res, next) => {
      const startTime = Date.now();
      
      const originalSend = res.send;
      
      res.send = function(data) {
        const responseTime = Date.now() - startTime;
        
        console.log(`[Notification] User: ${req.user?.id}, Path: ${req.path}, Status: ${res.statusCode}, Time: ${responseTime}ms`);
        
        originalSend.call(this, data);
      };
      
      next();
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
    }
  };
};

module.exports = createNotificationMiddleware;
