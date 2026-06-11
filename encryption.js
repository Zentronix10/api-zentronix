// encryption.js
// AES-256-GCM Encryption Module for Zentronix Offshore Bank
// Military-grade encryption for private keys and sensitive data
// PRODUCTION READY - DO NOT MODIFY WITHOUT SECURITY REVIEW

const crypto = require('crypto');

// ==================== CONSTANTS ====================
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;           // 16 bytes for GCM (recommended)
const AUTH_TAG_LENGTH = 16;     // 16 bytes authentication tag
const ENCODING = 'hex';         // Hexadecimal encoding
const SALT_LENGTH = 32;         // Salt length for key derivation
const PBKDF2_ITERATIONS = 100000; // Iterations for key derivation

// ==================== KEY MANAGEMENT ====================

/**
 * Get encryption key from environment variable
 * Supports multiple formats: hex string, raw string, or derived from passphrase
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
    const key = process.env.MASTER_ENCRYPTION_KEY;
    
    if (!key) {
        throw new Error('❌ MASTER_ENCRYPTION_KEY environment variable is not set');
    }
    
    // Format 1: 64-character hex string (32 bytes)
    if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
        return Buffer.from(key, 'hex');
    }
    
    // Format 2: 32-byte raw string
    if (key.length === 32) {
        return Buffer.from(key, 'utf8');
    }
    
    // Format 3: Passphrase - derive key using PBKDF2
    // WARNING: This is less secure. Use hex key in production.
    console.warn('⚠️ Using derived key from passphrase. For production, use 64-character hex key.');
    const salt = Buffer.from(process.env.ENCRYPTION_SALT || 'zentronix-fixed-salt-2024', 'utf8');
    return crypto.pbkdf2Sync(key, salt, PBKDF2_ITERATIONS, 32, 'sha256');
}

/**
 * Generate a new secure encryption key for production
 * Run this function once to generate your MASTER_ENCRYPTION_KEY
 * @returns {string} 32-byte key as hex string (64 characters)
 */
function generateEncryptionKey() {
    const key = crypto.randomBytes(32);
    return key.toString('hex');
}

/**
 * Generate a secure salt for PBKDF2
 * @returns {string} Salt as hex string
 */
function generateSalt() {
    return crypto.randomBytes(SALT_LENGTH).toString('hex');
}

// ==================== CORE ENCRYPTION FUNCTIONS ====================

/**
 * Encrypt data using AES-256-GCM
 * @param {string} text - Plain text to encrypt (UTF-8)
 * @returns {object} Encrypted object containing iv, encryptedData, authTag
 */
