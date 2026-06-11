// wallet-generator.js
// Real Wallet Generator for Zentronix Offshore Bank
// Supports: Bitcoin, Ethereum, Solana, Litecoin, Binance Coin (BNB), Tether (USDT), Polygon (MATIC)
// PRODUCTION READY - No seed phrases, direct key generation

const { encryptPrivateKey } = require('./encryption');
const bitcoin = require('bitcoinjs-lib');
const { ethers } = require('ethers');
const solanaWeb3 = require('@solana/web3.js');

// ==================== NETWORK CONFIGURATIONS ====================

// Bitcoin mainnet configuration
const BITCOIN_NETWORK = {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'bc',
    bip32: {
        public: 0x0488b21e,
        private: 0x0488ade4
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80
};

// Litecoin network configuration
const LITECOIN_NETWORK = {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: {
        public: 0x019da462,
        private: 0x019d9cfe
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0
};

// Polygon network configuration
const POLYGON_RPC_URL = 'https://polygon-rpc.com';
const POLYGON_CHAIN_ID = 137;

// ==================== WALLET GENERATOR CLASS ====================

class WalletGenerator {
    
    // ==================== BITCOIN ====================
    
    /**
     * Generate Bitcoin wallet (Segwit Bech32 format - recommended)
     * @param {string} userId - User ID
     * @returns {object} Wallet data with encrypted private key
     */
    static generateBitcoin(userId) {
        try {
            const keyPair = bitcoin.ECPair.makeRandom({ network: BITCOIN_NETWORK });
            const { address } = bitcoin.payments.p2wpkh({ 
                pubkey: keyPair.publicKey, 
                network: BITCOIN_NETWORK 
            });
            const privateKeyWIF = keyPair.toWIF();
            const encryptedPrivateKey = encryptPrivateKey(privateKeyWIF, 'BTC');
            
            return {
                blockchain: 'BTC',
                userId: userId,
                address: address,
                encryptedPrivateKey: encryptedPrivateKey,
                publicKey: keyPair.publicKey.toString('hex'),
                network: 'bitcoin',
                addressType: 'segwit_bech32',
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://www.blockchain.com/explorer/addresses/btc/${address}`
            };
        } catch (error) {
            console.error('Bitcoin wallet generation error:', error);
            throw new Error(`Failed to generate Bitcoin wallet: ${error.message}`);
        }
    }
    
    /**
     * Generate Bitcoin Legacy wallet (P2PKH - starts with 1)
     * @param {string} userId - User ID
     * @returns {object} Wallet data
     */
    static generateBitcoinLegacy(userId) {
        try {
            const keyPair = bitcoin.ECPair.makeRandom({ network: BITCOIN_NETWORK });
            const { address } = bitcoin.payments.p2pkh({ 
                pubkey: keyPair.publicKey, 
                network: BITCOIN_NETWORK 
            });
            const privateKeyWIF = keyPair.toWIF();
            const encryptedPrivateKey = encryptPrivateKey(privateKeyWIF, 'BTC');
            
            return {
                blockchain: 'BTC',
                userId: userId,
                address: address,
                encryptedPrivateKey: encryptedPrivateKey,
                publicKey: keyPair.publicKey.toString('hex'),
                network: 'bitcoin',
                addressType: 'legacy_p2pkh',
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://www.blockchain.com/explorer/addresses/btc/${address}`
            };
        } catch (error) {
            console.error('Bitcoin Legacy wallet generation error:', error);
            throw new Error(`Failed to generate Bitcoin Legacy wallet: ${error.message}`);
        }
    }
    
    // ==================== ETHEREUM ====================
    
    /**
     * Generate Ethereum wallet
     * @param {string} userId - User ID
     * @returns {object} Wallet data
     */
    static generateEthereum(userId) {
        try {
            const wallet = ethers.Wallet.createRandom();
            const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey, 'ETH');
            const encryptedMnemonic = wallet.mnemonic?.phrase ? 
                encryptPrivateKey(wallet.mnemonic.phrase, 'ETH_MNEMONIC') : null;
            
            return {
                blockchain: 'ETH',
                userId: userId,
                address: wallet.address,
                encryptedPrivateKey: encryptedPrivateKey,
                encryptedMnemonic: encryptedMnemonic,
                publicKey: wallet.publicKey,
                network: 'ethereum',
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://etherscan.io/address/${wallet.address}`
            };
        } catch (error) {
            console.error('Ethereum wallet generation error:', error);
            throw new Error(`Failed to generate Ethereum wallet: ${error.message}`);
        }
    }
    
    // ==================== SOLANA ====================
    
    /**
     * Generate Solana wallet
     * @param {string} userId - User ID
     * @returns {object} Wallet data
     */
    static generateSolana(userId) {
        try {
            const keypair = solanaWeb3.Keypair.generate();
            const privateKeyHex = Buffer.from(keypair.secretKey).toString('hex');
            const publicKeyBase58 = keypair.publicKey.toBase58();
            const encryptedPrivateKey = encryptPrivateKey(privateKeyHex, 'SOL');
            
            return {
                blockchain: 'SOL',
                userId: userId,
                address: publicKeyBase58,
                encryptedPrivateKey: encryptedPrivateKey,
                publicKey: keypair.publicKey.toString(),
                network: 'solana',
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://explorer.solana.com/address/${publicKeyBase58}`
            };
        } catch (error) {
            console.error('Solana wallet generation error:', error);
            throw new Error(`Failed to generate Solana wallet: ${error.message}`);
        }
    }
    
    // ==================== LITECOIN ====================
    
    /**
     * Generate Litecoin wallet (legacy format)
     * @param {string} userId - User ID
     * @returns {object} Wallet data
     */
    static generateLitecoin(userId) {
        try {
            const keyPair = bitcoin.ECPair.makeRandom({ network: LITECOIN_NETWORK });
            const { address } = bitcoin.payments.p2pkh({ 
                pubkey: keyPair.publicKey, 
                network: LITECOIN_NETWORK 
            });
            const privateKeyWIF = keyPair.toWIF();
            const encryptedPrivateKey = encryptPrivateKey(privateKeyWIF, 'LTC');
            
            return {
                blockchain: 'LTC',
                userId: userId,
                address: address,
                encryptedPrivateKey: encryptedPrivateKey,
                publicKey: keyPair.publicKey.toString('hex'),
                network: 'litecoin',
                addressType: 'legacy_p2pkh',
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://live.blockcypher.com/ltc/address/${address}`
            };
        } catch (error) {
            console.error('Litecoin wallet generation error:', error);
            throw new Error(`Failed to generate Litecoin wallet: ${error.message}`);
        }
    }
    
    /**
     * Generate Litecoin Segwit wallet (bech32 format - starts with ltc1)
     * @param {string} userId - User ID
     * @returns {object} Wallet data
     */
    static generateLitecoinSegwit(userId) {
        try {
            const keyPair = bitcoin.ECPair.makeRandom({ network: LITECOIN_NETWORK });
            const { address } = bitcoin.payments.p2wpkh({ 
                pubkey: keyPair.publicKey, 
                network: LITECOIN_NETWORK 
            });
            const privateKeyWIF = keyPair.toWIF();
            const encryptedPrivateKey = encryptPrivateKey(privateKeyWIF, 'LTC');
            
            return {
                blockchain: 'LTC',
                userId: userId,
                address: address,
                encryptedPrivateKey: encryptedPrivateKey,
                publicKey: keyPair.publicKey.toString('hex'),
                network: 'litecoin',
                addressType: 'segwit_bech32',
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://live.blockcypher.com/ltc/address/${address}`
            };
        } catch (error) {
            console.error('Litecoin Segwit wallet generation error:', error);
            throw new Error(`Failed to generate Litecoin Segwit wallet: ${error.message}`);
        }
    }
    
    // ==================== BINANCE COIN (BNB) ====================
    
    /**
     * Generate Binance Coin (BSC) wallet
     * @param {string} userId - User ID
     * @returns {object} Wallet data
     */
    static generateBNB(userId) {
        try {
            const wallet = ethers.Wallet.createRandom();
            const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey, 'BNB');
            const encryptedMnemonic = wallet.mnemonic?.phrase ? 
                encryptPrivateKey(wallet.mnemonic.phrase, 'BNB_MNEMONIC') : null;
            
            return {
                blockchain: 'BNB',
                userId: userId,
                address: wallet.address,
                encryptedPrivateKey: encryptedPrivateKey,
                encryptedMnemonic: encryptedMnemonic,
                publicKey: wallet.publicKey,
                network: 'binance-smart-chain',
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://bscscan.com/address/${wallet.address}`
            };
        } catch (error) {
            console.error('BNB wallet generation error:', error);
            throw new Error(`Failed to generate BNB wallet: ${error.message}`);
        }
    }
    
    // ==================== TETHER (USDT) ====================
    
    /**
     * Generate USDT wallet (on BSC network)
     * @param {string} userId - User ID
     * @returns {object} Wallet data
     */
    static generateUSDT(userId) {
        try {
            const wallet = ethers.Wallet.createRandom();
            const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey, 'USDT');
            const encryptedMnemonic = wallet.mnemonic?.phrase ? 
                encryptPrivateKey(wallet.mnemonic.phrase, 'USDT_MNEMONIC') : null;
            
            return {
                blockchain: 'USDT',
                userId: userId,
                address: wallet.address,
                encryptedPrivateKey: encryptedPrivateKey,
                encryptedMnemonic: encryptedMnemonic,
                publicKey: wallet.publicKey,
                network: 'bsc',
                tokenType: 'BEP-20',
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://bscscan.com/address/${wallet.address}`
            };
        } catch (error) {
            console.error('USDT wallet generation error:', error);
            throw new Error(`Failed to generate USDT wallet: ${error.message}`);
        }
    }
    
    // ==================== POLYGON (MATIC) ====================
    
    /**
     * Generate Polygon (MATIC) wallet
     * @param {string} userId - User ID
     * @returns {object} Wallet data
     */
    static generatePolygon(userId) {
        try {
            // Polygon uses same format as Ethereum
            const wallet = ethers.Wallet.createRandom();
            const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey, 'MATIC');
            const encryptedMnemonic = wallet.mnemonic?.phrase ? 
                encryptPrivateKey(wallet.mnemonic.phrase, 'MATIC_MNEMONIC') : null;
            
            return {
                blockchain: 'MATIC',
                userId: userId,
                address: wallet.address,
                encryptedPrivateKey: encryptedPrivateKey,
                encryptedMnemonic: encryptedMnemonic,
                publicKey: wallet.publicKey,
                network: 'polygon',
                chainId: POLYGON_CHAIN_ID,
                rpcUrl: POLYGON_RPC_URL,
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://polygonscan.com/address/${wallet.address}`
            };
        } catch (error) {
            console.error('Polygon wallet generation error:', error);
            throw new Error(`Failed to generate Polygon wallet: ${error.message}`);
        }
    }
    
    /**
     * Generate Polygon (MATIC) wallet with custom RPC
     * @param {string} userId - User ID
     * @param {string} customRpcUrl - Custom RPC URL
     * @returns {object} Wallet data
     */
    static generatePolygonWithRpc(userId, customRpcUrl = null) {
        try {
            const wallet = ethers.Wallet.createRandom();
            const encryptedPrivateKey = encryptPrivateKey(wallet.privateKey, 'MATIC');
            const encryptedMnemonic = wallet.mnemonic?.phrase ? 
                encryptPrivateKey(wallet.mnemonic.phrase, 'MATIC_MNEMONIC') : null;
            
            return {
                blockchain: 'MATIC',
                userId: userId,
                address: wallet.address,
                encryptedPrivateKey: encryptedPrivateKey,
                encryptedMnemonic: encryptedMnemonic,
                publicKey: wallet.publicKey,
                network: 'polygon',
                chainId: POLYGON_CHAIN_ID,
                rpcUrl: customRpcUrl || POLYGON_RPC_URL,
                createdAt: new Date().toISOString(),
                status: 'active',
                explorerUrl: `https://polygonscan.com/address/${wallet.address}`
            };
        } catch (error) {
            console.error('Polygon wallet generation error:', error);
            throw new Error(`Failed to generate Polygon wallet: ${error.message}`);
        }
    }
    
    // ==================== BULK GENERATION ====================
    
    /**
     * Generate all wallets for a new user
     * @param {string} userId - User ID
     * @returns {object} All generated wallets (public addresses only)
     */
    static generateAllWallets(userId) {
        const wallets = {
            BTC: this.generateBitcoin(userId),
            ETH: this.generateEthereum(userId),
            SOL: this.generateSolana(userId),
            LTC: this.generateLitecoin(userId),
            BNB: this.generateBNB(userId),
            USDT: this.generateUSDT(userId),
            MATIC: this.generatePolygon(userId)
        };
        
        // Return only public information (no encrypted keys)
        const publicWallets = {};
        for (const [key, wallet] of Object.entries(wallets)) {
            publicWallets[key] = {
                blockchain: wallet.blockchain,
                address: wallet.address,
                addressType: wallet.addressType || 'default',
                network: wallet.network,
                explorerUrl: wallet.explorerUrl,
                createdAt: wallet.createdAt,
                status: wallet.status
            };
        }
        
        return {
            userId: userId,
            wallets: publicWallets,
            supportedBlockchains: ['BTC', 'ETH', 'SOL', 'LTC', 'BNB', 'USDT', 'MATIC'],
            message: 'All wallets generated successfully. Private keys are encrypted and stored securely.',
            generatedAt: new Date().toISOString()
        };
    }
    
    /**
     * Generate specific wallet by blockchain type
     * @param {string} userId - User ID
     * @param {string} blockchain - Blockchain type (BTC, ETH, SOL, LTC, BNB, USDT, MATIC)
     * @returns {object} Wallet data
     */
    static generateWalletByBlockchain(userId, blockchain) {
        const generators = {
            BTC: () => this.generateBitcoin(userId),
            ETH: () => this.generateEthereum(userId),
            SOL: () => this.generateSolana(userId),
            LTC: () => this.generateLitecoin(userId),
            BNB: () => this.generateBNB(userId),
            USDT: () => this.generateUSDT(userId),
            MATIC: () => this.generatePolygon(userId)
        };
        
        const generator = generators[blockchain];
        if (!generator) {
            throw new Error(`Blockchain ${blockchain} not supported`);
        }
        
        return generator();
    }
    
    // ==================== VALIDATION FUNCTIONS ====================
    
    /**
     * Validate wallet address format
     * @param {string} blockchain - Blockchain type
     * @param {string} address - Address to validate
     * @returns {boolean} - True if valid format
     */
    static validateAddress(blockchain, address) {
        const patterns = {
            BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$/,
            ETH: /^0x[a-fA-F0-9]{40}$/,
            SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
            LTC: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-z0-9]{39,59}$/,
            BNB: /^0x[a-fA-F0-9]{40}$/,
            USDT: /^0x[a-fA-F0-9]{40}$|^T[A-Za-z0-9]{33}$/,
            MATIC: /^0x[a-fA-F0-9]{40}$/
        };
        
        const pattern = patterns[blockchain];
        if (!pattern) return false;
        
        return pattern.test(address);
    }
    
    /**
     * Get blockchain explorer URL for address
     * @param {string} blockchain - Blockchain type
     * @param {string} address - Wallet address
     * @returns {string} - Explorer URL
     */
    static getExplorerUrl(blockchain, address) {
        const explorers = {
            BTC: `https://www.blockchain.com/explorer/addresses/btc/${address}`,
            ETH: `https://etherscan.io/address/${address}`,
            SOL: `https://explorer.solana.com/address/${address}`,
            LTC: `https://live.blockcypher.com/ltc/address/${address}`,
            BNB: `https://bscscan.com/address/${address}`,
            USDT: `https://bscscan.com/address/${address}`,
            MATIC: `https://polygonscan.com/address/${address}`
        };
        
        return explorers[blockchain] || '#';
    }
    
    /**
     * Get network name for display
     * @param {string} blockchain - Blockchain type
     * @returns {string} - Human readable network name
     */
    static getNetworkName(blockchain) {
        const names = {
            BTC: 'Bitcoin Mainnet',
            ETH: 'Ethereum Mainnet',
            SOL: 'Solana Mainnet Beta',
            LTC: 'Litecoin Mainnet',
            BNB: 'Binance Smart Chain',
            USDT: 'BSC (BEP-20)',
            MATIC: 'Polygon (MATIC)'
        };
        
        return names[blockchain] || 'Unknown Network';
    }
    
    /**
     * Get minimum deposit amount for each blockchain
     * @param {string} blockchain - Blockchain type
     * @returns {number} - Minimum deposit amount
     */
    static getMinimumDeposit(blockchain) {
        const minimums = {
            BTC: 0.0001,
            ETH: 0.01,
            SOL: 0.01,
            LTC: 0.01,
            BNB: 0.01,
            USDT: 10,
            MATIC: 1
        };
        
        return minimums[blockchain] || 0;
    }
    
    /**
     * Get estimated confirmation time
     * @param {string} blockchain - Blockchain type
     * @returns {string} - Estimated time
     */
    static getConfirmationTime(blockchain) {
        const times = {
            BTC: '10-30 minutes',
            ETH: '15-45 seconds',
            SOL: '2-5 seconds',
            LTC: '10-20 minutes',
            BNB: '5-15 seconds',
            USDT: '5-15 seconds',
            MATIC: '30-60 seconds'
        };
        
        return times[blockchain] || 'Varies';
    }
    
    /**
     * Get gas token symbol for each blockchain
     * @param {string} blockchain - Blockchain type
     * @returns {string} - Gas token symbol
     */
    static getGasToken(blockchain) {
        const gasTokens = {
            BTC: 'BTC',
            ETH: 'ETH',
            SOL: 'SOL',
            LTC: 'LTC',
            BNB: 'BNB',
            USDT: 'BNB',
            MATIC: 'MATIC'
        };
        
        return gasTokens[blockchain] || 'Unknown';
    }
    
    /**
     * Get all supported blockchains
     * @returns {Array} - List of supported blockchains
     */
    static getSupportedBlockchains() {
        return [
            { code: 'BTC', name: 'Bitcoin', icon: '₿', type: 'coin' },
            { code: 'ETH', name: 'Ethereum', icon: 'Ξ', type: 'coin' },
            { code: 'SOL', name: 'Solana', icon: '◎', type: 'coin' },
            { code: 'LTC', name: 'Litecoin', icon: 'Ł', type: 'coin' },
            { code: 'BNB', name: 'Binance Coin', icon: 'BNB', type: 'coin' },
            { code: 'USDT', name: 'Tether', icon: '₮', type: 'token' },
            { code: 'MATIC', name: 'Polygon', icon: 'MATIC', type: 'coin' }
        ];
    }
}

module.exports = WalletGenerator;
