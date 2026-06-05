class BiometricController {
  constructor(biometricService) {
    this.biometricService = biometricService;
  }

  // Start biometric registration
  async startRegistration(req, res) {
    try {
      const { deviceId, deviceName, deviceType, biometricType } = req.body;
      const userId = req.user.id;

      const result = await this.biometricService.generateRegistrationChallenge(
        userId,
        deviceId,
        deviceName,
        deviceType,
        biometricType
      );

      res.json({
        success: true,
        message: 'Registration challenge generated',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Complete biometric registration
  async completeRegistration(req, res) {
    try {
      const { sessionId, credentialId, publicKey } = req.body;

      const result = await this.biometricService.verifyRegistration(
        sessionId,
        credentialId,
        publicKey
      );

      res.json({
        success: true,
        message: 'Biometric registration completed successfully',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Start biometric authentication
  async startAuthentication(req, res) {
    try {
      const { userId, deviceId } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await this.biometricService.generateAuthChallenge(
        userId,
        deviceId,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: 'Authentication challenge generated',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Verify biometric authentication
  async verifyAuthentication(req, res) {
    try {
      const { sessionId, signature, clientData } = req.body;

      const result = await this.biometricService.verifyAuth(
        sessionId,
        signature,
        clientData
      );

      res.json({
        success: true,
        message: 'Biometric authentication successful',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get user's biometric devices
  async getDevices(req, res) {
    try {
      const userId = req.user.id;
      const devices = await this.biometricService.getUserBiometricDevices(userId);

      res.json({
        success: true,
        count: devices.length,
        devices
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Revoke a specific biometric device
  async revokeDevice(req, res) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const result = await this.biometricService.revokeBiometricDevice(userId, deviceId);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Revoke all biometric devices
  async revokeAllDevices(req, res) {
    try {
      const userId = req.user.id;
      const result = await this.biometricService.revokeAllBiometricDevices(userId);

      res.json(result);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Check if biometric is enabled for user/device
  async checkStatus(req, res) {
    try {
      const { deviceId } = req.params;
      const userId = req.user.id;

      const enabled = await this.biometricService.hasBiometricEnabled(userId, deviceId);

      res.json({
        success: true,
        enabled,
        deviceId
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get biometric configuration
  async getConfig(req, res) {
    try {
      const config = this.biometricService.getConfig();
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

  // Update biometric configuration (admin only)
  async updateConfig(req, res) {
    try {
      const newConfig = req.body;
      const config = this.biometricService.updateConfig(newConfig);
      
      res.json({
        success: true,
        message: 'Biometric configuration updated',
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

module.exports = BiometricController;
