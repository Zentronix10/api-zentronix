const { v4: uuidv4 } = require('uuid');

class CardBlockLog {
  constructor(data) {
    this.id = uuidv4();
    this.cardId = data.cardId;
    this.userId = data.userId;
    this.action = data.action; // 'block', 'unblock', 'temporary_block', 'cancel'
    this.reason = data.reason;
    this.performedBy = data.performedBy; // 'user', 'system', 'admin'
    this.performedById = data.performedById;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.details = data.details;
    this.createdAt = new Date();
  }
}

module.exports = CardBlockLog;
