// database.js
// Zentronix Offshore Bank - Database Module
// PostgreSQL with AES-256-GCM encrypted fields
// Production Ready - Includes all tables, indexes, and optimized queries

const { Pool } = require('pg');
const crypto = require('crypto');

// ==================== DATABASE CONNECTION ====================

// Connection pool configuration
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,                      // Maximum number of clients in pool
    idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
    connectionTimeoutMillis: 5000, // Timeout for connection attempts
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false  // For production with proper SSL certificates
    } : false
};

const pool = new Pool(poolConfig);

// Test database connection
pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected database error:', err);
    process.exit(1);
});

// ==================== SCHEMA DEFINITION ====================

const SCHEMA_SQL = `
-- ======================================================
-- ZENTRONIX OFFSHORE BANK - COMPLETE DATABASE SCHEMA
-- Version: 1.0.0
-- Encryption: AES-256-GCM for sensitive data
-- ======================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS TABLE ====================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    document_id VARCHAR(50),
    document_type VARCHAR(20) CHECK (document_type IN ('cpf', 'cnpj', 'passport', 'ssn')),
    country VARCHAR(100),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    postal_code VARCHAR(20),
    
    -- KYC Fields
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'approved', 'rejected', 'suspended')),
    kyc_submitted_at TIMESTAMP,
    kyc_approved_at TIMESTAMP,
    kyc_rejection_reason TEXT,
    
    -- Security Fields
    two_factor_secret TEXT,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    
    -- Account Status
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'support')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,
    
    -- Indexes
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ==================== SESSIONS TABLE ====================

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    
    INDEX idx_sessions_user_token (user_id, token_hash),
    INDEX idx_sessions_expires (expires_at)
);

-- ==================== WALLETS TABLE ====================

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blockchain VARCHAR(10) NOT NULL CHECK (blockchain IN ('BTC', 'ETH', 'SOL', 'LTC', 'BNB', 'USDT', 'MATIC')),
    address VARCHAR(100) UNIQUE NOT NULL,
    encrypted_private_key JSONB NOT NULL,  -- AES-256-GCM encrypted object
    encrypted_mnemonic JSONB,              -- Optional mnemonic backup
    public_key TEXT,
    address_type VARCHAR(20) DEFAULT 'default',
    network VARCHAR(50) DEFAULT 'mainnet',
    
    -- Wallet metadata
    label VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'archived')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    
    -- Constraints
    UNIQUE(user_id, blockchain),
    CONSTRAINT valid_address CHECK (length(address) >= 26)
);

-- ==================== BALANCES TABLE ====================

CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    blockchain VARCHAR(10) NOT NULL,
    balance DECIMAL(40, 18) DEFAULT 0,
    locked_balance DECIMAL(40, 18) DEFAULT 0,
    staked_balance DECIMAL(40, 18) DEFAULT 0,
    pending_receive DECIMAL(40, 18) DEFAULT 0,
    pending_send DECIMAL(40, 18) DEFAULT 0,
    
    -- Token specific (for USDT, etc.)
    token_contract VARCHAR(100),
    token_decimals INTEGER DEFAULT 18,
    
    -- Timestamps
    updated_at TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP,
    
    UNIQUE(wallet_id)
);

-- ==================== TRANSACTIONS TABLE ====================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    
    -- Transaction details
    type VARCHAR(20) NOT NULL CHECK (type IN ('send', 'receive', 'stake', 'unstake', 'swap', 'buy', 'sell', 'fee')),
    amount DECIMAL(40, 18) NOT NULL,
    fee DECIMAL(40, 18) DEFAULT 0,
    currency VARCHAR(10) NOT NULL,
    
    -- Addresses
    from_address VARCHAR(100),
    to_address VARCHAR(100),
    
    -- Blockchain data
    tx_hash VARCHAR(100) UNIQUE,
    block_hash VARCHAR(100),
    block_number BIGINT,
    confirmations INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled')),
    failure_reason TEXT,
    
    -- Metadata
    note TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    
    -- Indexes for fast queries
    INDEX idx_transactions_user (user_id),
    INDEX idx_transactions_wallet (wallet_id),
    INDEX idx_transactions_tx_hash (tx_hash),
    INDEX idx_transactions_created (created_at),
    INDEX idx_transactions_status (status)
);

-- ==================== STAKING TABLE ====================

CREATE TABLE IF NOT EXISTS stakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    
    -- Stake details
    amount DECIMAL(40, 18) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    apy DECIMAL(5, 2) NOT NULL,
    
    -- Duration
    start_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    duration_days INTEGER,
    
    -- Rewards
    expected_reward DECIMAL(40, 18),
    actual_reward DECIMAL(40, 18) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'withdrawn')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    withdrawn_at TIMESTAMP,
    
    INDEX idx_stakes_user (user_id),
    INDEX idx_stakes_status (status),
    INDEX idx_stakes_end_date (end_date)
);

-- ==================== KYC DOCUMENTS TABLE ====================

CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(30) NOT NULL CHECK (document_type IN ('id_front', 'id_back', 'passport', 'proof_address', 'selfie')),
    encrypted_document_data JSONB NOT NULL,  -- AES-256-GCM encrypted file data
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Status
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    verified_by UUID REFERENCES users(id),
    
    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT NOW(),
    verified_at TIMESTAMP,
    
    INDEX idx_kyc_user (user_id)
);

-- ==================== AUDIT LOGS TABLE ====================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    ip_address VARCHAR(45),
    user_agent TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
);

-- ==================== ACTIVITY LOGS TABLE ====================

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_created (created_at)
);

-- ==================== PRICE CACHE TABLE ====================

CREATE TABLE IF NOT EXISTS price_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    currency_pair VARCHAR(20) NOT NULL,  -- BTC-USD, ETH-USD, etc.
    price DECIMAL(20, 8) NOT NULL,
    volume_24h DECIMAL(30, 8),
    market_cap DECIMAL(30, 2),
    change_24h DECIMAL(10, 2),
    source VARCHAR(50) DEFAULT 'coingecko',
    cached_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_price_pair (currency_pair),
    INDEX idx_price_cached (cached_at)
);

-- ==================== SYSTEM CONFIG TABLE ====================

CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== CREATE INDEXES FOR PERFORMANCE ====================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
CREATE INDEX IF NOT EXISTS idx_wallets_blockchain ON wallets(blockchain);

-- Balances indexes
CREATE INDEX IF NOT EXISTS idx_balances_wallet ON balances(wallet_id);

-- ==================== INSERT DEFAULT CONFIGURATIONS ====================

INSERT INTO system_config (config_key, config_value, description) VALUES
    ('staking_rates', '{"BTC":4.5,"ETH":5.2,"SOL":7.8,"LTC":4.0,"BNB":6.0,"USDT":8.0,"MATIC":6.5}', 'Annual percentage yields for staking'),
    ('withdrawal_limits', '{"daily":50000,"monthly":500000,"single":25000}', 'Withdrawal limits in USD'),
    ('supported_currencies', '["BTC","ETH","SOL","LTC","BNB","USDT","MATIC"]', 'List of supported cryptocurrencies'),
    ('fees', '{"send_fee_percent":0.1,"min_send_fee":0.5,"max_send_fee":25}', 'Transaction fees configuration'),
    ('maintenance_mode', '{"enabled":false,"message":"System under maintenance"}', 'System maintenance settings')
ON CONFLICT (config_key) DO NOTHING;

-- ==================== CREATE FUNCTIONS ====================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stakes_updated_at BEFORE UPDATE ON stakes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate total balance for user
CREATE OR REPLACE FUNCTION get_user_total_balance(p_user_id UUID)
RETURNS DECIMAL(40, 18) AS $$
DECLARE
    total DECIMAL(40, 18);
BEGIN
    SELECT COALESCE(SUM(b.balance * COALESCE(pc.price, 0)), 0)
    INTO total
    FROM balances b
    JOIN wallets w ON b.wallet_id = w.id
    LEFT JOIN price_cache pc ON pc.currency_pair = w.blockchain || '-USD'
    WHERE w.user_id = p_user_id;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==================== CREATE VIEWS ====================

-- User summary view
CREATE OR REPLACE VIEW user_summary AS
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.kyc_status,
    u.status,
    u.created_at,
    COUNT(DISTINCT w.id) as wallet_count,
    COALESCE(SUM(b.balance), 0) as total_balance_usd,
    COUNT(DISTINCT t.id) as transaction_count
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id AND w.status = 'active'
LEFT JOIN balances b ON w.id = b.wallet_id
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id;

-- Active stakes view
CREATE OR REPLACE VIEW active_stakes AS
SELECT 
    s.*,
    u.email,
    w.address as wallet_address,
    EXTRACT(DAY FROM (s.end_date - NOW())) as days_remaining
FROM stakes s
JOIN users u ON s.user_id = u.id
JOIN wallets w ON s.wallet_id = w.id
WHERE s.status = 'active' AND s.end_date > NOW();
`;

