const auditHelpers = {
  // Get action description
  getActionDescription: (action, resource) => {
    const descriptions = {
      CREATE: `Created ${resource}`,
      READ: `Viewed ${resource}`,
      UPDATE: `Updated ${resource}`,
      DELETE: `Deleted ${resource}`,
      LOGIN: 'Logged in',
      LOGOUT: 'Logged out',
      BLOCK: `Blocked ${resource}`,
      UNBLOCK: `Unblocked ${resource}`,
      TRANSFER: 'Made a transfer',
      WITHDRAWAL: 'Made a withdrawal',
      DEPOSIT: 'Made a deposit'
    };
    
    return descriptions[action] || `${action} ${resource}`;
  },
  
  // Format duration for display
  formatDuration: (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }
    
    const seconds = milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    }
    
    const minutes = seconds / 60;
    if (minutes < 60) {
      return `${minutes.toFixed(2)}min`;
    }
    
    const hours = minutes / 60;
    return `${hours.toFixed(2)}h`;
  },
  
  // Format session duration
  formatSessionDuration: (loginAt, logoutAt = null) => {
    const end = logoutAt ? new Date(logoutAt) : new Date();
    const duration = end - new Date(loginAt);
    
    const hours = Math.floor(duration / 3600000);
    const minutes = Math.floor((duration % 3600000) / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  },
  
  // Get severity color
  getSeverityColor: (severity) => {
    const colors = {
      DEBUG: '#6c757d',  // gray
      INFO: '#007bff',   // blue
      WARNING: '#fd7e14', // orange
      ERROR: '#dc3545',   // red
      CRITICAL: '#dc3545' // red
    };
    return colors[severity] || '#6c757d';
  },
  
  // Get status badge class
  getStatusBadge: (status) => {
    const badges = {
      SUCCESS: 'success',
      FAILURE: 'danger',
      PENDING: 'warning'
    };
    return badges[status] || 'secondary';
  },
  
  // Filter sensitive fields from logs for display
  filterSensitiveFields: (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = ['password', 'cvv', 'cardNumber', 'token', 'secret', 'oldPassword', 'newPassword'];
    const filtered = { ...obj };
    
    for (const field of sensitiveFields) {
      if (filtered[field]) {
        filtered[field] = '••••••••';
      }
    }
    
    return filtered;
  },
  
  // Generate change summary
  generateChangeSummary: (changes) => {
    if (!changes) return 'No changes';
    
    const changeCount = Object.keys(changes).length;
    const fields = Object.keys(changes).slice(0, 3).join(', ');
    
    if (changeCount > 3) {
      return `${changeCount} fields changed: ${fields} and ${changeCount - 3} more`;
    }
    
    return `${changeCount} field(s) changed: ${fields}`;
  },
  
  // Check if log is from suspicious IP
  isSuspiciousIp: (ipAddress, whitelist = []) => {
    if (whitelist.includes(ipAddress)) return false;
    
    // Check for local IPs
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return false;
    }
    
    // Check for known suspicious patterns
    const suspiciousPatterns = [/^185\./, /^94\./, /^45\./];
    return suspiciousPatterns.some(pattern => pattern.test(ipAddress));
  },
  
  // Generate audit report summary
  generateReportSummary: (logs, startDate, endDate) => {
    const uniqueUsers = new Set(logs.map(l => l.userId)).size;
    const actions = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});
    
    const topAction = Object.entries(actions).sort((a, b) => b[1] - a[1])[0];
    
    return {
      period: `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
      totalEvents: logs.length,
      uniqueUsers,
      topAction: topAction ? { action: topAction[0], count: topAction[1] } : null,
      successRate: logs.length > 0 
        ? ((logs.filter(l => l.status === 'SUCCESS').length / logs.length) * 100).toFixed(2)
        : 0,
      failureRate: logs.length > 0
        ? ((logs.filter(l => l.status === 'FAILURE').length / logs.length) * 100).toFixed(2)
        : 0
    };
  },
  
  // Validate date range
  isValidDateRange: (startDate, endDate, maxDays = 90) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    
    return daysDiff >= 0 && daysDiff <= maxDays;
  },
  
  // Get default date range (last 30 days)
  getDefaultDateRange: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  },
  
  // Mask email for privacy
  maskEmail: (email) => {
    if (!email) return 'N/A';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return `${local[0]}***@${domain}`;
    return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  },
  
  // Mask IP address (last octet)
  maskIp: (ip) => {
    if (!ip) return 'N/A';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
    return ip;
  }
};

module.exports = auditHelpers;
