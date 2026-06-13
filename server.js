// server.js
// Zentronix Offshore Bank - Main Server
// AES-256-GCM Encryption | Multi-Blockchain Wallet Support
// Production Ready - DO NOT MODIFY WITHOUT SECURITY REVIEW

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

// Local modules
const { encrypt, decrypt, testEncryption, getEncryptionStatus } = require('./encryption');
const WalletGenerator = require('./wallet-generator');

// ==================== INITIALIZATION ====================

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection com fallback para quando não há banco
let pool = null;
let dbAvailable = false;

const initDatabase = () => {
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️ DATABASE_URL not set. Running in demo mode (no database)');
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
        console.error('❌ Database initialization error:', error.message);
        return null;
    }
};

// ==================== MIDDLEWARE ====================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true
}));

// Compression
app.use(compression());

// JSON parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many authentication attempts, please try again later.' }
});

// ==================== AUTHENTICATION MIDDLEWARE ====================

const authenticateToken = async (req, res, next) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable. Please try again later.' });
    }
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        
        // Verify user still exists
        const user = await pool.query('SELECT id, status FROM users WHERE id = $1', [req.userId]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'User not found.' });
        }
        if (user.rows[0].status === 'suspended') {
            return res.status(401).json({ error: 'Account suspended. Contact support.' });
        }
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

// Optional: Admin middleware
const authenticateAdmin = async (req, res, next) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable.' });
    }
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied.' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await pool.query('SELECT id, role FROM users WHERE id = $1', [decoded.userId]);
        
        if (user.rows.length === 0 || user.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }
        
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid token.' });
    }
};

// ==================== HEALTH CHECK ====================

app.get('/health', async (req, res) => {
    const encryptionStatus = getEncryptionStatus();
    let dbStatus = 'not_configured';
    
    if (pool && dbAvailable) {
        try {
            await pool.query('SELECT 1');
            dbStatus = 'connected';
        } catch (error) {
            dbStatus = 'error';
        }
    } else if (!process.env.DATABASE_URL) {
        dbStatus = 'not_configured';
    } else {
        dbStatus = 'disconnected';
    }
    
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        service: 'Zentronix Bank API',
        version: '1.0.0',
        database: dbStatus,
        encryption: encryptionStatus,
        supportedBlockchains: WalletGenerator.getSupportedBlockchains(),
        demoMode: !dbAvailable
    });
});

// ==================== DEMO MODE ROUTES (quando não há banco) ====================

// Rota simples para teste quando o banco não está configurado
app.get('/api/demo/status', (req, res) => {
    res.json({
        mode: 'demo',
        message: 'Zentronix Bank API is running in demo mode. Configure DATABASE_URL for full functionality.',
        endpoints: [
            'GET /health',
            'GET /api/demo/status',
            'GET /api/supported-chains'
        ]
    });
});

// ==================== AUTHENTICATION ROUTES ====================

/**
 * Register new user
 * POST /api/auth/register
 */
app.post('/api/auth/register', authLimiter, [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('fullName').notEmpty().trim(),
    body('country').optional().trim()
], async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ 
            error: 'Database not configured. Please set DATABASE_URL environment variable.',
            demoMessage: 'This is a demo response. Configure PostgreSQL to enable registration.'
        });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password, fullName, country, phone } = req.body;
    
    try {
        // Check if user exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        
        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        
        // Create user
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, country, phone, kyc_status, created_at)
             VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
             RETURNING id, email, full_name, created_at`,
            [email, passwordHash, fullName, country, phone]
        );
        
        const user = result.rows[0];
        
        // Generate all wallets for the user
        const wallets = WalletGenerator.generateAllWallets(user.id);
        
        // Save wallets to database
        for (const [blockchain, walletData] of Object.entries(wallets.wallets)) {
            let generatorFunc;
            switch (blockchain) {
                case 'BTC': generatorFunc = () => WalletGenerator.generateBitcoin(user.id); break;
                case 'ETH': generatorFunc = () => WalletGenerator.generateEthereum(user.id); break;
                case 'SOL': generatorFunc = () => WalletGenerator.generateSolana(user.id); break;
                case 'LTC': generatorFunc = () => WalletGenerator.generateLitecoin(user.id); break;
                case 'BNB': generatorFunc = () => WalletGenerator.generateBNB(user.id); break;
                case 'USDT': generatorFunc = () => WalletGenerator.generateUSDT(user.id); break;
                case 'MATIC': generatorFunc = () => WalletGenerator.generatePolygon(user.id); break;
                default: continue;
            }
            
            const fullWallet = generatorFunc();
            
            await pool.query(
                `INSERT INTO wallets (user_id, blockchain, address, encrypted_private_key, encrypted_mnemonic, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [user.id, blockchain, fullWallet.address, fullWallet.encryptedPrivateKey, fullWallet.encryptedMnemonic || null]
            );
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'temporary-secret-change-this',
            { expiresIn: '24h' }
        );
        
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                createdAt: user.created_at
            },
            wallets: wallets.wallets,
            message: 'Account created successfully. Complete KYC to activate full features.'
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create account.' });
    }
});

