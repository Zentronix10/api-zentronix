class AuditController {
  constructor(auditService) {
    this.auditService = auditService;
  }

  // Get audit logs
  async getLogs(req, res) {
    try {
      // Check if user has permission (admin or compliance)
      if (req.user.role !== 'admin' && req.user.role !== 'compliance' && req.user.role !== 'auditor') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Audit logs require admin, compliance, or auditor role.'
        });
      }
      
      const filters = req.query;
      const result = await this.auditService.getLogs(filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user activity summary
  async getUserActivitySummary(req, res) {
    try {
      const { userId } = req.params;
      const { days } = req.query;
      
      // Check permission
      if (req.user.role !== 'admin' && req.user.role !== 'compliance' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own activity summary.'
        });
      }
      
      const summary = await this.auditService.getUserActivitySummary(userId, days ? parseInt(days) : 30);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get active sessions
  async getActiveSessions(req, res) {
    try {
      const { userId } = req.query;
      
      // Check permission
      if (userId && req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied.'
        });
      }
      
      const sessions = await this.auditService.getActiveSessions(userId || req.user.id);
      
      res.json({
        success: true,
        count: sessions.length,
        sessions
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Terminate session (admin only)
  async terminateSession(req, res) {
    try {
      const { sessionId } = req.params;
      
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required to terminate sessions.'
        });
      }
      
      const session = await this.auditService.terminateSession(sessionId);
      
      res.json({
        success: true,
        message: 'Session terminated successfully',
        session
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get audit statistics (admin only)
  async getStatistics(req, res) {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'compliance') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin or compliance role required.'
        });
      }
      
      const { days } = req.query;
      const statistics = await this.auditService.getStatistics(days ? parseInt(days) : 30);
      
      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Export logs to CSV (admin only)
  async exportLogs(req, res) {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'compliance') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin or compliance role required.'
        });
      }
      
      const filters = req.query;
      const result = await this.auditService.exportLogsToCsv(filters);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.csv);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Clean old logs (admin only)
  async cleanOldLogs(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required.'
        });
      }
      
      const result = await this.auditService.cleanOldLogs();
      
      res.json({
        success: true,
        message: 'Old logs cleaned successfully',
        result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get configuration (admin only)
  async getConfig(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required.'
        });
      }
      
      const config = this.auditService.getConfig();
      res.json({
        success: true,
        config
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update configuration (admin only)
  async updateConfig(req, res) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required.'
        });
      }
      
      const config = this.auditService.updateConfig(req.body);
      res.json({
        success: true,
        message: 'Audit configuration updated',
        config
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = AuditController;
