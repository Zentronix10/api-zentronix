class TwoFactorController {
  constructor(twoFactorService) {
    this.twoFactorService = twoFactorService;
  }

  // Setup 2FA
  async setupTwoFactor(req, res) {
    try {
      const { method, deviceName, deviceId } = req.body;
      const userId = req.user.id;

      if (!method) {
        return res.status(400).json({
          success: false,
          message: 'Method is required'
        });
      }

      const result = await this.twoFactorService.setupTwoFactor(userId, method, deviceName, deviceId);

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

  // Verify and enable 2FA
  async verifyAndEnable(req, res) {
    try {
      const { code, method } = req.body;
      const userId = req.user.id;

      if (!code || !method) {
        return res.status(400).json({
          success: false,
          message: 'Code and method are required'
        });
      }

      const result = await this.twoFactorService.verifyAndEnable(userId, code, method);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Disable 2FA
  async disableTwoFactor(req, res) {
    try {
      const { code, method } = req.body;
      const userId = req.user.id;

      if (!code || !method) {
        return res.status(400).json({
          success: false,
          message: 'Code and method are required'
        });
      }

      const result = await this.twoFactorService.disableTwoFactor(userId, code, method);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Generate login code
  async generateLoginCode(req, res) {
    try {
      const { method } = req.body;
      const { userId } = req.params;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      if (!method) {
        return res.status(400).json({
          success: false,
          message: 'Method is required'
        });
      }

      const result = await this.twoFactorService.generateLoginCode(userId, method, ipAddress, userAgent);

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

  // Verify login code
  async verifyLoginCode(req, res) {
    try {
      const { code, sessionId } = req.body;
      const { userId } = req.params;

      if (!code || !sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Code and sessionId are required'
        });
      }

      const result = await this.twoFactorService.verifyLoginTwoFactor(userId, code, sessionId);

      res.json(result);
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get 2FA status
  async getTwoFactorStatus(req, res) {
    try {
      const userId = req.user.id;
      const status = await this.twoFactorService.getTwoFactorStatus(userId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get backup codes
  async getBackupCodes(req, res) {
    try {
      const userId = req.user.id;
      const codes = await this.twoFactorService.getBackupCodes(userId);

      res.json({
        success: true,
        backupCodes: codes
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Regenerate backup codes
  async regenerateBackupCodes(req, res) {
    try {
      const { code, method } = req.body;
      const userId = req.user.id;

      if (!code || !method) {
        return res.status(400).json({
          success: false,
          message: 'Code and method are required'
        });
      }

      const result = await this.twoFactorService.regenerateBackupCodes(userId, code, method);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Check if user requires 2FA
  async requiresTwoFactor(req, res) {
    try {
      const { userId, role } = req.params;
      const requires = await this.twoFactorService.requiresTwoFactor(userId, role);

      res.json({
        success: true,
        requiresTwoFactor: requires
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get available methods
  async getAvailableMethods(req, res) {
    try {
      const userId = req.user.id;
      const methods = this.twoFactorService.getAvailableMethods(userId);

      res.json({
        success: true,
        methods
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get statistics (admin only)
  async getStatistics(req, res) {
    try {
      const stats = await this.twoFactorService.getStatistics();

      res.json({
        success: true,
        statistics: stats
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
      const config = this.twoFactorService.getConfig();
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
      const newConfig = req.body;
      const config = this.twoFactorService.updateConfig(newConfig);
      
      res.json({
        success: true,
        message: '2FA configuration updated',
        config
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Emergency disable 2FA (admin only)
  async emergencyDisable(req, res) {
    try {
      const { userId, reason } = req.body;
      const adminId = req.user.id;

      if (!userId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'UserId and reason are required'
        });
      }

      const result = await this.twoFactorService.emergencyDisableTwoFactor(userId, adminId, reason);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = TwoFactorController;
