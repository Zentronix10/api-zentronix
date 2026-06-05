const crypto = require('crypto');
const BiometricAuth = require('../models/BiometricAuth');
const BiometricSession = require('../models/BiometricSession');

class BiometricService {
  constructor(db) {
    this.db = db;
    this.config = {
      maxFailedAttempts: 5,
      sessionTimeoutMinutes: 5,
      supportedBiometricTypes: ['fingerprint', 'face_id', 'voice'],
      requireSecureDevice: true
    };
  }

  // Generate a new challenge for biometric registration
  async generateRegistrationChallenge(userId, deviceId, deviceName, deviceType, biometricType) {
    if (!this.config.supportedBiometricTypes.includes(biometricType)) {
      throw new Error(`Unsupported biometric type: ${biometricType}`);
    }

    const challenge = crypto.randomBytes(32).toString('base64url');
    
    const biometricAuth = new BiometricAuth({
      userId,
      deviceId,
      deviceName,
      deviceType,
      biometricType,
      challenge
    });

    this.db.biometricAuths = this.db.biometricAuths || [];
    this.db.biometricAuths.push(biometricAuth);

    return {
      challenge,
      credentialId: biometricAuth.credentialId,
      sessionId: biometricAuth.id
    };
  }

  // Verify and complete biometric registration
  async verifyRegistration(sessionId, credentialId, publicKey) {
    const biometricAuth = this.db.biometricAuths?.find(b => b.id === sessionId);
    
    if (!biometricAuth) {
      throw new Error('Registration session not found');
    }

    if (biometricAuth.status !== 'pending') {
      throw new Error('Invalid registration session');
    }

    biometricAuth.credentialId = credentialId;
    biometricAuth.publicKey = publicKey;
    biometricAuth.status = 'active';
    biometricAuth.updatedAt = new Date();

    return {
      success: true,
      message: 'Biometric registration completed',
      biometricId: biometricAuth.id
    };
  }

  // Generate challenge for authentication
  async generateAuthChallenge(userId, deviceId, ipAddress, userAgent) {
    const biometricAuth = this.db.biometricAuths?.find(
      b => b.userId === userId && b.deviceId === deviceId && b.status === 'active'
    );

    if (!biometricAuth) {
      throw new Error('No active biometric registration found for this device');
    }

    const challenge = crypto.randomBytes(32).toString('base64url');
    
    const session = new BiometricSession({
      userId,
      deviceId,
      challenge,
      ipAddress,
      userAgent
    });

    this.db.biometricSessions = this.db.biometricSessions || [];
    this.db.biometricSessions.push(session);

    // Store challenge in biometric auth for verification
    biometricAuth.challenge = challenge;
    biometricAuth.updatedAt = new Date();

    return {
      challenge,
      sessionId: session.id,
      biometricType: biometricAuth.biometricType,
      expiresIn: this.config.sessionTimeoutMinutes * 60
    };
  }

  // Verify biometric authentication
  async verifyAuth(sessionId, signature, clientData) {
    const session = this.db.biometricSessions?.find(s => s.id === sessionId);
    
    if (!session) {
      throw new Error('Authentication session not found');
    }

    if (!session.isValid()) {
      session.expire();
      throw new Error('Authentication session has expired');
    }

    const biometricAuth = this.db.biometricAuths?.find(
      b => b.userId === session.userId && b.deviceId === session.deviceId
    );

    if (!biometricAuth || biometricAuth.isRevoked()) {
      session.fail();
      throw new Error('Biometric credential not found or revoked');
    }

    // Verify signature (simplified - in production use proper WebAuthn verification)
    const isValid = this.verifySignature(signature, biometricAuth.publicKey, session.challenge, clientData);

    if (!isValid) {
      biometricAuth.recordFailedAttempt();
      session.fail();
      
      if (biometricAuth.isRevoked()) {
        throw new Error('Biometric credential has been revoked due to too many failed attempts');
      }
      
      throw new Error('Biometric verification failed');
    }

    // Success
    biometricAuth.recordSuccessfulAttempt();
    session.verify();

    // Generate JWT token for authenticated session
    const token = this.generateBiometricToken(session.userId, session.deviceId);

    return {
      success: true,
      token,
      userId: session.userId,
      deviceId: session.deviceId,
      verifiedAt: session.verifiedAt
    };
  }

  // Verify cryptographic signature (simplified for demo)
  verifySignature(signature, publicKey, challenge, clientData) {
    // In production, implement proper WebAuthn/ FIDO2 verification
    // This is a simplified version for demonstration
    
    try {
      // Expected signature format: base64url encoded
      const expectedData = Buffer.from(challenge + clientData).toString('base64url');
      
      // Simple comparison - replace with proper crypto verification
      return signature === expectedData;
    } catch (error) {
      console.error('[Biometric] Signature verification error:', error);
      return false;
    }
  }

  // Generate JWT token for biometric session
  generateBiometricToken(userId, deviceId) {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'zentronix_biometric_secret';
    
    return jwt.sign(
      {
        userId,
        deviceId,
        authMethod: 'biometric',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      secret
    );
  }

  // List all biometric devices for a user
  async getUserBiometricDevices(userId) {
    const devices = this.db.biometricAuths?.filter(
      b => b.userId === userId
    ) || [];

    return devices.map(device => ({
      id: device.id,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      biometricType: device.biometricType,
      status: device.status,
      lastUsedAt: device.lastUsedAt,
      createdAt: device.createdAt
    }));
  }

  // Revoke a biometric device
  async revokeBiometricDevice(userId, deviceId) {
    const biometricAuth = this.db.biometricAuths?.find(
      b => b.userId === userId && b.deviceId === deviceId
    );

    if (!biometricAuth) {
      throw new Error('Biometric device not found');
    }

    biometricAuth.revoke();
    
    return {
      success: true,
      message: 'Biometric device revoked successfully'
    };
  }

  // Revoke all biometric devices for a user
  async revokeAllBiometricDevices(userId) {
    const devices = this.db.biometricAuths?.filter(
      b => b.userId === userId && b.status === 'active'
    ) || [];

    devices.forEach(device => device.revoke());

    return {
      success: true,
      message: `${devices.length} biometric device(s) revoked`,
      count: devices.length
    };
  }

  // Check if user has biometric authentication enabled
  async hasBiometricEnabled(userId, deviceId) {
    const biometricAuth = this.db.biometricAuths?.find(
      b => b.userId === userId && b.deviceId === deviceId && b.status === 'active'
    );
    
    return !!biometricAuth;
  }

  // Get biometric configuration
  getConfig() {
    return this.config;
  }

  // Update biometric configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    return this.config;
  }

  // Generate secure random challenge
  generateSecureChallenge() {
    return crypto.randomBytes(32).toString('base64url');
  }
}

module.exports = BiometricService;
