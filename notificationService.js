const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const admin = require('firebase-admin');

class NotificationService {
  constructor(db, config = {}) {
    this.db = db;
    
    this.config = {
      email: {
        enabled: true,
        from: config.emailFrom || 'noreply@zentronixbank.com',
        fromName: config.emailFromName || 'Zentronix Bank',
        provider: config.emailProvider || 'smtp', // smtp, sendgrid, aws_ses
        smtp: {
          host: config.smtpHost || 'smtp.gmail.com',
          port: config.smtpPort || 587,
          secure: config.smtpSecure || false,
          auth: {
            user: config.smtpUser,
            pass: config.smtpPass
          }
        }
      },
      sms: {
        enabled: true,
        provider: config.smsProvider || 'twilio', // twilio, vonage, aws_sns
        twilio: {
          accountSid: config.twilioAccountSid,
          authToken: config.twilioAuthToken,
          fromNumber: config.twilioFromNumber
        }
      },
      push: {
        enabled: true,
        provider: config.pushProvider || 'fcm', // fcm, apns
        fcm: {
          credential: config.fcmCredential
        }
      },
      whatsapp: {
        enabled: false,
        provider: config.whatsappProvider || 'twilio',
        twilio: {
          accountSid: config.twilioAccountSid,
          authToken: config.twilioAuthToken,
          fromNumber: config.whatsappFromNumber
        }
      },
      inApp: {
        enabled: true,
        retentionDays: 30
      },
      retry: {
        maxAttempts: 3,
        backoffDelay: 5000, // 5 seconds
        maxDelay: 60000 // 1 minute
      },
      rateLimiting: {
        enabled: true,
        maxPerMinute: 60,
        maxPerHour: 1000,
        maxPerDay: 5000
      }
    };
    
    // Initialize email transporter
    if (this.config.email.enabled) {
      this.emailTransporter = nodemailer.createTransport(this.config.email.smtp);
    }
    
    // Initialize Twilio client
    if (this.config.sms.enabled && this.config.sms.provider === 'twilio') {
      this.twilioClient = twilio(
        this.config.sms.twilio.accountSid,
        this.config.sms.twilio.authToken
      );
    }
    
    // Initialize Firebase Admin for push notifications
    if (this.config.push.enabled && this.config.push.provider === 'fcm') {
      if (this.config.push.fcm.credential) {
        admin.initializeApp({
          credential: admin.credential.cert(this.config.push.fcm.credential)
        });
        this.fcm = admin.messaging();
      }
    }
  }