function encrypt(text) {
    // Handle empty or null input
    if (!text || text === '') {
        return {
            iv: '',
            encryptedData: '',
            authTag: '',
            algorithm: ALGORITHM
        };
    }
    
    try {
        const key = getEncryptionKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        // Encrypt the data
        let encrypted = cipher.update(text, 'utf8', ENCODING);
        encrypted += cipher.final(ENCODING);
        
        // Get authentication tag
        const authTag = cipher.getAuthTag();
        
        return {
            iv: iv.toString(ENCODING),
            encryptedData: encrypted,
            authTag: authTag.toString(ENCODING),
            algorithm: ALGORITHM,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Encryption error:', error.message);
        throw new Error(`Failed to encrypt data: ${error.message}`);
    }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {object} encryptedObj - Encrypted object { iv, encryptedData, authTag }
 * @returns {string} Decrypted plain text
 */
function decrypt(encryptedObj) {
    // Validate input
    if (!encryptedObj || typeof encryptedObj !== 'object') {
        throw new Error('Invalid encrypted object: must be an object');
    }
    
    if (!encryptedObj.encryptedData || encryptedObj.encryptedData === '') {
        return '';
    }
    
    if (!encryptedObj.iv || !encryptedObj.authTag) {
        throw new Error('Invalid encrypted object: missing iv or authTag');
    }
    
    try {
        const key = getEncryptionKey();
        const iv = Buffer.from(encryptedObj.iv, ENCODING);
        const authTag = Buffer.from(encryptedObj.authTag, ENCODING);
        
        // Verify auth tag length
        if (authTag.length !== AUTH_TAG_LENGTH) {
            throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`);
        }
        
        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt the data
        let decrypted = decipher.update(encryptedObj.encryptedData, ENCODING, 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
        
    } catch (error) {
        console.error('Decryption error:', error.message);
        
        // Provide specific error messages for common issues
        if (error.message.includes('Unsupported state')) {
            throw new Error('Decryption failed: authentication tag verification failed. Data may be corrupted or tampered.');
        }
        if (error.message.includes('bad decrypt')) {
            throw new Error('Decryption failed: invalid key or corrupted data.');
        }
        
        throw new Error(`Failed to decrypt data: ${error.message}`);
    }
}

// ==================== ENHANCED SECURITY FUNCTIONS ====================

/**
 * Encrypt data with additional metadata and integrity check
 * @param {string} text - Plain text to encrypt
 * @param {string} context - Context string for additional security (e.g., 'wallet_private_key')
 * @returns {object} Enhanced encrypted object
 */
function encryptWithContext(text, context = 'default') {
    // Add context to the data before encryption
    const dataWithContext = JSON.stringify({
        context: context,
        data: text,
        version: '1.0'
    });
    
    const encrypted = encrypt(dataWithContext);
    
    // Add HMAC signature for integrity verification
    const signature = signData(encrypted.encryptedData + encrypted.iv + encrypted.authTag);
    
    return {
        ...encrypted,
        signature: signature,
        context: context
    };
}

/**
 * Decrypt data with context verification
 * @param {object} encryptedObj - Enhanced encrypted object
 * @param {string} expectedContext - Expected context string
 * @returns {string} Decrypted plain text
 */
function decryptWithContext(encryptedObj, expectedContext = 'default') {
    // Verify signature first
    const dataToVerify = encryptedObj.encryptedData + encryptedObj.iv + encryptedObj.authTag;
    if (!verifySignature(dataToVerify, encryptedObj.signature)) {
        throw new Error('Integrity check failed: data may have been tampered with');
    }
    
    // Decrypt
    const decrypted = decrypt(encryptedObj);
    const parsed = JSON.parse(decrypted);
    
    // Verify context
    if (parsed.context !== expectedContext) {
        throw new Error(`Context mismatch: expected "${expectedContext}", got "${parsed.context}"`);
    }
    
    if (parsed.version !== '1.0') {
        throw new Error(`Unsupported version: ${parsed.version}`);
    }
    
    return parsed.data;
}

/**
 * Hash sensitive data using SHA-256 (for passwords, etc.)
 * @param {string} data - Data to hash
 * @returns {string} Hex hash
 */
function hashData(data) {
    if (!data) return '';
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Hash data with salt (for passwords storage)
 * @param {string} data - Data to hash
 * @param {string} salt - Optional salt (will generate if not provided)
 * @returns {object} { hash, salt }
 */
function hashWithSalt(data, salt = null) {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, useSalt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: useSalt };
}

/**
 * Verify password against stored hash
 * @param {string} password - Password to verify
 * @param {string} storedHash - Stored hash
 * @param {string} salt - Salt used for hashing
 * @returns {boolean} True if valid
 */
function verifyPassword(password, storedHash, salt) {
    const { hash } = hashWithSalt(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Create HMAC signature for data integrity
 * @param {string} data - Data to sign
 * @returns {string} HMAC signature as hex
 */
function signData(data) {
    const key = getEncryptionKey();
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data, 'utf8');
    return hmac.digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @returns {boolean} True if valid
 */
function verifySignature(data, signature) {
    if (!signature) return false;
    
    try {
        const expectedSignature = signData(data);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch (error) {
        return false;
    }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Encrypt object as JSON string
 * @param {object} obj - Object to encrypt
 * @returns {object} Encrypted object
 */
function encryptObject(obj) {
    if (!obj || typeof obj !== 'object') {
        throw new Error('encryptObject requires a valid object');
    }
    return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt and parse JSON object
 * @param {object} encryptedObj - Encrypted object
 * @returns {object} Decrypted object
 */
function decryptObject(encryptedObj) {
    const decrypted = decrypt(encryptedObj);
    if (!decrypted) return null;
    return JSON.parse(decrypted);
}

/**
 * Securely encrypt a private key (specific for blockchain wallets)
 * @param {string} privateKey - Raw private key
 * @param {string} walletType - Type of wallet (BTC, ETH, SOL, etc.)
 * @returns {object} Encrypted private key object
 */
function encryptPrivateKey(privateKey, walletType) {
    if (!privateKey) {
        throw new Error('Private key cannot be empty');
    }
    
    // Add wallet type prefix for validation
    const prefixedKey = `${walletType}:${privateKey}`;
    return encryptWithContext(prefixedKey, `private_key_${walletType}`);
}

/**
 * Decrypt a private key with validation
 * @param {object} encryptedObj - Encrypted private key object
 * @param {string} expectedWalletType - Expected wallet type (BTC, ETH, SOL, etc.)
 * @returns {string} Raw private key
 */
function decryptPrivateKey(encryptedObj, expectedWalletType) {
    const decrypted = decryptWithContext(encryptedObj, `private_key_${expectedWalletType}`);
    
    // Verify wallet type prefix
    const prefix = decrypted.split(':')[0];
    if (prefix !== expectedWalletType) {
        throw new Error(`Wallet type mismatch: expected ${expectedWalletType}, got ${prefix}`);
    }
    
    // Return only the private key (remove prefix)
    return decrypted.substring(expectedWalletType.length + 1);
}

// ==================== HEALTH CHECK ====================

/**
 * Test encryption/decryption to verify setup is working
 * @returns {boolean} True if encryption is working correctly
 */
function testEncryption() {
    try {
        const testData = 'Zentronix Bank Security Test - ' + Date.now();
        const encrypted = encrypt(testData);
        const decrypted = decrypt(encrypted);
        
        if (testData !== decrypted) {
            throw new Error('Encryption/decryption test failed: data mismatch');
        }
        
        console.log('✅ AES-256-GCM encryption test passed');
        return true;
        
    } catch (error) {
        console.error('❌ Encryption test failed:', error.message);
        return false;
    }
}

/**
 * Get encryption status and configuration
 * @returns {object} Current encryption configuration
 */
function getEncryptionStatus() {
    const hasKey = !!process.env.MASTER_ENCRYPTION_KEY;
    const keyLength = hasKey ? process.env.MASTER_ENCRYPTION_KEY.length : 0;
    
    return {
        algorithm: ALGORITHM,
        hasKey: hasKey,
        keyLength: keyLength,
        ivLength: IV_LENGTH,
        authTagLength: AUTH_TAG_LENGTH,
        isSecure: hasKey && (keyLength === 64 || keyLength === 32),
        pbkdf2Iterations: PBKDF2_ITERATIONS,
        status: hasKey ? 'ready' : 'missing_key'
    };
}

// ==================== EXPORTS ====================

module.exports = {
    // Core functions
    encrypt,
    decrypt,
    
    // Enhanced security
    encryptWithContext,
    decryptWithContext,
    encryptPrivateKey,
    decryptPrivateKey,
    
    // Key management
    generateEncryptionKey,
    generateSalt,
    getEncryptionStatus,
    testEncryption,
    
    // Hashing utilities
    hashData,
    hashWithSalt,
    verifyPassword,
    
    // Integrity utilities
    signData,
    verifySignature,
    
    // Object utilities
    encryptObject,
    decryptObject,
    
    // Constants (for testing)
    ALGORITHM,
    IV_LENGTH,
    AUTH_TAG_LENGTH,
    ENCODING
};