// ==================== DATABASE FUNCTIONS ====================

/**
 * Initialize database schema
 * Creates all tables, indexes, and functions
 */
async function initDatabase() {
    const client = await pool.connect();
    try {
        console.log('📦 Initializing database schema...');
        await client.query(SCHEMA_SQL);
        console.log('✅ Database schema initialized successfully');
        
        // Verify tables were created
        const tables = ['users', 'wallets', 'transactions', 'balances', 'stakes', 'kyc_documents'];
        for (const table of tables) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )`, [table]);
            if (result.rows[0].exists) {
                console.log(`   ✓ Table ${table} ready`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<object>} User data
 */
async function getUserByEmail(email) {
    const result = await pool.query(
        `SELECT id, email, password_hash, full_name, kyc_status, status, role, 
                two_factor_enabled, login_attempts, locked_until
         FROM users WHERE email = $1`,
        [email.toLowerCase()]
    );
    return result.rows[0];
}

/**
 * Get user by ID
 * @param {string} userId - User UUID
 * @returns {Promise<object>} User data
 */
async function getUserById(userId) {
    const result = await pool.query(
        `SELECT id, email, full_name, document_id, document_type, country, phone,
                address, city, state, postal_code, kyc_status, status, role, 
                two_factor_enabled, created_at, last_login_at
         FROM users WHERE id = $1`,
        [userId]
    );
    return result.rows[0];
}

/**
 * Create new user
 * @param {object} userData - User registration data
 * @returns {Promise<object>} Created user
 */
async function createUser(userData) {
    const { email, passwordHash, fullName, country, phone } = userData;
    
    const result = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, country, phone, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, email, full_name, created_at`,
        [email.toLowerCase(), passwordHash, fullName, country, phone]
    );
    return result.rows[0];
}

