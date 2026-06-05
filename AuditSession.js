const { v4: uuidv4 } = require('uuid');

class AuditSession {
  constructor(data) {
    this.id = uuidv4();
    this.userId = data.userId;
    this.userEmail = data.userEmail;
    this.sessionToken = data.sessionToken;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.deviceId = data.deviceId;
    this.location = data.location;
    this.loginAt = new Date();
    this.logoutAt = null;
    this.lastActivityAt = new Date();
    this.activityCount = 0;
    this.isActive = true;
  }

  logout() {
    this.logoutAt = new Date();
    this.isActive = false;
  }

  updateActivity() {
    this.lastActivityAt = new Date();
    this.activityCount++;
  }
}

module.exports = AuditSession;
