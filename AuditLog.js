const { v4: uuidv4 } = require('uuid');

class AuditLog {
  constructor(data) {
    this.id = uuidv4();
    this.userId = data.userId;
    this.userEmail = data.userEmail;
    this.userRole = data.userRole;
    this.action = data.action;
    this.resource = data.resource;
    this.resourceId = data.resourceId;
    this.oldValue = data.oldValue;
    this.newValue = data.newValue;
    this.changes = data.changes;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.deviceId = data.deviceId;
    this.sessionId = data.sessionId;
    this.status = data.status;
    this.errorMessage = data.errorMessage;
    this.duration = data.duration;
    this.metadata = data.metadata || {};
    this.severity = data.severity || 'INFO';
    this.isSensitive = data.isSensitive || false;
    this.createdAt = new Date();
  }
}

module.exports = AuditLog;
