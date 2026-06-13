// server.js
// Zentronix Offshore Bank - Main Server
// Versão simplificada para funcionar no Render

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// ==================== INITIALIZATION ====================

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
let pool = null;
let dbAvailable = false;

const initDatabase = () => {
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️ DATABASE_URL not set. Running in demo mode');
        return null;
    }
    
    try {
        const dbPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        });
        return dbPool;
    } catch (error) {
        console.error('❌ Database error:', error.message);
        return null;
    }
};

// ==================== MIDDLEWARE ====================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many authentication attempts, please try again later.' }
});

// ==================== AUTHENTICATION MIDDLEWARE ====================

const authenticateToken = async (req, res, next) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable.' });
    }
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

// ==================== HEALTH CHECK ====================

app.get('/health', async (req, res) => {
    let dbStatus = 'not_configured';
    
    if (pool && dbAvailable) {
        try {
            await pool.query('SELECT 1');
            dbStatus = 'connected';
        } catch (error) {
            dbStatus = 'error';
        }
    }
    
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        service: 'Zentronix Bank API',
        version: '1.0.0',
        database: dbStatus,
        demoMode: !dbAvailable,
        message: 'API funcionando corretamente!'
    });
});

// ==================== ROTAS PRINCIPAIS ====================

app.get('/', (req, res) => {
    res.json({
        name: 'Zentronix Offshore Bank API',
        status: 'online',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: 'GET /health',
            supportedChains: 'GET /api/supported-chains',
            demo: 'GET /api/demo'
        }
    });
});

// ==================== DEMO ROUTES ====================

app.get('/api/demo', (req, res) => {
    res.json({
        mode: 'demo',
        message: 'Zentronix Bank API está online!',
        timestamp: new Date().toISOString(),
        nextSteps: [
            'Adicionar DATABASE_URL para conectar PostgreSQL',
            'Configurar JWT_SECRET para autenticação',
            'Adicionar wallet-generator.js para carteiras blockchain'
        ]
    });
});

// ==================== SUPPORTED BLOCKCHAINS ====================

app.get('/api/supported-chains', (req, res) => {
    res.json({
        success: true,
        blockchains: [
            { code: 'BTC', name: 'Bitcoin', network: 'Mainnet' },
            { code: 'ETH', name: 'Ethereum', network: 'Mainnet' },
            { code: 'SOL', name: 'Solana', network: 'Mainnet' },
            { code: 'LTC', name: 'Litecoin', network: 'Mainnet' },
            { code: 'BNB', name: 'Binance Coin', network: 'BSC' },
            { code: 'USDT', name: 'Tether', network: 'Ethereum' },
            { code: 'MATIC', name: 'Polygon', network: 'Mainnet' }
        ],
        count: 7
    });
});

// ==================== AUTH ROUTES (Demo) ====================

app.post('/api/auth/register', authLimiter, [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('fullName').notEmpty()
], async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ 
            error: 'Database not configured',
            message: 'Configure DATABASE_URL para ativar registro de usuários'
        });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    res.json({
        success: true,
        message: 'Registro desativado em modo demo. Configure o banco de dados.'
    });
});

app.post('/api/auth/login', authLimiter, [
    body('email').isEmail(),
    body('password').notEmpty()
], async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ 
            error: 'Database not configured',
            message: 'Configure DATABASE_URL para ativar login'
        });
    }
    
    res.json({
        success: true,
        message: 'Login desativado em modo demo. Configure o banco de dados.'
    });
});

// ==================== WALLET ROUTES (Demo) ====================

app.get('/api/wallets', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        demoMode: true,
        wallets: [
            { blockchain: 'BTC', address: 'Demo mode - configure database', balance: 0 },
            { blockchain: 'ETH', address: 'Demo mode - configure database', balance: 0 },
            { blockchain: 'SOL', address: 'Demo mode - configure database', balance: 0 }
        ]
    });
});

app.get('/api/balances', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        demoMode: true,
        balances: [
            { blockchain: 'BTC', balance: 0 },
            { blockchain: 'ETH', balance: 0 },
            { blockchain: 'SOL', balance: 0 },
            { blockchain: 'USDT', balance: 0 }
        ]
    });
});

// ==================== USER ROUTES (Demo) ====================

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    res.json({
        success: true,
        demoMode: true,
        user: {
            id: req.userId,
            email: req.userEmail,
            fullName: 'Demo User',
            message: 'Configure o banco de dados para funcionalidade completa'
        }
    });
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ==================== START SERVER ====================

async function startServer() {
    pool = initDatabase();
    dbAvailable = pool !== null;
    
    if (dbAvailable) {
        try {
            await pool.query('SELECT 1');
            console.log('✅ Database connected');
        } catch (error) {
            console.warn('⚠️ Database connection failed');
            dbAvailable = false;
            pool = null;
        }
    } else {
        console.log('ℹ️ Running in demo mode');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Zentronix Bank API running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`💾 Database: ${dbAvailable ? 'Connected' : 'Demo Mode'}`);
        console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });
}

startServer();

module.exports = { app, pool };
