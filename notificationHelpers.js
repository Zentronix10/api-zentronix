const notificationHelpers = {
  // Format phone number for SMS
  formatPhoneNumber: (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+${cleaned}`;
    }
    return phone;
  },
  
  // Truncate message for SMS (160 characters limit)
  truncateForSms: (message, maxLength = 160) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength - 3) + '...';
  },
  
  // Generate email footer
  generateEmailFooter: (userName, bankName = 'Zentronix Bank') => {
    return `
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
      <p style="color: #666666; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} ${bankName}. All rights reserved.<br>
        This is an automated message. Please do not reply to this email.<br>
        If you have any questions, contact our support team.
      </p>
    `;
  },
  
  // Generate push notification payload
  generatePushPayload: (title, body, data = {}) => {
    return {
      notification: {
        title,
        body,
        sound: 'default',
        badge: 1,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      priority: 'high'
    };
  },
  
  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Validate phone number
  isValidPhone: (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  },
  
  // Get notification priority order
  getPriorityOrder: (priority) => {
    const priorities = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3
    };
    return priorities[priority] || 2;
  },
  
  // Format timestamp for display
  formatTimestamp: (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return new Date(date).toLocaleDateString();
  },
  
  // Group notifications by date
  groupByDate: (notifications) => {
    const groups = {};
    
    notifications.forEach(notification => {
      const date = new Date(notification.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
    });
    
    return groups;
  },
  
  // Get notification icon based on category
  getCategoryIcon: (category) => {
    const icons = {
      transaction: '💰',
      security: '🔒',
      promotion: '🎉',
      alert: '⚠️',
      update: '🔄',
      document: '📄'
    };
    return icons[category] || '📢';
  },
  
  // Get notification color based on priority
  getPriorityColor: (priority) => {
    const colors = {
      critical: '#dc3545', // red
      high: '#fd7e14',     // orange
      normal: '#007bff',   // blue
      low: '#6c757d'       // gray
    };
    return colors[priority] || '#007bff';
  },
  
  // Merge notification templates with user data
  mergeTemplate: (template, data) => {
    let merged = { ...template };
    
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      if (merged.subject) merged.subject = merged.subject.replace(regex, value);
      if (merged.body) merged.body = merged.body.replace(regex, value);
      if (merged.htmlBody) merged.htmlBody = merged.htmlBody.replace(regex, value);
    }
    
    return merged;
  },
  
  // Check if notification is within retention period
  isWithinRetention: (createdAt, retentionDays = 30) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    return new Date(createdAt) >= cutoff;
  },
  
  // Generate notification summary for email digest
  generateDigestSummary: (notifications) => {
    const summary = {
      total: notifications.length,
      byCategory: {},
      topNotifications: notifications.slice(0, 5),
      oldestDate: null,
      newestDate: null
    };
    
    notifications.forEach(n => {
      summary.byCategory[n.category] = (summary.byCategory[n.category] || 0) + 1;
      
      if (!summary.oldestDate || new Date(n.createdAt) < new Date(summary.oldestDate)) {
        summary.oldestDate = n.createdAt;
      }
      if (!summary.newestDate || new Date(n.createdAt) > new Date(summary.newestDate)) {
        summary.newestDate = n.createdAt;
      }
    });
    
    return summary;
  }
};

module.exports = notificationHelpers;