/**
 * Get user wallets
 * @param {string} userId - User UUID
 * @returns {Promise<array>} List of wallets
 */
async function getUserWallets(userId) {
    const result = await pool.query(
        `SELECT w.id, w.blockchain, w.address, w.address_type, w.status, w.created_at,
                COALESCE(b.balance, 0) as balance,
                COALESCE(b.staked_balance, 0) as staked_balance,
                COALESCE(b.locked_balance, 0) as locked_balance
         FROM wallets w
         LEFT JOIN balances b ON w.id = b.wallet_id
         WHERE w.user_id = $1 AND w.status = 'active'
         ORDER BY w.created_at ASC`,
        [userId]
    );
    return result.rows;
}

/**
 * Get wallet by blockchain
 * @param {string} userId - User UUID
 * @param {string} blockchain - Blockchain type
 * @returns {Promise<object>} Wallet data
 */
async function getUserWalletByBlockchain(userId, blockchain) {
    const result = await pool.query(
        `SELECT w.id, w.blockchain, w.address, w.encrypted_private_key, 
                w.encrypted_mnemonic, w.status, w.created_at,
                COALESCE(b.balance, 0) as balance
         FROM wallets w
         LEFT JOIN balances b ON w.id = b.wallet_id
         WHERE w.user_id = $1 AND w.blockchain = $2`,
        [userId, blockchain.toUpperCase()]
    );
    return result.rows[0];
}

/**
 * Create wallet
 * @param {object} walletData - Wallet data
 * @returns {Promise<object>} Created wallet
 */