/**
 * Login user
 * POST /api/auth/login
 */
app.post('/api/auth/login', authLimiter, [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ 
            error: 'Database not configured. Please set DATABASE_URL environment variable.'
        });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { email, password } = req.body;
    
    try {
        const result = await pool.query(
            `SELECT id, email, password_hash, full_name, kyc_status, status, role
             FROM users WHERE email = $1`,
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        
        const user = result.rows[0];
        
        if (user.status === 'suspended') {
            return res.status(401).json({ error: 'Account suspended. Contact support.' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        
        // Get user wallets
        const walletsResult = await pool.query(
            `SELECT blockchain, address, created_at FROM wallets WHERE user_id = $1`,
            [user.id]
        );
        
        const wallets = {};
        walletsResult.rows.forEach(w => {
            wallets[w.blockchain] = {
                address: w.address,
                createdAt: w.created_at
            };
        });
        
        // Generate token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'temporary-secret-change-this',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                kycStatus: user.kyc_status,
                role: user.role
            },
            wallets
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed.' });
    }
});

/**
 * Logout (invalidate token - client side)
 * POST /api/auth/logout
 */
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
    res.json({ success: true, message: 'Logged out successfully.' });
});

// ==================== WALLET ROUTES ====================

/**
 * Generate a new wallet for specific blockchain
 * POST /api/wallet/generate
 */
