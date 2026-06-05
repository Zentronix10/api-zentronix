class NotificationController {
  constructor(notificationService) {
    this.notificationService = notificationService;
  }

  // Send notification
  async sendNotification(req, res) {
    try {
      const { userId, type, category, title, message, metadata } = req.body;
      const adminId = req.user.id;
      
      // Check admin permissions
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required to send notifications'
        });
      }
      
      const result = await this.notificationService.sendNotification(
        userId, type, category, title, message, metadata
      );
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Broadcast notification
  async broadcastNotification(req, res) {
    try {
      const { userIds, type, category, title, message, metadata } = req.body;
      const adminId = req.user.id;
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const result = await this.notificationService.broadcastNotification(
        userIds, type, category, title, message, metadata
      );
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Send template notification
  async sendTemplateNotification(req, res) {
    try {
      const { userId, templateName, placeholders, additionalData } = req.body;
      
      const result = await this.notificationService.sendTemplateNotification(
        userId, templateName, placeholders, additionalData
      );
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user notifications
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { type, category, status, startDate, endDate, limit, offset } = req.query;
      
      const result = await this.notificationService.getUserNotifications(userId, {
        type, category, status, startDate, endDate, limit, offset
      });
      
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

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      const userId = req.user.id;
      
      const result = await this.notificationService.markNotificationAsRead(notificationId, userId);
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Mark all as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await this.notificationService.markAllNotificationsAsRead(userId);
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      
      const count = await this.notificationService.getUnreadCount(userId);
      
      res.json({
        success: true,
        unreadCount: count
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get notification preferences
  async getPreferences(req, res) {
    try {
      const userId = req.user.id;
      
      const preferences = await this.notificationService.getUserPreferences(userId);
      
      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update notification preferences
  async updatePreferences(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;
      
      const preferences = await this.notificationService.updatePreferences(userId, updates);
      
      res.json({
        success: true,
        message: 'Preferences updated successfully',
        preferences
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Register push token
  async registerPushToken(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId, token, platform } = req.body;
      
      const result = await this.notificationService.registerPushToken(userId, deviceId, token, platform);
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Unregister push token
  async unregisterPushToken(req, res) {
    try {
      const userId = req.user.id;
      const { token } = req.body;
      
      const result = await this.notificationService.unregisterPushToken(userId, token);
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get statistics (admin only)
  async getStatistics(req, res) {
    try {
      const { userId, days } = req.query;
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const stats = await this.notificationService.getStatistics(userId, days ? parseInt(days) : 30);
      
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

  // Create template (admin only)
  async createTemplate(req, res) {
    try {
      const userId = req.user.id;
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const template = await this.notificationService.createTemplate(req.body, userId);
      
      res.json({
        success: true,
        message: 'Template created successfully',
        template
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get templates
  async getTemplates(req, res) {
    try {
      const { type, category, isActive } = req.query;
      
      const templates = await this.notificationService.getTemplates({
        type, category, isActive: isActive === 'true'
      });
      
      res.json({
        success: true,
        count: templates.length,
        templates
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update template (admin only)
  async updateTemplate(req, res) {
    try {
      const { templateId } = req.params;
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const template = await this.notificationService.updateTemplate(templateId, req.body);
      
      res.json({
        success: true,
        message: 'Template updated successfully',
        template
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete template (admin only)
  async deleteTemplate(req, res) {
    try {
      const { templateId } = req.params;
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const result = await this.notificationService.deleteTemplate(templateId);
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Test notification channel
  async testChannel(req, res) {
    try {
      const userId = req.user.id;
      const { channel } = req.params;
      
      const result = await this.notificationService.testChannel(userId, channel);
      
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
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const config = this.notificationService.getConfig();
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
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const config = this.notificationService.updateConfig(req.body);
      res.json({
        success: true,
        message: 'Configuration updated successfully',
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

module.exports = NotificationController;
