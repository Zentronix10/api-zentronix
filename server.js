// server.js - Zentronix Bank API Server
// Complete banking API with loans, Pix, cards, investments, and multi-currency support

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const logger = require('./logger');
const database = require('./database');
const loanController = require('./loancontroller');
const { criarCobrancaPix, consultarStatusPix } = require('./pix-integration');

// ==================== INITIALIZATION ====================
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zentronix-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ==================== MIDDLEWARES ====================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression for better performance
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-account-id', 'x-session-id']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
  skipSuccessfulRequests: true,
});

app.use('/api/', globalLimiter);
app.use('/api/auth/', authLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });
  next();
});

// ==================== AUTHENTICATION MIDDLEWARES ====================

/**
 * JWT Authentication middleware
 * Verifies the JWT token from Authorization header
 */
const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const account = await database.findAccountById(decoded.accountId);
    
    if (!account || account.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Account not found or inactive' });
    }
    
    req.account = account;
    req.accountId = account.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(403).json({ error: 'Invalid token.' });
  }
};

/**
 * Optional authentication - doesn't fail if no token, but sets account if valid
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const account = await database.findAccountById(decoded.accountId);
      if (account && account.status === 'ACTIVE') {
        req.account = account;
        req.accountId = account.id;
      }
    } catch (e) {
      // Ignore token errors in optional auth
    }
  }
  next();
};

/**
 * Admin authentication middleware
 */
const authenticateAdmin = async (req, res, next) => {
  await authenticateJWT(req, res, () => {
    if (req.account?.accountType !== 'ADMIN' && req.account?.accountNumber !== '100001') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

// ==================== VALIDATION HELPERS ====================

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
};

// ==================== HEALTH & SYSTEM ROUTES ====================

/**
 * GET /health - System health check
 */
app.get('/health', async (req, res) => {
  const stats = database.getStats();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    service: 'Zentronix Bank API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    database: stats
  });
});

/**
 * GET / - Welcome route
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Zentronix Bank API',
    version: '1.0.0',
    description: 'Complete digital banking solution',
    endpoints: {
      auth: '/api/auth',
      loans: '/api/loans',
      pix: '/api/pix',
      accounts: '/api/accounts',
      cards: '/api/cards',
      investments: '/api/investments',
      crypto: '/api/crypto'
    },
    documentation: 'https://github.com/Zentronix10/api-zentronix'
  });
});

// ==================== AUTHENTICATION ROUTES ====================

/**
 * POST /api/auth/login - Login with email/phone and password
 */
