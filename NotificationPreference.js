const { v4: uuidv4 } = require('uuid');

class NotificationPreference {
  constructor(data) {
    this.id = uuidv4();
    this.userId = data.userId;
    this.channels = {
      email: {
        enabled: data.channels?.email?.enabled ?? true,
        verified: data.channels?.email?.verified ?? false,
        address: data.channels?.email?.address || null
      },
      sms: {
        enabled: data.channels?.sms?.enabled ?? true,
        verified: data.channels?.sms?.verified ?? false,
        phone: data.channels?.sms?.phone || null
      },
      push: {
        enabled: data.channels?.push?.enabled ?? true,
        tokens: data.channels?.push?.tokens || [],
        devices: data.channels?.push?.devices || []
      },
      in_app: {
        enabled: data.channels?.in_app?.enabled ?? true
      },
      whatsapp: {
        enabled: data.channels?.whatsapp?.enabled ?? false,
        verified: data.channels?.whatsapp?.verified ?? false,
        phone: data.channels?.whatsapp?.phone || null
      }
    };
    
    this.categories = {
      transaction: {
        enabled: data.categories?.transaction?.enabled ?? true,
        channels: data.categories?.transaction?.channels || ['email', 'in_app', 'push']
      },
      security: {
        enabled: data.categories?.security?.enabled ?? true,
        channels: data.categories?.security?.channels || ['email', 'sms', 'push', 'in_app']
      },
      promotion: {
        enabled: data.categories?.promotion?.enabled ?? false,
        channels: data.categories?.promotion?.channels || ['email', 'push']
      },
      alert: {
        enabled: data.categories?.alert?.enabled ?? true,
        channels: data.categories?.alert?.channels || ['email', 'sms', 'push', 'in_app']
      },
      update: {
        enabled: data.categories?.update?.enabled ?? true,
        channels: data.categories?.update?.channels || ['email', 'in_app']
      },
      document: {
        enabled: data.categories?.document?.enabled ?? true,
        channels: data.categories?.document?.channels || ['email', 'in_app']
      }
    };
    
    this.globalOptOut = data.globalOptOut || false;
    self.silentHours = data.silentHours || {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'America/Sao_Paulo'
    };
    
    this.emailDigest = data.emailDigest || {
      enabled: false,
      frequency: 'daily', // daily, weekly
      lastSentAt: null
    };
    
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  updateChannel(channel, settings) {
    if (this.channels[channel]) {
      this.channels[channel] = { ...this.channels[channel], ...settings };
      this.updatedAt = new Date();
    }
  }

  updateCategory(category, settings) {
    if (this.categories[category]) {
      this.categories[category] = { ...this.categories[category], ...settings };
      this.updatedAt = new Date();
    }
  }

  addPushToken(deviceId, token, platform) {
    const existingToken = this.channels.push.tokens.find(t => t.token === token);
    if (!existingToken) {
      this.channels.push.tokens.push({
        deviceId,
        token,
        platform, // ios, android, web
        addedAt: new Date()
      });
      this.updatedAt = new Date();
    }
  }

  removePushToken(token) {
    this.channels.push.tokens = this.channels.push.tokens.filter(t => t.token !== token);
    this.updatedAt = new Date();
  }

  isChannelEnabledForCategory(channel, category) {
    if (this.globalOptOut) return false;
    if (!this.channels[channel]?.enabled) return false;
    
    const categoryConfig = this.categories[category];
    if (!categoryConfig?.enabled) return false;
    
    return categoryConfig.channels.includes(channel);
  }

  shouldSendDuringSilentHours() {
    if (!this.silentHours.enabled) return true;
    
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: this.silentHours.timezone 
    }).slice(0, 5);
    
    const start = this.silentHours.start;
    const end = this.silentHours.end;
    
    if (start < end) {
      return currentTime < start || currentTime > end;
    } else {
      return currentTime > end && currentTime < start;
    }
  }
}

module.exports = NotificationPreference;