  // Send notification to a single user
  async sendNotification(userId, type, category, title, message, metadata = {}) {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Check if user has opted out
      if (preferences.globalOptOut) {
        return { success: false, message: 'User has globally opted out' };
      }
      
      // Check if category is enabled
      if (!preferences.categories[category]?.enabled) {
        return { success: false, message: `Category ${category} is disabled` };
      }
      
      // Check if channel is enabled for category
      if (!preferences.isChannelEnabledForCategory(type, category)) {
        return { success: false, message: `Channel ${type} not enabled for category ${category}` };
      }
      
      // Check silent hours
      if (!preferences.shouldSendDuringSilentHours() && type !== 'critical') {
        return { success: false, message: 'Notification during silent hours prevented' };
      }
      
      // Get user details
      const user = this.db.users?.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get recipient based on channel
      let recipient = null;
      switch(type) {
        case 'email':
          recipient = user.email;
          break;
        case 'sms':
          recipient = user.phone;
          break;
        case 'push':
          recipient = preferences.channels.push.tokens[0]?.token;
          break;
        case 'whatsapp':
          recipient = user.phone;
          break;
        case 'in_app':
          recipient = userId;
          break;
      }
      
      if (!recipient && type !== 'in_app') {
        return { success: false, message: `No recipient found for channel ${type}` };
      }
      
      // Create notification record
      const notification = new Notification({
        userId,
        type,
        category,
        title,
        message,
        recipient,
        metadata,
        priority: this.getPriorityFromCategory(category)
      });
      
      this.db.notifications = this.db.notifications || [];
      this.db.notifications.push(notification);
      
      // Send via appropriate channel
      let deliveryResult;
      switch(type) {
        case 'email':
          deliveryResult = await this.sendEmail(user, notification, preferences);
          break;
        case 'sms':
          deliveryResult = await this.sendSms(user, notification);
          break;
        case 'push':
          deliveryResult = await this.sendPushNotification(user, notification);
          break;
        case 'whatsapp':
          deliveryResult = await this.sendWhatsApp(user, notification);
          break;
        case 'in_app':
          deliveryResult = await this.sendInAppNotification(user, notification);
          break;
        default:
          throw new Error(`Unsupported notification type: ${type}`);
      }
      
      if (deliveryResult.success) {
        notification.markSent();
        if (deliveryResult.delivered) {
          notification.markDelivered();
        }
      } else {
        notification.markFailed(deliveryResult.error);
        
        // Schedule retry if needed
        if (notification.canRetry()) {
          await this.scheduleRetry(notification);
        }
      }
      
      return {
        success: deliveryResult.success,
        notificationId: notification.id,
        trackingId: notification.trackingId,
        channel: type,
        error: deliveryResult.error
      };
      
    } catch (error) {
      console.error('[NotificationService] Error sending notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send email notification
  async sendEmail(user, notification) {
    try {
      const mailOptions = {
        from: `"${this.config.email.fromName}" <${this.config.email.from}>`,
        to: user.email,
        subject: notification.title,
        text: notification.message,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1a2a3a; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">Zentronix Bank</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #1a2a3a;">${notification.title}</h2>
            <p style="color: #333333; line-height: 1.6;">${notification.message}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
            <p style="color: #666666; font-size: 12px;">
              This is an automated message from Zentronix Bank. Please do not reply to this email.
            </p>
          </div>
        </div>`
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      
      return { success: true, delivered: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send SMS notification
  async sendSms(user, notification) {
    try {
      if (this.config.sms.provider === 'twilio') {
        await this.twilioClient.messages.create({
          body: `[Zentronix Bank] ${notification.message}`,
          to: user.phone,
          from: this.config.sms.twilio.fromNumber
        });
      }
      
      return { success: true, delivered: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send push notification
  async sendPushNotification(user, notification) {
    try {
      const preferences = await this.getUserPreferences(user.id);
      const tokens = preferences.channels.push.tokens.map(t => t.token);
      
      if (tokens.length === 0) {
        return { success: false, error: 'No push tokens found' };
      }
      
      if (this.config.push.provider === 'fcm' && this.fcm) {
        const message = {
          notification: {
            title: notification.title,
            body: notification.message
          },
          data: {
            notificationId: notification.id,
            category: notification.category,
            timestamp: new Date().toISOString(),
            ...notification.metadata
          },
          tokens: tokens
        };
        
        const response = await this.fcm.sendEachForMulticast(message);
        
        // Remove invalid tokens
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            preferences.removePushToken(tokens[idx]);
          }
        });
        
        return { success: true, delivered: response.successCount > 0 };
      }
      
      return { success: false, error: 'Push provider not configured' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send WhatsApp notification
  async sendWhatsApp(user, notification) {
    try {
      if (this.config.whatsapp.enabled && this.config.whatsapp.provider === 'twilio') {
        await this.twilioClient.messages.create({
          body: `Zentronix Bank: ${notification.message}`,
          to: `whatsapp:${user.phone}`,
          from: `whatsapp:${this.config.whatsapp.twilio.fromNumber}`
        });
        
        return { success: true, delivered: true };
      }
      
      return { success: false, error: 'WhatsApp not configured' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send in-app notification
  async sendInAppNotification(user, notification) {
    try {
      // Store in in-app notification inbox
      this.db.inAppNotifications = this.db.inAppNotifications || [];
      this.db.inAppNotifications.push({
        id: notification.id,
        userId: user.id,
        title: notification.title,
        message: notification.message,
        category: notification.category,
        metadata: notification.metadata,
        read: false,
        createdAt: notification.createdAt
      });
      
      return { success: true, delivered: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Broadcast notification to multiple users
  async broadcastNotification(userIds, type, category, title, message, metadata = {}) {
    const results = [];
    
    for (const userId of userIds) {
      const result = await this.sendNotification(userId, type, category, title, message, metadata);
      results.push(result);
    }
    
    return {
      success: true,
      total: userIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // Send template-based notification
  async sendTemplateNotification(userId, templateName, placeholders = {}, additionalData = {}) {
    const template = this.db.notificationTemplates?.find(t => t.name === templateName && t.isActive);
    
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    const rendered = template.render(placeholders);
    
    return await this.sendNotification(
      userId,
      template.type,
      template.category,
      rendered.title || rendered.subject,
      rendered.body,
      {
        templateName,
        placeholders,
        ...additionalData
      }
    );
  }

  // Get user notifications
  async getUserNotifications(userId, filters = {}) {
    let notifications = this.db.notifications?.filter(n => n.userId === userId) || [];
    
    if (filters.type) {
      notifications = notifications.filter(n => n.type === filters.type);
    }
    
    if (filters.category) {
      notifications = notifications.filter(n => n.category === filters.category);
    }
    
    if (filters.status) {
      notifications = notifications.filter(n => n.status === filters.status);
    }
    
    if (filters.startDate) {
      notifications = notifications.filter(n => new Date(n.createdAt) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      notifications = notifications.filter(n => new Date(n.createdAt) <= new Date(filters.endDate));
    }
    
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const sorted = notifications.sort((a, b) => b.createdAt - a.createdAt);
    
    return {
      total: sorted.length,
      limit,
      offset,
      notifications: sorted.slice(offset, offset + limit)
    };
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId, userId) {
    const notification = this.db.notifications?.find(n => n.id === notificationId && n.userId === userId);
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    notification.markRead();
    
    // Also mark in-app notification
    const inAppNotification = this.db.inAppNotifications?.find(n => n.id === notificationId);
    if (inAppNotification) {
      inAppNotification.read = true;
      inAppNotification.readAt = new Date();
    }
    
    return { success: true, notification };
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(userId) {
    const notifications = this.db.notifications?.filter(n => n.userId === userId && n.type === 'in_app') || [];
    
    for (const notification of notifications) {
      notification.markRead();
    }
    
    const inAppNotifications = this.db.inAppNotifications?.filter(n => n.userId === userId && !n.read) || [];
    for (const notification of inAppNotifications) {
      notification.read = true;
      notification.readAt = new Date();
    }
    
    return {
      success: true,
      count: notifications.length + inAppNotifications.length
    };
  }

  // Get unread count
  async getUnreadCount(userId) {
    const notifications = this.db.notifications?.filter(n => 
      n.userId === userId && 
      n.type === 'in_app' && 
      !n.readAt
    ) || [];
    
    const inAppNotifications = this.db.inAppNotifications?.filter(n => 
      n.userId === userId && 
      !n.read
    ) || [];
    
    return notifications.length + inAppNotifications.length;
  }

  // Get user notification preferences
  async getUserPreferences(userId) {
    let preferences = this.db.notificationPreferences?.find(p => p.userId === userId);
    
    if (!preferences) {
      preferences = new NotificationPreference({ userId });
      this.db.notificationPreferences = this.db.notificationPreferences || [];
      this.db.notificationPreferences.push(preferences);
    }
    
    return preferences;
  }

  // Update notification preferences
  async updatePreferences(userId, updates) {
    const preferences = await this.getUserPreferences(userId);
    
    if (updates.channels) {
      for (const [channel, settings] of Object.entries(updates.channels)) {
        preferences.updateChannel(channel, settings);
      }
    }
    
    if (updates.categories) {
      for (const [category, settings] of Object.entries(updates.categories)) {
        preferences.updateCategory(category, settings);
      }
    }
    
    if (updates.globalOptOut !== undefined) {
      preferences.globalOptOut = updates.globalOptOut;
    }
    
    if (updates.silentHours) {
      preferences.silentHours = { ...preferences.silentHours, ...updates.silentHours };
    }
    
    preferences.updatedAt = new Date();
    
    return preferences;
  }

  // Register push token
  async registerPushToken(userId, deviceId, token, platform) {
    const preferences = await this.getUserPreferences(userId);
    preferences.addPushToken(deviceId, token, platform);
    
    return { success: true };
  }

  // Unregister push token
  async unregisterPushToken(userId, token) {
    const preferences = await this.getUserPreferences(userId);
    preferences.removePushToken(token);
    
    return { success: true };
  }

  // Schedule retry for failed notification
  async scheduleRetry(notification) {
    const delay = Math.min(
      this.config.retry.backoffDelay * Math.pow(2, notification.retryCount),
      this.config.retry.maxDelay
    );
    
    setTimeout(async () => {
      notification.incrementRetry();
      
      const user = this.db.users?.find(u => u.id === notification.userId);
      
      let retryResult;
      switch(notification.type) {
        case 'email':
          retryResult = await this.sendEmail(user, notification);
          break;
        case 'sms':
          retryResult = await this.sendSms(user, notification);
          break;
        case 'push':
          retryResult = await this.sendPushNotification(user, notification);
          break;
        case 'whatsapp':
          retryResult = await this.sendWhatsApp(user, notification);
          break;
        default:
          return;
      }
      
      if (retryResult.success) {
        notification.markSent();
        if (retryResult.delivered) {
          notification.markDelivered();
        }
      } else if (notification.canRetry()) {
        await this.scheduleRetry(notification);
      } else {
        notification.markFailed(retryResult.error);
      }
    }, delay);
  }

  // Get notification statistics
  async getStatistics(userId = null, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let notifications = this.db.notifications || [];
    
    if (userId) {
      notifications = notifications.filter(n => n.userId === userId);
    }
    
    notifications = notifications.filter(n => new Date(n.createdAt) >= cutoffDate);
    
    const stats = {
      total: notifications.length,
      byStatus: {
        pending: notifications.filter(n => n.status === 'pending').length,
        sent: notifications.filter(n => n.status === 'sent').length,
        delivered: notifications.filter(n => n.status === 'delivered').length,
        read: notifications.filter(n => n.status === 'read').length,
        failed: notifications.filter(n => n.status === 'failed').length
      },
      byType: {},
      byCategory: {},
      successRate: 0,
      averageDeliveryTime: 0
    };
    
    // Group by type
    notifications.forEach(n => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
    });
    
    // Group by category
    notifications.forEach(n => {
      stats.byCategory[n.category] = (stats.byCategory[n.category] || 0) + 1;
    });
    
    // Calculate success rate
    const deliveredOrRead = stats.byStatus.delivered + stats.byStatus.read;
    stats.successRate = stats.total > 0 ? (deliveredOrRead / stats.total) * 100 : 0;
    
    // Calculate average delivery time
    const deliveredNotifications = notifications.filter(n => n.deliveredAt && n.createdAt);
    if (deliveredNotifications.length > 0) {
      const totalTime = deliveredNotifications.reduce((sum, n) => {
        return sum + (new Date(n.deliveredAt) - new Date(n.createdAt));
      }, 0);
      stats.averageDeliveryTime = totalTime / deliveredNotifications.length / 1000; // seconds
    }
    
    return stats;
  }

  // Create notification template
  async createTemplate(templateData, userId) {
    const template = new NotificationTemplate({
      ...templateData,
      createdBy: userId
    });
    
    this.db.notificationTemplates = this.db.notificationTemplates || [];
    this.db.notificationTemplates.push(template);
    
    return template;
  }

  // Get notification templates
  async getTemplates(filters = {}) {
    let templates = this.db.notificationTemplates || [];
    
    if (filters.type) {
      templates = templates.filter(t => t.type === filters.type);
    }
    
    if (filters.category) {
      templates = templates.filter(t => t.category === filters.category);
    }
    
    if (filters.isActive !== undefined) {
      templates = templates.filter(t => t.isActive === filters.isActive);
    }
    
    return templates;
  }

  // Update template
  async updateTemplate(templateId, updates) {
    const template = this.db.notificationTemplates?.find(t => t.id === templateId);
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    Object.assign(template, updates);
    template.version++;
    template.updatedAt = new Date();
    
    return template;
  }

  // Delete template
  async deleteTemplate(templateId) {
    const index = this.db.notificationTemplates?.findIndex(t => t.id === templateId);
    
    if (index === -1) {
      throw new Error('Template not found');
    }
    
    this.db.notificationTemplates.splice(index, 1);
    
    return { success: true };
  }

  // Helper: Get priority from category
  getPriorityFromCategory(category) {
    const priorities = {
      security: 'critical',
      alert: 'high',
      transaction: 'normal',
      document: 'normal',
      update: 'low',
      promotion: 'low'
    };
    
    return priorities[category] || 'normal';
  }

  // Get configuration
  getConfig() {
    return this.config;
  }

  // Update configuration (admin only)
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }

  // Test notification channel
  async testChannel(userId, channel) {
    const testResult = {
      channel,
      success: false,
      message: '',
      timestamp: new Date()
    };
    
    try {
      const result = await this.sendNotification(
        userId,
        channel,
        'alert',
        'Test Notification',
        `This is a test notification from Zentronix Bank via ${channel}`,
        { test: true }
      );
      
      testResult.success = result.success;
      testResult.message = result.success ? 'Test successful' : (result.error || 'Test failed');
    } catch (error) {
      testResult.message = error.message;
    }
    
    return testResult;
  }
}

module.exports = NotificationService;
