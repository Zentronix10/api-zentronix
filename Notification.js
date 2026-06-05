const { v4: uuidv4 } = require('uuid');

class Notification {
  constructor(data) {
    this.id = uuidv4();
    this.userId = data.userId;
    this.type = data.type; // 'email', 'sms', 'push', 'in_app', 'whatsapp'
    this.category = data.category; // 'transaction', 'security', 'promotion', 'alert', 'update', 'document'
    this.title = data.title;
    this.message = data.message;
    this.body = data.body;
    this.priority = data.priority || 'normal'; // 'low', 'normal', 'high', 'critical'
    this.status = 'pending'; // pending, sent, delivered, read, failed, cancelled
    this.recipient = data.recipient; // email address, phone number, device token
    this.metadata = data.metadata || {};
    this.retryCount = 0;
    this.maxRetries = 3;
    this.sentAt = null;
    this.deliveredAt = null;
    this.readAt = null;
    this.failedAt = null;
    this.failureReason = null;
    this.scheduledFor = data.scheduledFor || null;
    this.expiresAt = data.expiresAt || null;
    this.trackingId = uuidv4();
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  markSent() {
    this.status = 'sent';
    this.sentAt = new Date();
    this.updatedAt = new Date();
  }

  markDelivered() {
    this.status = 'delivered';
    this.deliveredAt = new Date();
    this.updatedAt = new Date();
  }

  markRead() {
    this.readAt = new Date();
    this.updatedAt = new Date();
  }

  markFailed(reason) {
    this.status = 'failed';
    this.failedAt = new Date();
    this.failureReason = reason;
    this.updatedAt = new Date();
  }

  cancel() {
    this.status = 'cancelled';
    this.updatedAt = new Date();
  }

  incrementRetry() {
    this.retryCount++;
    this.updatedAt = new Date();
  }

  canRetry() {
    return this.retryCount < this.maxRetries && this.status === 'failed';
  }

  isExpired() {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  isScheduled() {
    return this.scheduledFor && new Date(this.scheduledFor) > new Date();
  }
}

module.exports = Notification;
