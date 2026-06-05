const { v4: uuidv4 } = require('uuid');

class NotificationTemplate {
  constructor(data) {
    this.id = uuidv4();
    this.name = data.name;
    this.type = data.type; // 'email', 'sms', 'push', 'in_app'
    this.category = data.category;
    this.subject = data.subject;
    this.title = data.title;
    this.body = data.body;
    this.htmlBody = data.htmlBody || null;
    this.placeholders = data.placeholders || [];
    this.isActive = data.isActive ?? true;
    this.version = 1;
    this.createdBy = data.createdBy;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  render(placeholders = {}) {
    let renderedSubject = this.subject;
    let renderedBody = this.body;
    let renderedHtmlBody = this.htmlBody;
    
    // Replace placeholders in subject
    for (const [key, value] of Object.entries(placeholders)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      if (renderedSubject) renderedSubject = renderedSubject.replace(regex, value);
      if (renderedBody) renderedBody = renderedBody.replace(regex, value);
      if (renderedHtmlBody) renderedHtmlBody = renderedHtmlBody.replace(regex, value);
    }
    
    return {
      subject: renderedSubject,
      title: this.title,
      body: renderedBody,
      htmlBody: renderedHtmlBody
    };
  }
}

module.exports = NotificationTemplate;
