// server.js - Zentronix Bank API Server (Versão Simplificada para Render)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// ==================== INITIALIZATION ====================
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zentronix-super-secret-key-change-in-production';

// ==================== MIDDLEWARES ====================
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

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again after 15 minutes' },
});

app.use('/api/', globalLimiter);

// ==================== AUTHENTICATION MIDDLEWARE ====================
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.accountId = decoded.accountId;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

// ==================== HEALTH & SYSTEM ROUTES ====================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    service: 'Zentronix Bank API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Zentronix Bank API',
    version: '1.0.0',
    description: 'Complete digital banking solution',
    status: 'API is running successfully on Render! 🚀',
    endpoints: {
      health: '/health',
      auth: '/api/auth/login',
      verify: '/api/verify'
    }
  });
});

// ==================== AUTHENTICATION ROUTES ====================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Versão de demonstração - Aceita login demo
  if (email === 'demo@zentronix.com' && password === 'demo123') {
    const token = jwt.sign(
      { accountId: 1001, email: email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      account: {
        id: 1001,
        name: 'Usuário Demo',
        email: email,
        accountType: 'PREMIUM'
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials. Use demo@zentronix.com / demo123' });
  }
});

app.get('/api/verify', authenticateJWT, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Token is valid',
    accountId: req.accountId 
  });
});

// ==================== ACCOUNT ROUTES ====================

app.get('/api/accounts/me', authenticateJWT, (req, res) => {
  res.json({
    id: req.accountId,
    accountNumber: '100001',
    accountType: 'PREMIUM',
    name: 'Usuário Demo',
    email: 'demo@zentronix.com',
    balance: 15000.00,
    availableBalance: 15000.00,
    currency: 'BRL',
    status: 'ACTIVE',
    tier: 'DIAMOND'
  });
});

app.get('/api/accounts/me/balance', authenticateJWT, (req, res) => {
  res.json({
    balance: 15000.00,
    blockedBalance: 0,
    availableBalance: 15000.00,
    currency: 'BRL'
  });
});

// ==================== LOAN ROUTES (Simplificadas) ====================

app.post('/api/loans/request', authenticateJWT, (req, res) => {
  const { amount, termMonths } = req.body;
  
  // Taxa de juros simulada: 1.5% ao mês
  const monthlyRate = 0.015;
  const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = totalPayment - amount;
  
  res.json({
    success: true,
    loanId: 'LOAN-' + Date.now(),
    amount: amount,
    termMonths: termMonths,
    monthlyPayment: monthlyPayment.toFixed(2),
    totalPayment: totalPayment.toFixed(2),
    totalInterest: totalInterest.toFixed(2),
    interestRate: monthlyRate * 100,
    status: 'PENDING_ANALYSIS'
  });
});

app.get('/api/loans/my-loans', authenticateJWT, (req, res) => {
  res.json({
    loans: [
      {
        id: 'LOAN-001',
        amount: 5000,
        remainingBalance: 3200,
        monthlyPayment: 450.00,
        nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        paidInstallments: 4,
        totalInstallments: 12
      }
    ]
  });
});

// ==================== PIX ROUTES (Simplificadas) ====================

app.post('/api/pix/create-charge', authenticateJWT, (req, res) => {
  const { value, description } = req.body;
  const chargeId = 'PIX-' + Date.now();
  
  res.json({
    success: true,
    chargeId: chargeId,
    qrCode: `00020126360014BR.GOV.BCB.PIX0114+5500000000015204000053039865802BR5925Zentronix Bank6013SAO PAULO62070503***6304${Math.floor(Math.random() * 10000)}`,
    qrCodeImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    amount: value,
    description: description || 'Zentronix Bank - Pix Payment',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000)
  });
});

app.get('/api/pix/status/:chargeId', authenticateJWT, (req, res) => {
  res.json({
    chargeId: req.params.chargeId,
    status: 'COMPLETED',
    paidAt: new Date(),
    amount: 100.00
  });
});

// ==================== CARD ROUTES (Simplificadas) ====================

app.get('/api/cards', authenticateJWT, (req, res) => {
  res.json({
    cards: [
      {
        id: 'CARD-001',
        lastFour: '1234',
        maskedNumber: '**** **** **** 1234',
        cardType: 'PHYSICAL',
        network: 'VISA',
        status: 'ACTIVE',
        expiresAt: new Date(2028, 11, 31),
        limit: 5000,
        usedLimit: 1250
      },
      {
        id: 'CARD-002',
        lastFour: '5678',
        maskedNumber: '**** **** **** 5678',
        cardType: 'VIRTUAL',
        network: 'MASTERCARD',
        status: 'ACTIVE',
        expiresAt: new Date(2027, 5, 30),
        limit: 2000,
        usedLimit: 350
      }
    ]
  });
});

app.post('/api/cards', authenticateJWT, (req, res) => {
  const { cardType, network = 'VISA' } = req.body;
  const lastFour = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  res.status(201).json({
    success: true,
    card: {
      id: 'CARD-' + Date.now(),
      lastFour: lastFour,
      maskedNumber: `**** **** **** ${lastFour}`,
      cardType: cardType,
      network: network,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000)
    }
  });
});

// ==================== INVESTMENT ROUTES ====================

app.get('/api/investments', authenticateJWT, (req, res) => {
  res.json({
    investments: [
      {
        id: 'INV-001',
        name: 'CDB Pós-Fixado',
        amount: 5000,
        profitability: 112.5,
        percentageReturn: 2.25,
        dueDate: new Date(2027, 5, 15),
        status: 'ACTIVE'
      },
      {
        id: 'INV-002',
        name: 'Tesouro Selic',
        amount: 3000,
        profitability: 45.75,
        percentageReturn: 1.525,
        dueDate: new Date(2029, 10, 30),
        status: 'ACTIVE'
      }
    ]
  });
});

// ==================== CRYPTO ROUTES ====================

app.get('/api/crypto/wallets', authenticateJWT, (req, res) => {
  res.json({
    wallets: [
      {
        currency: 'BTC',
        balance: 0.0025,
        balanceBRL: 850.75,
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      },
      {
        currency: 'ETH',
        balance: 0.15,
        balanceBRL: 1850.30,
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7'
      }
    ]
  });
});

// ==================== 404 HANDLER ====================
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// ==================== ERROR HANDLER ====================
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================
app.listen(PORT, () => {
  console.log(`🚀 Zentronix Bank API is running on port ${PORT}`);
  console.log(`📌 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});

module.exports = app;