async function createWallet(walletData) {
    const { userId, blockchain, address, encryptedPrivateKey, encryptedMnemonic, publicKey, addressType } = walletData;
    
    const result = await pool.query(
        `INSERT INTO wallets (user_id, blockchain, address, encrypted_private_key, 
                              encrypted_mnemonic, public_key, address_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id, blockchain) DO UPDATE 
         SET address = EXCLUDED.address,
             encrypted_private_key = EXCLUDED.encrypted_private_key,
             updated_at = NOW()
         RETURNING id, blockchain, address, created_at`,
        [userId, blockchain, address, encryptedPrivateKey, encryptedMnemonic || null, publicKey, addressType || 'default']
    );
    
    // Create initial balance record
    await pool.query(
        `INSERT INTO balances (wallet_id, blockchain, balance)
         VALUES ($1, $2, 0)`,
        [result.rows[0].id, blockchain]
    );
    
    return result.rows[0];
}

/**
 * Create transaction record
 * @param {object} txData - Transaction data
 * @returns {Promise<object>} Created transaction
 */
async function createTransaction(txData) {
    const { userId, walletId, type, amount, fee, currency, fromAddress, toAddress, txHash, note } = txData;
    
    const result = await pool.query(
        `INSERT INTO transactions (user_id, wallet_id, type, amount, fee, currency, 
                                   from_address, to_address, tx_hash, note, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', NOW())
         RETURNING id, created_at`,
        [userId, walletId, type, amount, fee || 0, currency, fromAddress, toAddress, txHash, note]
    );
    return result.rows[0];
}

/**
 * Update transaction status
 * @param {string} txId - Transaction ID
 * @param {string} status - New status
 * @param {string} txHash - Blockchain transaction hash
 * @returns {Promise<boolean>} Success
 */
async function updateTransactionStatus(txId, status, txHash = null) {
    const query = txHash 
        ? `UPDATE transactions SET status = $1, tx_hash = $2, confirmed_at = NOW(), updated_at = NOW() WHERE id = $3`
        : `UPDATE transactions SET status = $1, confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE NULL END, updated_at = NOW() WHERE id = $2`;
    
    const params = txHash ? [status, txHash, txId] : [status, txId];
    await pool.query(query, params);
    return true;
}

/**
 * Update user balance
 * @param {string} walletId - Wallet ID
 * @param {number} newBalance - New balance
 * @returns {Promise<boolean>} Success
 */
async function updateBalance(walletId, newBalance) {
    await pool.query(
        `UPDATE balances SET balance = $1, updated_at = NOW() WHERE wallet_id = $2`,
        [newBalance, walletId]
    );
    return true;
}

/**
 * Add to user balance
 * @param {string} walletId - Wallet ID
 * @param {number} amount - Amount to add
 * @returns {Promise<boolean>} Success
 */
async function addToBalance(walletId, amount) {
    await pool.query(
        `UPDATE balances SET balance = balance + $1, updated_at = NOW() WHERE wallet_id = $2`,
        [amount, walletId]
    );
    return true;
}

/**
 * Subtract from user balance
 * @param {string} walletId - Wallet ID
 * @param {number} amount - Amount to subtract
 * @returns {Promise<boolean>} Success
 */
async function subtractFromBalance(walletId, amount) {
    await pool.query(
        `UPDATE balances SET balance = balance - $1, updated_at = NOW() WHERE wallet_id = $2 AND balance >= $1`,
        [amount, walletId]
    );
    return true;
}

/**
 * Create stake record
 * @param {object} stakeData - Stake data
 * @returns {Promise<object>} Created stake
 */
async function createStake(stakeData) {
    const { userId, walletId, amount, currency, apy, durationDays } = stakeData;
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
    
    const result = await pool.query(
        `INSERT INTO stakes (user_id, wallet_id, amount, currency, apy, duration_days, end_date, expected_reward, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING id`,
        [userId, walletId, amount, currency, apy, durationDays, endDate, (amount * apy / 100)]
    );
    return result.rows[0];
}

/**
 * Log activity
 * @param {string} userId - User ID
 * @param {string} activityType - Type of activity
 * @param {string} description - Activity description
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @param {object} metadata - Additional metadata
 * @returns {Promise<boolean>} Success
 */
