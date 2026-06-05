const jwt = require('jsonwebtoken');

const biometricMiddleware = (db) => {
  return async (req, res, next) => {
    try {
      const biometricToken = req.headers['x-biometric-token'];
      
      if (!biometricToken) {
        return res.status(401).json({
          success: false,
          message: 'Biometric token required'
        });
      }

      const secret = process.env.JWT_SECRET || 'zentronix_biometric_secret';
      const decoded = jwt.verify(biometricToken, secret);
      
      if (decoded.authMethod !== 'biometric') {
        return res.status(401).json({
          success: false,
          message: 'Invalid biometric token'
        });
      }

      // Verify token is not expired
      if (decoded.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({
          success: false,
          message: 'Biometric token expired'
        });
      }

      // Check if device is still active
      const biometricAuth = db.biometricAuths?.find(
        b => b.userId === decoded.userId && 
        b.deviceId === decoded.deviceId && 
        b.status === 'active'
      );

      if (!biometricAuth) {
        return res.status(401).json({
          success: false,
          message: 'Biometric device not active or revoked'
        });
      }

      req.user = {
        id: decoded.userId,
        deviceId: decoded.deviceId,
        authMethod: 'biometric'
      };
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid biometric token',
        error: error.message
      });
    }
  };
};

// Middleware to require biometric authentication for sensitive operations
const requireBiometricAuth = (db) => {
  return async (req, res, next) => {
    try {
      const biometricToken = req.headers['x-biometric-token'];
      
      if (!biometricToken) {
        return res.status(401).json({
          success: false,
          message: 'Biometric authentication required for this operation'
        });
      }

      const secret = process.env.JWT_SECRET || 'zentronix_biometric_secret';
      const decoded = jwt.verify(biometricToken, secret);
      
      if (decoded.authMethod !== 'biometric') {
        return res.status(401).json({
          success: false,
          message: 'Biometric authentication required'
        });
      }

      // Check if token is recent (less than 5 minutes old for sensitive ops)
      const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
      if (tokenAge > 300) { // 5 minutes
        return res.status(401).json({
          success: false,
          message: 'Biometric authentication expired, please re-authenticate'
        });
      }

      req.biometricUser = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Biometric authentication failed'
      });
    }
  };
};

module.exports = {
  biometricMiddleware,
  requireBiometricAuth
};
