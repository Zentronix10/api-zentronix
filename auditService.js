const AuditLog = require('../models/AuditLog');
const AuditSession = require('../models/AuditSession');

class AuditService {
  constructor(db) {
    this.db = db;
    
    this.config = {
      retentionDays: 365, // Keep logs for 1 year
      enabled: true,
      logLevel: 'INFO', // DEBUG, INFO, WARNING, ERROR, CRITICAL
      sensitiveActions: [
        'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
        '2FA_ENABLE', '2FA_DISABLE', 'CARD_BLOCK', 'CARD_UNBLOCK',
        'TRANSFER', 'WITHDRAWAL', 'ACCOUNT_CLOSE', 'PROFILE_UPDATE'
      ],
      excludedFields: ['password', 'cvv', 'cardNumber', 'token', 'secret'],
      asyncLogging: true,
      batchSize: 100
    };
    
    this.logQueue = [];
    this.processing = false;
    
    // Start batch processor if async logging enabled
    if (this.config.asyncLogging) {
      this.startBatchProcessor();
    }
  }

  // Log an action
  async log(data) {
    if (!this.config.enabled) return null;
    
    // Check log level
    if (!this.shouldLog(data.severity)) return null;
    
    // Sanitize sensitive data
    const sanitizedData = this.sanitizeData(data);
    
    const auditLog = new AuditLog(sanitizedData);
    
    if (this.config.asyncLogging) {
      // Add to queue for batch processing
      this.logQueue.push(auditLog);
      
      // Process if queue size reaches batch size
      if (this.logQueue.length >= this.config.batchSize) {
        await this.processBatch();
      }
      
      return { id: auditLog.id, queued: true };
    } else {
      // Sync logging
      this.db.auditLogs = this.db.auditLogs || [];
      this.db.auditLogs.push(auditLog);
      return { id: auditLog.id, saved: true };
    }
  }

  // Log user login
  async logLogin(userId, userEmail, userRole, ipAddress, userAgent, deviceId, success, errorMessage = null) {
    const session = new AuditSession({
      userId,
      userEmail,
      sessionToken: success ? this.generateSessionToken() : null,
      ipAddress,
      userAgent,
      deviceId,
      location: await this.getLocationFromIp(ipAddress)
    });
    
    if (success) {
      this.db.auditSessions = this.db.auditSessions || [];
      this.db.auditSessions.push(session);
    }
    
    return await this.log({
      userId,
      userEmail,
      userRole,
      action: 'LOGIN',
      resource: 'AUTH',
      resourceId: userId,
      status: success ? 'SUCCESS' : 'FAILURE',
      errorMessage,
      ipAddress,
      userAgent,
      deviceId,
      sessionId: success ? session.id : null,
      severity: success ? 'INFO' : 'WARNING',
      isSensitive: true,
      metadata: {
        loginMethod: 'email_password',
        sessionId: session.id
      }
    });
  }

  // Log user logout
  async logLogout(userId, userEmail, userRole, sessionId, ipAddress) {
    const session = this.db.auditSessions?.find(s => s.id === sessionId);
    if (session) {
      session.logout();
    }
    
    return await this.log({
      userId,
      userEmail,
      userRole,
      action: 'LOGOUT',
      resource: 'AUTH',
      resourceId: userId,
      status: 'SUCCESS',
      ipAddress,
      sessionId,
      severity: 'INFO',
      isSensitive: true,
      metadata: {
        sessionDuration: session ? (Date.now() - new Date(session.loginAt)) : null
      }
    });
  }