async function logActivity(userId, activityType, description, ipAddress = null, userAgent = null, metadata = null) {
    await pool.query(
        `INSERT INTO activity_logs (user_id, activity_type, description, ip_address, user_agent, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [userId, activityType, description, ipAddress, userAgent, metadata]
    );
    return true;
}

/**
 * Log audit entry
 * @param {object} auditData - Audit data
 * @returns {Promise<boolean>} Success
 */
async function logAudit(auditData) {
    const { userId, action, entityType, entityId, ipAddress, userAgent, oldValues, newValues } = auditData;
    
    await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, old_values, new_values, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [userId, action, entityType, entityId, ipAddress, userAgent, oldValues, newValues]
    );
    return true;
}

/**
 * Get system configuration
 * @param {string} key - Configuration key
 * @returns {Promise<object>} Configuration value
 */
async function getConfig(key) {
    const result = await pool.query(
        `SELECT config_value FROM system_config WHERE config_key = $1`,
        [key]
    );
    return result.rows[0]?.config_value || null;
}

/**
 * Update system configuration
 * @param {string} key - Configuration key
 * @param {object} value - Configuration value
 * @param {string} updatedBy - User ID who updated
 * @returns {Promise<boolean>} Success
 */
async function updateConfig(key, value, updatedBy) {
    await pool.query(
        `INSERT INTO system_config (config_key, config_value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (config_key) DO UPDATE 
         SET config_value = EXCLUDED.config_value,
             updated_by = EXCLUDED.updated_by,
             updated_at = NOW()`,
        [key, value, updatedBy]
    );
    return true;
}

/**
 * Get user transaction history
 * @param {string} userId - User ID
 * @param {object} options - Pagination options
 * @returns {Promise<array>} Transactions list
 */
async function getUserTransactions(userId, options = {}) {
    const { limit = 50, offset = 0, blockchain = null, type = null } = options;
    
    let query = `
        SELECT t.*, w.blockchain, w.address as wallet_address
        FROM transactions t
        JOIN wallets w ON t.wallet_id = w.id
        WHERE t.user_id = $1
    `;
    const params = [userId];
    let paramIndex = 2;
    
    if (blockchain) {
        query += ` AND w.blockchain = $${paramIndex++}`;
        params.push(blockchain);
    }
    if (type) {
        query += ` AND t.type = $${paramIndex++}`;
        params.push(type);
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    return result.rows;
}

/**
 * Get active stakes for user
 * @param {string} userId - User ID
 * @returns {Promise<array>} Active stakes
 */
async function getActiveStakes(userId) {
    const result = await pool.query(
        `SELECT s.*, w.blockchain, w.address
         FROM stakes s
         JOIN wallets w ON s.wallet_id = w.id
         WHERE s.user_id = $1 AND s.status = 'active' AND s.end_date > NOW()
         ORDER BY s.end_date ASC`,
        [userId]
    );
    return result.rows;
}

/**
 * Check if user has wallet for blockchain
 * @param {string} userId - User ID
 * @param {string} blockchain - Blockchain type
 * @returns {Promise<boolean>} True if wallet exists
 */
async function hasWallet(userId, blockchain) {
    const result = await pool.query(
        `SELECT id FROM wallets WHERE user_id = $1 AND blockchain = $2`,
        [userId, blockchain.toUpperCase()]
    );
    return result.rows.length > 0;
}

// ==================== EXPORTS ====================

module.exports = {
    // Connection
    pool,
    initDatabase,
    
    // User functions
    getUserByEmail,
    getUserById,
    createUser,
    
    // Wallet functions
    getUserWallets,
    getUserWalletByBlockchain,
    createWallet,
    hasWallet,
    
    // Balance functions
    updateBalance,
    addToBalance,
    subtractFromBalance,
    
    // Transaction functions
    createTransaction,
    updateTransactionStatus,
    getUserTransactions,
    
    // Staking functions
    createStake,
    getActiveStakes,
    
    // Logging functions
    logActivity,
    logAudit,
    
    // Config functions
    getConfig,
    updateConfig,
    
    // Direct query access (use with caution)
    query: (text, params) => pool.query(text, params)
};