app.post('/api/auth/login', [
  body('identifier').notEmpty().withMessage('Email or phone is required'),
  body('password').notEmpty().withMessage('Password is required'),
], validateRequest, async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    // Find account by email or phone
    let account = await database.findAccountByEmail(identifier);
    if (!account) {
      account = await database.findAccountByDocument(identifier);
    }
    
    if (!account || account.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }
    
    // In production, compare hashed passwords
    // For demo, we accept any password for sample accounts
    const isValid = password === 'demo123' || (account.id === 1000 && password === 'joao123');
    
    if (!isValid) {
      logger.warn(`Failed login attempt for account: ${account.accountNumber}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { accountId: account.id, accountNumber: account.accountNumber },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Create session
    await database.createSession({
      accountId: account.id,
      token: token,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    await database.updateAccount(account.id, { lastLoginAt: new Date() });
    
    logger.info(`User logged in: ${account.accountNumber}`);
    
    res.json({
      success: true,
      token,
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        name: account.name,
        email: account.email,
        accountType: account.accountType,
        tier: account.tier
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout - Logout and invalidate session
 */
app.post('/api/auth/logout', authenticateJWT, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const session = await database.findSession(token);
      if (session) {
        await database.invalidateSession(token);
      }
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/2fa/setup - Setup 2FA for account
 */
app.post('/api/auth/2fa/setup', authenticateJWT, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Zentronix Bank (${req.account.email})`,
      issuer: 'Zentronix Bank'
    });
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    // Store secret temporarily (in production, save to database)
    req.account.temp2FASecret = secret.base32;
    
    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      otpauthUrl: secret.otpauth_url
    });
  } catch (error) {
    logger.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * POST /api/auth/2fa/verify - Verify and enable 2FA
 */
app.post('/api/auth/2fa/verify', authenticateJWT, [
  body('token').notEmpty().withMessage('2FA token is required'),
  body('secret').notEmpty().withMessage('Secret is required'),
], validateRequest, async (req, res) => {
  try {
    const { token, secret } = req.body;
    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    });
    
    if (verified) {
      await database.updateAccount(req.accountId, {
        twoFactorEnabled: true,
        twoFactorSecret: secret
      });
      res.json({ success: true, message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ error: 'Invalid 2FA token' });
    }
  } catch (error) {
    logger.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// ==================== ACCOUNT ROUTES ====================

/**
 * GET /api/accounts/me - Get current account details
 */
app.get('/api/accounts/me', authenticateJWT, async (req, res) => {
  const account = await database.findAccountById(req.accountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  
  res.json({
    id: account.id,
    accountNumber: account.accountNumber,
    accountType: account.accountType,
    name: account.name,
    email: account.email,
    phone: account.phone,
    balance: account.balance,
    blockedBalance: account.blockedBalance,
    availableBalance: account.balance - (account.blockedBalance || 0),
    currency: account.currency,
    status: account.status,
    tier: account.tier,
    twoFactorEnabled: account.twoFactorEnabled,
    biometricEnabled: account.biometricEnabled,
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt
  });
});

/**
 * GET /api/accounts/me/balance - Get account balance
 */
app.get('/api/accounts/me/balance', authenticateJWT, async (req, res) => {
  const account = await database.findAccountById(req.accountId);
  res.json({
    balance: account.balance,
    blockedBalance: account.blockedBalance || 0,
    availableBalance: account.balance - (account.blockedBalance || 0),
    currency: account.currency
  });
});

/**
 * GET /api/accounts/me/transactions - Get transaction history
 */
app.get('/api/accounts/me/transactions', authenticateJWT, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const transactions = await database.getAccountTransactions(req.accountId, limit);
  res.json({ transactions, count: transactions.length });
});

// ==================== LOAN ROUTES ====================

/**
 * POST /api/loans/request - Request a new loan
 */
app.post('/api/loans/request', authenticateJWT, [
  body('amount').isFloat({ min: 100 }).withMessage('Amount must be at least 100'),
  body('currency').optional().isIn(['BRL', 'USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
  body('termMonths').optional().isInt({ min: 3, max: 360 }).withMessage('Term must be between 3 and 360 months'),
  body('purpose').optional().isString().withMessage('Purpose must be a string')
], validateRequest, loanController.requestLoan);

/**
 * POST /api/loans/:loanId/approve - Approve a loan (admin only)
 */
app.post('/api/loans/:loanId/approve', authenticateAdmin, loanController.approveLoan);

/**
 * POST /api/loans/:loanId/pay - Pay installment from balance
 */
app.post('/api/loans/:loanId/pay', authenticateJWT, loanController.payInstallment);

/**
 * POST /api/loans/:loanId/pay-with-pix - Generate Pix for loan payment
 */
app.post('/api/loans/:loanId/pay-with-pix', authenticateJWT, loanController.payInstallmentWithPix);

/**
 * POST /api/loans/:loanId/early-payoff - Pay off loan early with discount
 */
app.post('/api/loans/:loanId/early-payoff', authenticateJWT, loanController.earlyPayoffLoan);

/**
 * GET /api/loans/my-loans - Get user's loans
 */
app.get('/api/loans/my-loans', authenticateJWT, loanController.getMyLoans);

/**
 * GET /api/loans/:loanId - Get loan details
 */
app.get('/api/loans/:loanId', authenticateJWT, loanController.getLoanDetails);

/**
 * POST /api/loans/webhook/payment-confirmed - Pix payment webhook
 */
app.post('/api/loans/webhook/payment-confirmed', loanController.confirmLoanPayment);

/**
 * GET /api/admin/loans/stats - Admin loan statistics
 */
app.get('/api/admin/loans/stats', authenticateAdmin, loanController.getLoanStats);

// ==================== PIX ROUTES ====================

/**
 * POST /api/pix/create-charge - Create a Pix charge
 */
app.post('/api/pix/create-charge', authenticateJWT, [
  body('value').isFloat({ min: 0.01 }).withMessage('Value must be at least 0.01'),
  body('description').optional().isString().withMessage('Description must be a string')
], validateRequest, async (req, res) => {
  try {
    const { value, description } = req.body;
    
    const pixCharge = await criarCobrancaPix({
      clienteId: req.accountId,
      valor: value,
      descricao: description || 'Zentronix Bank - Pix Payment'
    });
    
    if (pixCharge.success) {
      // Save pending payment to database
      await database.savePendingPayment({
        paymentId: pixCharge.cobrancaId,
        accountId: req.accountId,
        amount: value,
        status: 'PENDING',
        type: 'PIX',
        createdAt: new Date()
      });
      
      res.json({
        success: true,
        chargeId: pixCharge.cobrancaId,
        qrCode: pixCharge.payload,
        qrCodeImage: pixCharge.qrCodeImage,
        amount: value,
        expiresAt: pixCharge.expiresAt
      });
    } else {
      res.status(500).json({ error: pixCharge.error });
    }
  } catch (error) {
    logger.error('Pix charge error:', error);
    res.status(500).json({ error: 'Failed to create Pix charge' });
  }
});

/**
 * GET /api/pix/status/:chargeId - Check Pix payment status
 */
app.get('/api/pix/status/:chargeId', authenticateJWT, async (req, res) => {
  try {
    const { chargeId } = req.params;
    const status = await consultarStatusPix(chargeId);
    res.json(status);
  } catch (error) {
    logger.error('Pix status error:', error);
    res.status(500).json({ error: 'Failed to check Pix status' });
  }
});

// ==================== CARD ROUTES ====================

/**
 * GET /api/cards - Get user's cards
 */
app.get('/api/cards', authenticateJWT, async (req, res) => {
  try {
    const cards = await database.getCardsByAccount(req.accountId);
    res.json({ cards });
  } catch (error) {
    logger.error('Get cards error:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

/**
 * POST /api/cards - Create a new virtual card
 */
app.post('/api/cards', authenticateJWT, [
  body('cardType').isIn(['VIRTUAL', 'PHYSICAL']).withMessage('Invalid card type'),
  body('network').optional().isIn(['VISA', 'MASTERCARD']).withMessage('Invalid network')
], validateRequest, async (req, res) => {
  try {
    const { cardType, network = 'VISA' } = req.body;
    const account = await database.findAccountById(req.accountId);
    
    // Generate masked card number
    const lastFour = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const maskedNumber = `**** **** **** ${lastFour}`;
    
    const newCard = await database.createCard({
      accountId: req.accountId,
      accountNumber: account.accountNumber,
      cardType: cardType,
      network: network,
      lastFour: lastFour,
      maskedNumber: maskedNumber,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000) // 3 years
    });
    
    logger.info(`Card created for account ${account.accountNumber}`);
    res.status(201).json({
      success: true,
      card: {
        id: newCard.cardId,
        lastFour: newCard.lastFour,
        maskedNumber: newCard.maskedNumber,
        cardType: newCard.cardType,
        network: newCard.network,
        status: newCard.status,
        expiresAt: newCard.expiresAt
      }
    });
  } catch (error) {
    logger.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

/**
 * PATCH /api/cards/:cardId/block - Block a card
 */
app.patch('/api/cards/:cardId/block', authenticateJWT, async (req, res) => {
  try {
    const { cardId } = req.params;
    const card = await database.updateCardStatus(cardId, 'BLOCKED');
    
    if (!card || card.accountId !== req.accountId) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    res.json({ success: true, message: 'Card blocked successfully' });
  } catch (error) {
    logger.error('Block card error:', error);
    res.status(500).json({ error: 'Failed to block card' });
  }
});

// ==================== INVESTMENT ROUTES ====================

/**
 * GET /api/investments - Get user's investments
 */
app.get('/api/investments', authenticateJWT, async (req, res) => {
  try {
    const investments = await database.getInvestmentsByAccount(req.accountId);
    res.json({ investments });
  } catch (error) {
    logger.error('Get investments error:', error);
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

// ==================== CRYPTO ROUTES ====================

/**
 * GET /api/crypto/wallets - Get user's crypto wallets
 */
app.get('/api/crypto/wallets', authenticateJWT, async (req, res) => {
  try {
    const wallets = await database.getCryptoWalletsByAccount(req.accountId);
    res.json({ wallets });
  } catch (error) {
    logger.error('Get crypto wallets error:', error);
    res.status(500).json({ error: 'Failed to fetch crypto wallets' });
  }
});

// ==================== ERROR HANDLING ====================

/**
 * 404 handler for unmatched routes
 */
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

/**
 * Global error handler
 */
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================

const server = app.listen(PORT, () => {
  logger.info(`🚀 Zentronix Bank API is running on port ${PORT}`);
  logger.info(`📌 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🌐 Pix mode: ${process.env.USE_ASAAS === 'true' ? 'REAL (Asaas)' : 'DEMONSTRATION (Mock)'}`);
  logger.info(`🔐 JWT Authentication: ${JWT_SECRET !== 'zentronix-super-secret-key-change-in-production' ? 'Configured' : 'Using default (change in production!)'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