  // Log resource creation
  async logCreate(user, resource, resourceId, newValue, req = null) {
    return await this.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'CREATE',
      resource: resource,
      resourceId: resourceId,
      newValue: this.truncateValue(newValue),
      status: 'SUCCESS',
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      severity: 'INFO',
      metadata: {
        createdAt: new Date().toISOString()
      }
    });
  }

  // Log resource update
  async logUpdate(user, resource, resourceId, oldValue, newValue, req = null) {
    const changes = this.compareChanges(oldValue, newValue);
    
    return await this.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'UPDATE',
      resource: resource,
      resourceId: resourceId,
      oldValue: this.truncateValue(this.sanitizeObject(oldValue)),
      newValue: this.truncateValue(this.sanitizeObject(newValue)),
      changes: changes,
      status: 'SUCCESS',
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      severity: this.getSeverityForUpdate(resource, changes),
      metadata: {
        changesCount: Object.keys(changes).length,
        updatedAt: new Date().toISOString()
      }
    });
  }

  // Log resource deletion
  async logDelete(user, resource, resourceId, oldValue, req = null) {
    return await this.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'DELETE',
      resource: resource,
      resourceId: resourceId,
      oldValue: this.truncateValue(this.sanitizeObject(oldValue)),
      status: 'SUCCESS',
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      severity: 'WARNING',
      isSensitive: true,
      metadata: {
        deletedAt: new Date().toISOString()
      }
    });
  }

  // Log resource read/access
  async logRead(user, resource, resourceId, req = null, metadata = {}) {
    return await this.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: 'READ',
      resource: resource,
      resourceId: resourceId,
      status: 'SUCCESS',
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      severity: 'DEBUG',
      metadata: metadata
    });
  }

  // Log failed action
  async logFailure(user, action, resource, resourceId, errorMessage, req = null, metadata = {}) {
    return await this.log({
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      action: action,
      resource: resource,
      resourceId: resourceId,
      status: 'FAILURE',
      errorMessage: errorMessage,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      severity: 'ERROR',
      metadata: metadata
    });
  }

  // Log critical action (card block, etc.)
  async logCritical(user, action, resource, resourceId, details, req = null) {
    return await this.log({
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      action: action,
      resource: resource,
      resourceId: resourceId,
      status: 'SUCCESS',
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      severity: 'CRITICAL',
      isSensitive: true,
      metadata: details,
      newValue: this.truncateValue(details)
    });
  }

  // Get audit logs with filters
  async getLogs(filters = {}) {
    let logs = this.db.auditLogs || [];
    
    // Apply filters
    if (filters.userId) {
      logs = logs.filter(l => l.userId === filters.userId);
    }
    
    if (filters.userEmail) {
      logs = logs.filter(l => l.userEmail?.toLowerCase().includes(filters.userEmail.toLowerCase()));
    }
    
    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action);
    }
    
    if (filters.resource) {
      logs = logs.filter(l => l.resource === filters.resource);
    }
    
    if (filters.status) {
      logs = logs.filter(l => l.status === filters.status);
    }
    
    if (filters.severity) {
      logs = logs.filter(l => l.severity === filters.severity);
    }
    
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      logs = logs.filter(l => new Date(l.createdAt) >= start);
    }
    
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      logs = logs.filter(l => new Date(l.createdAt) <= end);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      logs = logs.filter(l => 
        l.action?.toLowerCase().includes(search) ||
        l.resource?.toLowerCase().includes(search) ||
        l.userEmail?.toLowerCase().includes(search) ||
        l.errorMessage?.toLowerCase().includes(search)
      );
    }
    
    // Sort by date (newest first)
    logs = logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination
    const limit = parseInt(filters.limit) || 50;
    const offset = parseInt(filters.offset) || 0;
    
    const total = logs.length;
    const paginatedLogs = logs.slice(offset, offset + limit);
    
    return {
      total,
      limit,
      offset,
      logs: paginatedLogs
    };
  }

  // Get user activity summary
  async getUserActivitySummary(userId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const userLogs = (this.db.auditLogs || []).filter(l => 
      l.userId === userId && new Date(l.createdAt) >= cutoffDate
    );
    
    const summary = {
      userId,
      period: `${days} days`,
      totalActions: userLogs.length,
      uniqueActions: [...new Set(userLogs.map(l => l.action))],
      byAction: {},
      byResource: {},
      byStatus: {
        SUCCESS: userLogs.filter(l => l.status === 'SUCCESS').length,
        FAILURE: userLogs.filter(l => l.status === 'FAILURE').length,
        PENDING: userLogs.filter(l => l.status === 'PENDING').length
      },
      bySeverity: {
        DEBUG: userLogs.filter(l => l.severity === 'DEBUG').length,
        INFO: userLogs.filter(l => l.severity === 'INFO').length,
        WARNING: userLogs.filter(l => l.severity === 'WARNING').length,
        ERROR: userLogs.filter(l => l.severity === 'ERROR').length,
        CRITICAL: userLogs.filter(l => l.severity === 'CRITICAL').length
      },
      lastActivity: userLogs[0]?.createdAt || null,
      mostFrequentAction: null,
      activeHours: this.getActiveHours(userLogs)
    };
    
    // Group by action
    userLogs.forEach(log => {
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
    });
    
    // Group by resource
    userLogs.forEach(log => {
      summary.byResource[log.resource] = (summary.byResource[log.resource] || 0) + 1;
    });
    
    // Find most frequent action
    const mostFrequent = Object.entries(summary.byAction).sort((a, b) => b[1] - a[1])[0];
    if (mostFrequent) {
      summary.mostFrequentAction = { action: mostFrequent[0], count: mostFrequent[1] };
    }
    
    return summary;
  }

  // Get active sessions
  async getActiveSessions(userId = null) {
    let sessions = this.db.auditSessions?.filter(s => s.isActive) || [];
    
    if (userId) {
      sessions = sessions.filter(s => s.userId === userId);
    }
    
    return sessions.map(s => ({
      id: s.id,
      userId: s.userId,
      userEmail: s.userEmail,
      ipAddress: s.ipAddress,
      location: s.location,
      deviceId: s.deviceId,
      loginAt: s.loginAt,
      lastActivityAt: s.lastActivityAt,
      activityCount: s.activityCount,
      duration: Date.now() - new Date(s.loginAt)
    }));
  }

  // Update session activity
  async updateSessionActivity(sessionId) {
    const session = this.db.auditSessions?.find(s => s.id === sessionId);
    if (session) {
      session.updateActivity();
    }
  }

  // Get audit statistics
  async getStatistics(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const logs = (this.db.auditLogs || []).filter(l => new Date(l.createdAt) >= cutoffDate);
    
    const statistics = {
      period: `${days} days`,
      total: logs.length,
      byAction: {},
      byResource: {},
      byStatus: {
        SUCCESS: logs.filter(l => l.status === 'SUCCESS').length,
        FAILURE: logs.filter(l => l.status === 'FAILURE').length
      },
      bySeverity: {
        DEBUG: logs.filter(l => l.severity === 'DEBUG').length,
        INFO: logs.filter(l => l.severity === 'INFO').length,
        WARNING: logs.filter(l => l.severity === 'WARNING').length,
        ERROR: logs.filter(l => l.severity === 'ERROR').length,
        CRITICAL: logs.filter(l => l.severity === 'CRITICAL').length
      },
      topUsers: [],
      dailyActivity: [],
      failureRate: 0,
      uniqueUsers: new Set(logs.map(l => l.userId)).size
    };
    
    // Group by action
    logs.forEach(log => {
      statistics.byAction[log.action] = (statistics.byAction[log.action] || 0) + 1;
    });
    
    // Group by resource
    logs.forEach(log => {
      statistics.byResource[log.resource] = (statistics.byResource[log.resource] || 0) + 1;
    });
    
    // Calculate failure rate
    const totalActions = logs.length;
    const failures = statistics.byStatus.FAILURE;
    statistics.failureRate = totalActions > 0 ? (failures / totalActions) * 100 : 0;
    
    // Get top users by activity
    const userActivity = {};
    logs.forEach(log => {
      if (log.userEmail) {
        userActivity[log.userEmail] = (userActivity[log.userEmail] || 0) + 1;
      }
    });
    
    statistics.topUsers = Object.entries(userActivity)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Group by day
    const dailyMap = new Map();
    logs.forEach(log => {
      const date = new Date(log.createdAt).toISOString().split('T')[0];
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
    });
    
    statistics.dailyActivity = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    return statistics;
  }

  // Export logs to CSV
  async exportLogsToCsv(filters = {}) {
    const { logs } = await this.getLogs({ ...filters, limit: 10000 });
    
    if (logs.length === 0) {
      throw new Error('No logs found for export');
    }
    
    const headers = ['ID', 'User ID', 'User Email', 'Action', 'Resource', 'Resource ID', 'Status', 'Severity', 'IP Address', 'Created At', 'Error Message'];
    
    const rows = logs.map(log => [
      log.id,
      log.userId || '',
      log.userEmail || '',
      log.action,
      log.resource,
      log.resourceId || '',
      log.status,
      log.severity,
      log.ipAddress || '',
      new Date(log.createdAt).toISOString(),
      log.errorMessage || ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    return {
      csv: csvContent,
      count: logs.length,
      filename: `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
    };
  }

  // Clean old logs (retention policy)
  async cleanOldLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    const initialCount = this.db.auditLogs?.length || 0;
    
    this.db.auditLogs = (this.db.auditLogs || []).filter(log => 
      new Date(log.createdAt) >= cutoffDate
    );
    
    const removedCount = initialCount - (this.db.auditLogs?.length || 0);
    
    // Clean old sessions
    const sessionCutoff = new Date();
    sessionCutoff.setDate(sessionCutoff.getDate() - 30);
    
    this.db.auditSessions = (this.db.auditSessions || []).filter(session => 
      !session.isActive || new Date(session.logoutAt || session.lastActivityAt) >= sessionCutoff
    );
    
    return {
      removedLogs: removedCount,
      remainingLogs: this.db.auditLogs?.length || 0,
      removedSessions: initialCount - (this.db.auditSessions?.length || 0)
    };
  }

  // Helper: Process batch of logs
  async processBatch() {
    if (this.processing || this.logQueue.length === 0) return;
    
    this.processing = true;
    
    const batch = [...this.logQueue];
    this.logQueue = [];
    
    this.db.auditLogs = this.db.auditLogs || [];
    this.db.auditLogs.push(...batch);
    
    this.processing = false;
    
    // Continue processing if more items added during processing
    if (this.logQueue.length > 0) {
      await this.processBatch();
    }
  }

  // Helper: Start batch processor
  startBatchProcessor() {
    setInterval(async () => {
      if (this.logQueue.length > 0) {
        await this.processBatch();
      }
    }, 5000); // Process every 5 seconds
  }

  // Helper: Check if log level should be logged
  shouldLog(severity) {
    const levels = { DEBUG: 0, INFO: 1, WARNING: 2, ERROR: 3, CRITICAL: 4 };
    const currentLevel = levels[this.config.logLevel] || 1;
    const logLevel = levels[severity] || 1;
    return logLevel >= currentLevel;
  }

  // Helper: Sanitize sensitive data
  sanitizeData(data) {
    const sanitized = { ...data };
    
    // Remove excluded fields
    if (sanitized.newValue && typeof sanitized.newValue === 'object') {
      sanitized.newValue = this.sanitizeObject(sanitized.newValue);
    }
    
    if (sanitized.oldValue && typeof sanitized.oldValue === 'object') {
      sanitized.oldValue = this.sanitizeObject(sanitized.oldValue);
    }
    
    return sanitized;
  }

  // Helper: Sanitize object
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = { ...obj };
    
    for (const field of this.config.excludedFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }

  // Helper: Compare changes between old and new values
  compareChanges(oldValue, newValue) {
    if (!oldValue || !newValue) return null;
    
    const changes = {};
    const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
    
    for (const key of allKeys) {
      if (this.config.excludedFields.includes(key)) continue;
      
      if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
        changes[key] = {
          old: oldValue[key],
          new: newValue[key]
        };
      }
    }
    
    return Object.keys(changes).length > 0 ? changes : null;
  }

  // Helper: Truncate large values
  truncateValue(value, maxLength = 1000) {
    if (!value) return value;
    
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    
    if (stringValue.length > maxLength) {
      return stringValue.substring(0, maxLength) + '... [TRUNCATED]';
    }
    
    return value;
  }

  // Helper: Get severity for update
  getSeverityForUpdate(resource, changes) {
    const sensitiveResources = ['PASSWORD', 'EMAIL', 'PHONE', 'ADDRESS', 'LIMIT'];
    
    if (sensitiveResources.some(r => resource?.includes(r))) {
      return 'WARNING';
    }
    
    if (changes && Object.keys(changes).length > 5) {
      return 'INFO';
    }
    
    return 'DEBUG';
  }

  // Helper: Get location from IP
  async getLocationFromIp(ipAddress) {
    // In production, integrate with GeoIP service
    // For now, return mock data
    if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1') {
      return { city: 'Local', country: 'Local', timezone: 'Local' };
    }
    
    return {
      city: 'Unknown',
      country: 'Unknown',
      timezone: 'UTC'
    };
  }

  // Helper: Generate session token
  generateSessionToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Helper: Get active hours from logs
  getActiveHours(logs) {
    const hourCount = new Array(24).fill(0);
    
    logs.forEach(log => {
      const hour = new Date(log.createdAt).getHours();
      hourCount[hour]++;
    });
    
    const peakHours = hourCount
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    return {
      distribution: hourCount,
      peakHours: peakHours
    };
  }

  // Get configuration
  getConfig() {
    return this.config;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }
}

module.exports = AuditService;
