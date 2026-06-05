const crypto = require('crypto');

// Generate a random challenge for biometric verification
const generateChallenge = (length = 32) => {
  return crypto.randomBytes(length).toString('base64url');
};

// Hash biometric data for storage (never store raw biometrics)
const hashBiometricData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Validate biometric type
const isValidBiometricType = (type) => {
  const validTypes = ['fingerprint', 'face_id', 'voice', 'iris'];
  return validTypes.includes(type);
};

// Validate device type
const isValidDeviceType = (type) => {
  const validTypes = ['mobile', 'web', 'desktop', 'tablet'];
  return validTypes.includes(type);
};

// Format device info for response
const formatDeviceInfo = (device) => {
  return {
    id: device.id,
    name: device.deviceName,
    type: device.deviceType,
    biometricType: device.biometricType,
    status: device.status,
    lastUsed: device.lastUsedAt,
    registeredAt: device.createdAt
  };
};

// Check if biometric token needs refresh
const shouldRefreshToken = (tokenIat) => {
  const tokenAge = Math.floor(Date.now() / 1000) - tokenIat;
  return tokenAge > (12 * 60 * 60); // 12 hours
};

// Generate random device ID
const generateDeviceId = () => {
  return crypto.randomBytes(16).toString('hex');
};

module.exports = {
  generateChallenge,
  hashBiometricData,
  isValidBiometricType,
  isValidDeviceType,
  formatDeviceInfo,
  shouldRefreshToken,
  generateDeviceId
};
