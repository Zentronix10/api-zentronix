const express = require('express');
const BiometricController = require('../controllers/biometricController');
const BiometricService = require('../services/biometricService');
const { requireBiometricAuth } = require('../middlewares/biometricMiddleware');

module.exports = (db, authMiddleware) => {
  const router = express.Router();
  const biometricService = new BiometricService(db);
  const biometricController = new BiometricController(biometricService);

  // Public routes (no auth required for initial setup)
  router.post('/auth/start', (req, res) => biometricController.startAuthentication(req, res));
  router.post('/auth/verify', (req, res) => biometricController.verifyAuthentication(req, res));

  // Protected routes (require standard auth)
  router.use(authMiddleware);

  // Registration routes
  router.post('/register/start', (req, res) => biometricController.startRegistration(req, res));
  router.post('/register/complete', (req, res) => biometricController.completeRegistration(req, res));

  // Device management
  router.get('/devices', (req, res) => biometricController.getDevices(req, res));
  router.delete('/devices/:deviceId', (req, res) => biometricController.revokeDevice(req, res));
  router.delete('/devices', (req, res) => biometricController.revokeAllDevices(req, res));
  router.get('/status/:deviceId', (req, res) => biometricController.checkStatus(req, res));

  // Admin routes
  router.get('/config', (req, res) => biometricController.getConfig(req, res));
  router.put('/config', (req, res) => biometricController.updateConfig(req, res));

  return router;
};