app.post('/api/wallet/generate', authenticateToken, [
    body('blockchain').isIn(['BTC', 'ETH', 'SOL', 'LTC', 'BNB', 'USDT', 'MATIC'])
], async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable.' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { blockchain } = req.body;
    const userId = req.userId;
    
    try {
        // Check if wallet already exists
        const existing = await pool.query(
            'SELECT id, address FROM wallets WHERE user_id = $1 AND blockchain = $2',
            [userId, blockchain]
        );
        
        if (existing.rows.length > 0) {
            return res.status(409).json({
                error: 'Wallet already exists',
                address: existing.rows[0].address
            });
        }
        
        // Generate new wallet
        let wallet;
        switch (blockchain) {
            case 'BTC': wallet = WalletGenerator.generateBitcoin(userId); break;
            case 'ETH': wallet = WalletGenerator.generateEthereum(userId); break;
            case 'SOL': wallet = WalletGenerator.generateSolana(userId); break;
            case 'LTC': wallet = WalletGenerator.generateLitecoin(userId); break;
            case 'BNB': wallet = WalletGenerator.generateBNB(userId); break;
            case 'USDT': wallet = WalletGenerator.generateUSDT(userId); break;
            case 'MATIC': wallet = WalletGenerator.generatePolygon(userId); break;
            default: return res.status(400).json({ error: 'Unsupported blockchain.' });
        }
        
        // Save to database
        await pool.query(
            `INSERT INTO wallets (user_id, blockchain, address, encrypted_private_key, encrypted_mnemonic, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [userId, blockchain, wallet.address, wallet.encryptedPrivateKey, wallet.encryptedMnemonic || null]
        );
        
        res.json({
            success: true,
            blockchain,
            address: wallet.address,
            explorerUrl: wallet.explorerUrl,
            message: `${blockchain} wallet created successfully.`
        });
        
    } catch (error) {
        console.error('Wallet generation error:', error);
        res.status(500).json({ error: 'Failed to generate wallet.' });
    }
});

/**
 * Get all user wallets
 * GET /api/wallets
 */
app.get('/api/wallets', authenticateToken, async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable.' });
    }
    
    const userId = req.userId;
    
    try {
        const result = await pool.query(
            `SELECT blockchain, address, created_at, status 
             FROM wallets WHERE user_id = $1 
             ORDER BY created_at ASC`,
            [userId]
        );
        
        res.json({
            success: true,
            wallets: result.rows
        });
        
    } catch (error) {
        console.error('Get wallets error:', error);
        res.status(500).json({ error: 'Failed to retrieve wallets.' });
    }
});

/**
 * Get wallet by blockchain
 * GET /api/wallet/:blockchain
 */
app.get('/api/wallet/:blockchain', authenticateToken, async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable.' });
    }
    
    const { blockchain } = req.params;
    const userId = req.userId;
    
    try {
        const result = await pool.query(
            `SELECT blockchain, address, created_at, status 
             FROM wallets 
             WHERE user_id = $1 AND blockchain = $2`,
            [userId, blockchain.toUpperCase()]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Wallet not found.' });
        }
        
        res.json({
            success: true,
            wallet: result.rows[0],
            explorerUrl: WalletGenerator.getExplorerUrl(blockchain.toUpperCase(), result.rows[0].address),
            networkInfo: {
                name: WalletGenerator.getNetworkName(blockchain.toUpperCase()),
                minDeposit: WalletGenerator.getMinimumDeposit(blockchain.toUpperCase()),
                confirmationTime: WalletGenerator.getConfirmationTime(blockchain.toUpperCase())
            }
        });
        
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({ error: 'Failed to retrieve wallet.' });
    }
});

// ==================== BALANCE ROUTES ====================

/**
 * Get all balances
 * GET /api/balances
 */
app.get('/api/balances', authenticateToken, async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.json({
            success: true,
            demoMode: true,
            balances: [
                { blockchain: 'BTC', balance: 0, address: 'Demo mode - no wallet' },
                { blockchain: 'ETH', balance: 0, address: 'Demo mode - no wallet' },
                { blockchain: 'SOL', balance: 0, address: 'Demo mode - no wallet' },
                { blockchain: 'USDT', balance: 0, address: 'Demo mode - no wallet' }
            ]
        });
    }
    
    const userId = req.userId;
    
    try {
        const result = await pool.query(
            `SELECT w.blockchain, w.address, COALESCE(b.balance, 0) as balance
             FROM wallets w
             LEFT JOIN balances b ON w.id = b.wallet_id
             WHERE w.user_id = $1`,
            [userId]
        );
        
        res.json({
            success: true,
            balances: result.rows
        });
        
    } catch (error) {
        console.error('Get balances error:', error);
        res.status(500).json({ error: 'Failed to retrieve balances.' });
    }
});

// ==================== TRANSACTION ROUTES ====================

/**
 * Create transaction
 * POST /api/transaction/send
 */
app.post('/api/transaction/send', authenticateToken, [
    body('blockchain').isIn(['BTC', 'ETH', 'SOL', 'LTC', 'BNB', 'USDT', 'MATIC']),
    body('toAddress').notEmpty().trim(),
    body('amount').isFloat({ min: 0.000001 }),
    body('note').optional().trim()
], async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable. Transactions require database.' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const { blockchain, toAddress, amount, note } = req.body;
    const userId = req.userId;
    
    try {
        // Validate address format
        if (!WalletGenerator.validateAddress(blockchain, toAddress)) {
            return res.status(400).json({ error: 'Invalid wallet address format.' });
        }
        
        // Get user's wallet
        const walletResult = await pool.query(
            `SELECT id, address, encrypted_private_key FROM wallets 
             WHERE user_id = $1 AND blockchain = $2`,
            [userId, blockchain]
        );
        
        if (walletResult.rows.length === 0) {
            return res.status(404).json({ error: 'Wallet not found.' });
        }
        
        const wallet = walletResult.rows[0];
        
        // Check balance
        const balanceResult = await pool.query(
            `SELECT balance FROM balances WHERE wallet_id = $1`,
            [wallet.id]
        );
        
        const currentBalance = balanceResult.rows[0]?.balance || 0;
        
        if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance.' });
        }
        
        // Create transaction record
        const txResult = await pool.query(
            `INSERT INTO transactions (user_id, wallet_id, type, amount, currency, to_address, status, note, created_at)
             VALUES ($1, $2, 'send', $3, $4, $5, 'pending', $6, NOW())
             RETURNING id`,
            [userId, wallet.id, amount, blockchain, toAddress, note || null]
        );
        
        res.json({
            success: true,
            transactionId: txResult.rows[0].id,
            status: 'pending',
            message: 'Transaction submitted. Waiting for confirmation.'
        });
        
    } catch (error) {
        console.error('Transaction error:', error);
        res.status(500).json({ error: 'Transaction failed.' });
    }
});

/**
 * Get transaction history
 * GET /api/transactions
 */
app.get('/api/transactions', authenticateToken, async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.json({
            success: true,
            demoMode: true,
            transactions: [],
            count: 0
        });
    }
    
    const userId = req.userId;
    const { limit = 50, offset = 0, blockchain } = req.query;
    
    try {
        let query = `
            SELECT t.*, w.blockchain, w.address as from_address
            FROM transactions t
            JOIN wallets w ON t.wallet_id = w.id
            WHERE t.user_id = $1
        `;
        const params = [userId];
        
        if (blockchain) {
            query += ` AND w.blockchain = $${params.length + 1}`;
            params.push(blockchain);
        }
        
        query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            transactions: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to retrieve transactions.' });
    }
});

// ==================== USER ROUTES ====================

/**
 * Get user profile
 * GET /api/user/profile
 */
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable.' });
    }
    
    const userId = req.userId;
    
    try {
        const result = await pool.query(
            `SELECT id, email, full_name, country, phone, kyc_status, status, created_at
             FROM users WHERE id = $1`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        res.json({
            success: true,
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to retrieve profile.' });
    }
});

/**
 * Update user profile
 * PUT /api/user/profile
 */
app.put('/api/user/profile', authenticateToken, [
    body('fullName').optional().trim(),
    body('phone').optional().trim(),
    body('country').optional().trim()
], async (req, res) => {
    if (!dbAvailable || !pool) {
        return res.status(503).json({ error: 'Database unavailable.' });
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    const userId = req.userId;
    const { fullName, phone, country } = req.body;
    
    try {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        
        if (fullName) {
            updates.push(`full_name = $${paramIndex++}`);
            params.push(fullName);
        }
        if (phone) {
            updates.push(`phone = $${paramIndex++}`);
            params.push(phone);
        }
        if (country) {
            updates.push(`country = $${paramIndex++}`);
            params.push(country);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }
        
        updates.push(`updated_at = NOW()`);
        params.push(userId);
        
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
            params
        );
        
        res.json({
            success: true,
            message: 'Profile updated successfully.'
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// ==================== SUPPORTED BLOCKCHAINS ====================

/**
 * Get supported blockchains
 * GET /api/supported-chains
 */
app.get('/api/supported-chains', async (req, res) => {
    res.json({
        success: true,
        blockchains: WalletGenerator.getSupportedBlockchains(),
        count: WalletGenerator.getSupportedBlockchains().length
    });
});

// ==================== ENCRYPTION TEST (Admin only) ====================

/**
 * Test encryption (admin only)
 * GET /api/admin/test-encryption
 */
app.get('/api/admin/test-encryption', authenticateAdmin, async (req, res) => {
    const result = testEncryption();
    const status = getEncryptionStatus();
    
    res.json({
        success: result,
        status: status,
        timestamp: new Date().toISOString()
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error.' });
});

// ==================== START SERVER ====================

async function startServer() {
    // Initialize database connection
    pool = initDatabase();
    dbAvailable = pool !== null;
    
    if (dbAvailable) {
        try {
            // Test database connection with timeout
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Database connection timeout')), 5000)
            );
            await Promise.race([pool.query('SELECT 1'), timeoutPromise]);
            console.log('✅ Database connected');
        } catch (error) {
            console.warn(`⚠️ Database connection failed: ${error.message}`);
            console.warn('⚠️ Running in demo mode without database');
            dbAvailable = false;
            pool = null;
        }
    } else {
        console.log('ℹ️ Running in demo mode. Set DATABASE_URL to enable full functionality.');
    }
    
    // Test encryption (don't let it crash the server)
    try {
        const encryptionTest = testEncryption();
        if (!encryptionTest) {
            console.warn('⚠️ Encryption test failed. Check MASTER_ENCRYPTION_KEY');
        }
    } catch (error) {
        console.warn('⚠️ Encryption module error:', error.message);
    }
    
    // CRITICAL FIX: Use '0.0.0.0' to bind to all network interfaces (required by Render)
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Zentronix Bank API running on port ${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`💾 Database: ${dbAvailable ? 'Connected' : 'Demo Mode (no database)'}`);
        console.log(`🔗 Supported blockchains: ${WalletGenerator.getSupportedBlockchains().map(b => b.code).join(', ')}`);
        console.log(`📍 Health check: http://localhost:${PORT}/health`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('SIGTERM received, closing server...');
        if (pool) {
            await pool.end();
        }
        process.exit(0);
    });
}

startServer();

module.exports = { app, pool };
