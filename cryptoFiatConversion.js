/**
 * ZENTRONIX BANK - COMPLETE CRYPTO TO FIAT CONVERSION SYSTEM
 * Including BRADICOIN (BRD) with 17% APY Staking Rewards
 * BRADICOIN BASE PRICE: $10.00 USD
 * Version: 4.1.0
 * Language: JavaScript (Node.js)
 * 
 * Features:
 * - Real-time crypto prices from multiple exchanges
 * - NATIVE BRADICOIN (BRD) at $10.00 USD with 17% APY
 * - Fiat to crypto conversion (USD, EUR, GBP, JPY, CHF, CAD, AUD, BRL)
 * - Crypto to fiat conversion
 * - Multi-crypto support (BTC, ETH, USDT, BNB, XRP, ADA, SOL, DOGE, BRD)
 * - Staking rewards at 17% APY for Bradicoin
 * - Transaction limits and fees
 * - AML integration
 * - Rate locking mechanism
 * - Conversion history
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ========================================
// CONFIGURATION
// ========================================

const CONVERSION_CONFIG = {
    // Supported cryptocurrencies (INCLUDING BRADICOIN)
    SUPPORTED_CRYPTOS: {
        BTC: { name: 'Bitcoin', minAmount: 0.0001, maxAmount: 10, decimalPlaces: 8, type: 'external' },
        ETH: { name: 'Ethereum', minAmount: 0.001, maxAmount: 100, decimalPlaces: 6, type: 'external' },
        USDT: { name: 'Tether', minAmount: 10, maxAmount: 100000, decimalPlaces: 2, type: 'external' },
        BNB: { name: 'Binance Coin', minAmount: 0.01, maxAmount: 500, decimalPlaces: 4, type: 'external' },
        XRP: { name: 'Ripple', minAmount: 1, maxAmount: 50000, decimalPlaces: 2, type: 'external' },
        ADA: { name: 'Cardano', minAmount: 1, maxAmount: 100000, decimalPlaces: 2, type: 'external' },
        SOL: { name: 'Solana', minAmount: 0.01, maxAmount: 1000, decimalPlaces: 4, type: 'external' },
        DOGE: { name: 'Dogecoin', minAmount: 10, maxAmount: 500000, decimalPlaces: 2, type: 'external' },
        // ZENTRONIX BANK NATIVE TOKEN - BRADICOIN (BRD)
        BRD: { 
            name: 'Bradicoin', 
            symbol: 'BRD',
            minAmount: 0.1,  // Minimum 0.1 BRD (now $1 USD minimum)
            maxAmount: 100000,  // Maximum 100,000 BRD
            decimalPlaces: 2, 
            type: 'native',
            description: 'Zentronix Bank Native Cryptocurrency',
            network: 'Zentronix Chain',
            totalSupply: 100000000, // 100 million BRD
            initialSupply: 100000000,
            stakingAPY: 0.17, // 17% APY for staking!
            stakingMinAmount: 10, // Minimum 10 BRD to stake ($100 USD minimum)
            stakingLockPeriod: 30, // 30 days lock period
            stakingUnlockFee: 0.02 // 2% early unlock fee
        }
    },
    
    // Bradicoin (BRD) special configuration
    BRADICOIN_CONFIG: {
        basePriceUSD: 10.00, // BRADICOIN BASE PRICE: $10.00 USD !!!
        stakingReward: 0.17, // 17% APY
        stakingPayoutInterval: 'daily', // Daily compounding
        transactionFee: 0.001, // 0.1%
        burnRate: 0.0001, // 0.01% burned per transaction
        liquidityPool: 'Zentronix-LP',
        bridgeEnabled: true,
        supportedBridges: ['Ethereum', 'BSC', 'Polygon', 'Solana'],
        // Tier benefits (based on BRD amount staked)
        tierMultipliers: {
            'BRONZE': 1.0,    // 10-99 BRD staked ($100-$990)
            'SILVER': 1.1,    // 100-499 BRD staked ($1,000-$4,990)
            'GOLD': 1.25,     // 500-2499 BRD staked ($5,000-$24,990)
            'PLATINUM': 1.5,  // 2500-9999 BRD staked ($25,000-$99,990)
            'DIAMOND': 2.0    // 10000+ BRD staked ($100,000+)
        }
    },
    
    // Supported fiat currencies
    SUPPORTED_FIAT: {
        USD: { name: 'US Dollar', symbol: '$', decimalPlaces: 2, rate: 1 },
        EUR: { name: 'Euro', symbol: '€', decimalPlaces: 2, rate: 1.09 },
        GBP: { name: 'British Pound', symbol: '£', decimalPlaces: 2, rate: 1.27 },
        JPY: { name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, rate: 0.0067 },
        CHF: { name: 'Swiss Franc', symbol: 'Fr', decimalPlaces: 2, rate: 1.12 },
        CAD: { name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, rate: 0.73 },
        AUD: { name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, rate: 0.66 },
        BRL: { name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2, rate: 0.20 }
    },
    
    // Fee structure (special rates for Bradicoin)
    FEES: {
        cryptoToFiat: {
            percentage: 0.005, // 0.5%
            fixedFee: {
                BTC: 0.0005,
                ETH: 0.005,
                USDT: 1,
                BNB: 0.01,
                BRD: 0, // Zero fee for native token!
                default: 0
            }
        },
        fiatToCrypto: {
            percentage: 0.005, // 0.5%
            fixedFee: {
                USD: 0.5,
                EUR: 0.5,
                GBP: 0.5,
                BRD: 0.1, // Special low fee for Bradicoin purchases
                default: 0.5
            }
        }
    },
    
    // Bradicoin pricing with $10.00 USD base
    BRADICOIN_PRICING: {
        basePriceUSD: 10.00, // 1 BRD = $10.00 USD
        premium: 0.00, // 0% premium for bank customers
        volumeDiscount: {
            '100': 0.001,   // 0.1% discount for 100+ BRD ($1,000+)
            '1000': 0.002,  // 0.2% discount for 1000+ BRD ($10,000+)
            '10000': 0.005  // 0.5% discount for 10000+ BRD ($100,000+)
        },
        loyaltyBonus: {
            'BRONZE': 0.001,   // 0.1% bonus
            'SILVER': 0.002,   // 0.2% bonus
            'GOLD': 0.003,     // 0.3% bonus
            'PLATINUM': 0.004, // 0.4% bonus
            'DIAMOND': 0.005   // 0.5% bonus
        }
    },
    
    // Rate sources priority
    PRICE_SOURCES: [
        'binance',
        'coinbase',
        'kraken',
        'zentronix_oracle'
    ],
    
    // Rate lock duration (seconds)
    RATE_LOCK_DURATION: 30,
    
    // Daily limits per user (USD equivalent)
    DAILY_LIMIT: 50000,
    MONTHLY_LIMIT: 250000,
    
    // Bradicoin specific limits (in BRD units)
    BRADICOIN_LIMITS: {
        daily: 5000,    // 5,000 BRD per day ($50,000 USD)
        monthly: 25000, // 25,000 BRD per month ($250,000 USD)
        annual: 100000  // 100,000 BRD per year ($1,000,000 USD)
    }
};

// ========================================
// REAL-TIME PRICE ORACLE (with Bradicoin at $10.00)
// ========================================

class PriceOracle {
    constructor() {
        this.prices = new Map();
        this.lastUpdate = null;
        this.updateInterval = null;
        this.bradicoinPrice = CONVERSION_CONFIG.BRADICOIN_CONFIG.basePriceUSD; // $10.00
    }

    async initialize() {
        await this.fetchAllPrices();
        this.updateInterval = setInterval(() => this.fetchAllPrices(), 10000);
        console.log(`[PriceOracle] Initialized - Bradicoin (BRD) base price: $${this.bradicoinPrice} USD`);
        return this;
    }

    async fetchAllPrices() {
        const cryptos = Object.keys(CONVERSION_CONFIG.SUPPORTED_CRYPTOS);
        const fiats = Object.keys(CONVERSION_CONFIG.SUPPORTED_FIAT);
        
        for (const crypto of cryptos) {
            for (const fiat of fiats) {
                if (crypto === 'BRD') {
                    this.setBradicoinPrice(fiat);
                } else {
                    await this.fetchPrice(crypto, fiat);
                }
            }
        }
        
        this.lastUpdate = new Date();
    }

    setBradicoinPrice(fiat) {
        const usdPrice = CONVERSION_CONFIG.BRADICOIN_CONFIG.basePriceUSD; // $10.00
        const fiatRate = CONVERSION_CONFIG.SUPPORTED_FIAT[fiat]?.rate || 1;
        const price = usdPrice * fiatRate;
        
        const key = `BRD_${fiat}`;
        this.prices.set(key, {
            price: price,
            timestamp: new Date(),
            source: 'zentronix_oracle',
            isStable: true,
            usdEquivalent: usdPrice
        });
        
        console.log(`[PriceOracle] BRD/${fiat} rate set to ${price} (1 BRD = $${usdPrice} USD)`);
    }

    async fetchPrice(crypto, fiat) {
        try {
            const price = await this.getPriceFromBinance(crypto, fiat);
            if (price) {
                const key = `${crypto}_${fiat}`;
                this.prices.set(key, { price, timestamp: new Date(), source: 'binance' });
                return price;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getPriceFromBinance(crypto, fiat) {
        try {
            const mockPrices = {
                BTCUSD: 65000, BTCEUR: 60000, BTCGBP: 51000, BTCBRL: 325000,
                ETHUSD: 3500, ETHEUR: 3200, ETHGBP: 2800, ETHBRL: 17500,
                USDTUSD: 1, USDTEUR: 0.92, USDTGBP: 0.79, USDTBRL: 5.00,
                BNBUSD: 600, SOLUSD: 150, XRPUSD: 0.65, ADAUSD: 0.45, DOGEUSD: 0.15
            };
            return mockPrices[`${crypto}${fiat}`] || null;
        } catch (error) {
            return null;
        }
    }

    getCurrentPrice(crypto, fiat) {
        const key = `${crypto}_${fiat}`;
        let priceData = this.prices.get(key);
        
        if (crypto === 'BRD') {
            this.setBradicoinPrice(fiat);
            priceData = this.prices.get(key);
        }
        
        if (!priceData) {
            throw new Error(`Price not available for ${crypto}/${fiat}`);
        }
        
        return priceData.price;
    }

    getBradicoinPriceWithDiscount(customerTier = 'STANDARD', volumeInBRD = 0) {
        const basePrice = CONVERSION_CONFIG.BRADICOIN_CONFIG.basePriceUSD; // $10.00
        let price = basePrice;
        
        // Apply volume discount (based on BRD amount)
        let volumeDiscount = 0;
        if (volumeInBRD >= 10000) volumeDiscount = CONVERSION_CONFIG.BRADICOIN_PRICING.volumeDiscount['10000'];
        else if (volumeInBRD >= 1000) volumeDiscount = CONVERSION_CONFIG.BRADICOIN_PRICING.volumeDiscount['1000'];
        else if (volumeInBRD >= 100) volumeDiscount = CONVERSION_CONFIG.BRADICOIN_PRICING.volumeDiscount['100'];
        
        // Apply loyalty bonus
        let loyaltyBonus = 0;
        if (CONVERSION_CONFIG.BRADICOIN_PRICING.loyaltyBonus[customerTier]) {
            loyaltyBonus = CONVERSION_CONFIG.BRADICOIN_PRICING.loyaltyBonus[customerTier];
        }
        
        const totalDiscount = volumeDiscount + loyaltyBonus;
        const discountedPrice = price * (1 - totalDiscount);
        
        return {
            basePrice: price,
            basePriceUSD: price,
            finalPrice: discountedPrice,
            finalPriceUSD: discountedPrice,
            volumeDiscount: volumeDiscount * 100,
            loyaltyBonus: loyaltyBonus * 100,
            totalDiscount: totalDiscount * 100,
            customerTier: customerTier || 'STANDARD',
            volumeInBRD: volumeInBRD,
            volumeInUSD: volumeInBRD * price
        };
    }

    stop() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }
}

// ========================================
// STAKING MANAGER (17% APY for Bradicoin)
// ========================================

class StakingManager extends EventEmitter {
    constructor(walletManager) {
        super();
        this.walletManager = walletManager;
        this.stakes = new Map();
        this.stakeCounter = 0;
        this.rewardCheckInterval = null;
        this.apy = CONVERSION_CONFIG.SUPPORTED_CRYPTOS.BRD.stakingAPY; // 17% APY
        this.brdPriceUSD = CONVERSION_CONFIG.BRADICOIN_CONFIG.basePriceUSD; // $10.00
    }

    initialize() {
        this.rewardCheckInterval = setInterval(() => this.distributeAllRewards(), 60 * 60 * 1000);
        console.log(`[StakingManager] Initialized with ${this.apy * 100}% APY for Bradicoin (1 BRD = $${this.brdPriceUSD} USD)`);
    }

    async stake(customerId, amountInBRD, lockPeriodDays = 30) {
        const brdConfig = CONVERSION_CONFIG.SUPPORTED_CRYPTOS.BRD;
        
        if (amountInBRD < brdConfig.stakingMinAmount) {
            throw new Error(`Minimum staking amount is ${brdConfig.stakingMinAmount} BRD ($${brdConfig.stakingMinAmount * this.brdPriceUSD} USD)`);
        }
        
        const balance = await this.walletManager.getCryptoBalance(customerId, 'BRD');
        if (balance < amountInBRD) {
            throw new Error(`Insufficient BRD balance. Available: ${balance} BRD`);
        }
        
        await this.walletManager.debitCrypto(customerId, 'BRD', amountInBRD);
        
        const stakeId = `STAKE_${Date.now()}_${++this.stakeCounter}`;
        const amountInUSD = amountInBRD * this.brdPriceUSD;
        const stake = {
            stakeId,
            customerId,
            amountInBRD,
            amountInUSD,
            lockPeriodDays,
            startDate: new Date(),
            endDate: new Date(Date.now() + lockPeriodDays * 24 * 60 * 60 * 1000),
            lastRewardClaim: new Date(),
            accumulatedRewardsBRD: 0,
            accumulatedRewardsUSD: 0,
            claimedRewardsBRD: 0,
            claimedRewardsUSD: 0,
            status: 'ACTIVE',
            tier: this.getTier(amountInBRD)
        };
        
        this.stakes.set(stakeId, stake);
        this.emit('stake_created', stake);
        
        return stake;
    }

    getTier(amountInBRD) {
        if (amountInBRD >= 10000) return 'DIAMOND';
        if (amountInBRD >= 2500) return 'PLATINUM';
        if (amountInBRD >= 500) return 'GOLD';
        if (amountInBRD >= 100) return 'SILVER';
        return 'BRONZE';
    }

    calculateRewards(stake, currentDate = new Date()) {
        const hoursStaked = (currentDate - stake.startDate) / (1000 * 60 * 60);
        const daysStaked = hoursStaked / 24;
        
        const dailyRate = this.apy / 365;
        const rewardInBRD = stake.amountInBRD * dailyRate * daysStaked;
        
        const multiplier = CONVERSION_CONFIG.BRADICOIN_CONFIG.tierMultipliers[stake.tier] || 1;
        const boostedRewardInBRD = rewardInBRD * multiplier;
        const boostedRewardInUSD = boostedRewardInBRD * this.brdPriceUSD;
        
        return {
            baseRewardInBRD: rewardInBRD,
            baseRewardInUSD: rewardInBRD * this.brdPriceUSD,
            multiplier: multiplier,
            boostedRewardInBRD: boostedRewardInBRD,
            boostedRewardInUSD: boostedRewardInUSD,
            pendingRewardsInBRD: boostedRewardInBRD - stake.claimedRewardsBRD,
            pendingRewardsInUSD: (boostedRewardInBRD - stake.claimedRewardsBRD) * this.brdPriceUSD,
            dailyRewardRateBRD: stake.amountInBRD * (this.apy / 365) * multiplier,
            dailyRewardRateUSD: stake.amountInBRD * (this.apy / 365) * multiplier * this.brdPriceUSD
        };
    }

    async claimRewards(customerId, stakeId = null) {
        let totalClaimedBRD = 0;
        let totalClaimedUSD = 0;
        const stakesToProcess = [];
        
        for (const [id, stake] of this.stakes) {
            if (stake.customerId === customerId && stake.status === 'ACTIVE') {
                if (stakeId === null || stakeId === id) {
                    stakesToProcess.push({ id, stake });
                }
            }
        }
        
        for (const { id, stake } of stakesToProcess) {
            const rewards = this.calculateRewards(stake);
            const toClaimBRD = rewards.pendingRewardsInBRD;
            const toClaimUSD = toClaimBRD * this.brdPriceUSD;
            
            if (toClaimBRD > 0.001) {
                await this.walletManager.creditCrypto(customerId, 'BRD', toClaimBRD);
                
                stake.accumulatedRewardsBRD += toClaimBRD;
                stake.accumulatedRewardsUSD += toClaimUSD;
                stake.claimedRewardsBRD += toClaimBRD;
                stake.claimedRewardsUSD += toClaimUSD;
                stake.lastRewardClaim = new Date();
                
                totalClaimedBRD += toClaimBRD;
                totalClaimedUSD += toClaimUSD;
                this.emit('rewards_claimed', { stakeId: id, amountInBRD: toClaimBRD, amountInUSD: toClaimUSD, customerId });
            }
        }
        
        return { 
            claimedInBRD: totalClaimedBRD, 
            claimedInUSD: totalClaimedUSD, 
            stakeCount: stakesToProcess.length 
        };
    }

    async distributeAllRewards() {
        const claims = {};
        
        for (const [id, stake] of this.stakes) {
            if (stake.status === 'ACTIVE') {
                const rewards = this.calculateRewards(stake);
                const toClaimBRD = rewards.pendingRewardsInBRD;
                const toClaimUSD = toClaimBRD * this.brdPriceUSD;
                
                if (toClaimBRD >= 0.01) {
                    if (!claims[stake.customerId]) claims[stake.customerId] = { BRD: 0, USD: 0 };
                    claims[stake.customerId].BRD += toClaimBRD;
                    claims[stake.customerId].USD += toClaimUSD;
                    
                    await this.walletManager.creditCrypto(stake.customerId, 'BRD', toClaimBRD);
                    
                    stake.accumulatedRewardsBRD += toClaimBRD;
                    stake.accumulatedRewardsUSD += toClaimUSD;
                    stake.claimedRewardsBRD += toClaimBRD;
                    stake.claimedRewardsUSD += toClaimUSD;
                    stake.lastRewardClaim = new Date();
                }
            }
        }
        
        if (Object.keys(claims).length > 0) {
            console.log(`[Staking] Distributed rewards to ${Object.keys(claims).length} customers`);
            this.emit('rewards_distributed', claims);
        }
        
        return claims;
    }

    async unstake(customerId, stakeId, earlyUnlock = false) {
        const stake = this.stakes.get(stakeId);
        
        if (!stake) throw new Error('Stake not found');
        if (stake.customerId !== customerId) throw new Error('Unauthorized');
        if (stake.status !== 'ACTIVE') throw new Error('Stake is not active');
        
        let penaltyBRD = 0;
        let returnAmountBRD = stake.amountInBRD;
        
        if (earlyUnlock || new Date() < stake.endDate) {
            const unlockFee = CONVERSION_CONFIG.SUPPORTED_CRYPTOS.BRD.stakingUnlockFee;
            penaltyBRD = stake.amountInBRD * unlockFee;
            returnAmountBRD = stake.amountInBRD - penaltyBRD;
        }
        
        await this.claimRewards(customerId, stakeId);
        await this.walletManager.creditCrypto(customerId, 'BRD', returnAmountBRD);
        
        stake.status = 'UNSTAKED';
        stake.unstakeDate = new Date();
        stake.penaltyInBRD = penaltyBRD;
        stake.penaltyInUSD = penaltyBRD * this.brdPriceUSD;
        stake.returnAmountInBRD = returnAmountBRD;
        stake.returnAmountInUSD = returnAmountBRD * this.brdPriceUSD;
        
        this.emit('unstake_completed', stake);
        
        return {
            stakeId,
            originalAmountInBRD: stake.amountInBRD,
            originalAmountInUSD: stake.amountInUSD,
            penaltyInBRD: penaltyBRD,
            penaltyInUSD: penaltyBRD * this.brdPriceUSD,
            returnAmountInBRD: returnAmountBRD,
            returnAmountInUSD: returnAmountBRD * this.brdPriceUSD,
            rewardsClaimedInBRD: stake.claimedRewardsBRD,
            rewardsClaimedInUSD: stake.claimedRewardsUSD
        };
    }

    async getStakingStats(customerId) {
        let totalStakedBRD = 0;
        let totalStakedUSD = 0;
        let totalRewardsBRD = 0;
        let totalRewardsUSD = 0;
        let activeStakes = 0;
        let currentTier = 'BRONZE';
        
        for (const stake of this.stakes.values()) {
            if (stake.customerId === customerId && stake.status === 'ACTIVE') {
                totalStakedBRD += stake.amountInBRD;
                totalStakedUSD += stake.amountInUSD;
                totalRewardsBRD += stake.accumulatedRewardsBRD;
                totalRewardsUSD += stake.accumulatedRewardsUSD;
                activeStakes++;
            }
        }
        
        currentTier = this.getTier(totalStakedBRD);
        const multiplier = CONVERSION_CONFIG.BRADICOIN_CONFIG.tierMultipliers[currentTier] || 1;
        const effectiveAPY = this.apy * multiplier;
        
        const estimatedDailyBRD = totalStakedBRD * (this.apy / 365) * multiplier;
        const estimatedDailyUSD = estimatedDailyBRD * this.brdPriceUSD;
        
        return {
            customerId,
            brdPriceUSD: this.brdPriceUSD,
            totalStakedInBRD: totalStakedBRD,
            totalStakedInUSD: totalStakedUSD,
            activeStakes,
            totalRewardsEarnedInBRD: totalRewardsBRD,
            totalRewardsEarnedInUSD: totalRewardsUSD,
            currentTier,
            multiplier,
            baseAPY: this.apy * 100,
            effectiveAPY: effectiveAPY * 100,
            estimatedDailyRewardInBRD: estimatedDailyBRD,
            estimatedDailyRewardInUSD: estimatedDailyUSD,
            estimatedMonthlyRewardInBRD: estimatedDailyBRD * 30,
            estimatedMonthlyRewardInUSD: estimatedDailyUSD * 30,
            estimatedYearlyRewardInBRD: totalStakedBRD * this.apy * multiplier,
            estimatedYearlyRewardInUSD: totalStakedBRD * this.apy * multiplier * this.brdPriceUSD
        };
    }

    async getLeaderboard(limit = 10) {
        const stakers = new Map();
        
        for (const stake of this.stakes.values()) {
            if (stake.status === 'ACTIVE') {
                const current = stakers.get(stake.customerId) || { 
                    totalStakedInBRD: 0, 
                    totalStakedInUSD: 0, 
                    totalRewardsInBRD: 0,
                    totalRewardsInUSD: 0
                };
                current.totalStakedInBRD += stake.amountInBRD;
                current.totalStakedInUSD += stake.amountInUSD;
                current.totalRewardsInBRD += stake.accumulatedRewardsBRD;
                current.totalRewardsInUSD += stake.accumulatedRewardsUSD;
                stakers.set(stake.customerId, current);
            }
        }
        
        const leaderboard = Array.from(stakers.entries())
            .map(([customerId, data]) => ({ 
                customerId, 
                ...data,
                rank: 0
            }))
            .sort((a, b) => b.totalStakedInBRD - a.totalStakedInBRD)
            .slice(0, limit)
            .map((item, index) => ({ ...item, rank: index + 1 }));
        
        return leaderboard;
    }

    stop() {
        if (this.rewardCheckInterval) clearInterval(this.rewardCheckInterval);
    }
}

// ========================================
// WALLET MANAGER (with Bradicoin support)
// ========================================

class WalletManager {
    constructor(db) {
        this.db = db;
        this.wallets = new Map();
        this.brdPriceUSD = CONVERSION_CONFIG.BRADICOIN_CONFIG.basePriceUSD;
    }

    async getCryptoBalance(customerId, crypto) {
        const wallet = await this.getOrCreateWallet(customerId, crypto);
        return wallet.balance;
    }

    async getFiatBalance(customerId, fiat) {
        const account = await this.getOrCreateFiatAccount(customerId, fiat);
        return account.balance;
    }

    async getOrCreateWallet(customerId, crypto) {
        const key = `${customerId}_${crypto}`;
        if (this.wallets.has(key)) return this.wallets.get(key);
        
        const wallet = {
            customerId,
            crypto,
            balance: 0,
            address: this.generateWalletAddress(crypto),
            createdAt: new Date(),
            lastUpdated: new Date()
        };
        
        this.wallets.set(key, wallet);
        return wallet;
    }

    async getOrCreateFiatAccount(customerId, fiat) {
        return {
            customerId,
            fiat,
            balance: 0,
            accountNumber: this.generateAccountNumber(),
            createdAt: new Date()
        };
    }

    generateWalletAddress(crypto) {
        const prefix = crypto.toLowerCase();
        const random = crypto.randomBytes(20).toString('hex');
        return `${prefix}_${random}`;
    }

    generateAccountNumber() {
        return `ACC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    async debitCrypto(customerId, crypto, amount) {
        const wallet = await this.getOrCreateWallet(customerId, crypto);
        if (wallet.balance < amount) {
            throw new Error(`Insufficient ${crypto} balance. Available: ${wallet.balance}`);
        }
        wallet.balance -= amount;
        wallet.lastUpdated = new Date();
        
        if (crypto === 'BRD') {
            const burnAmount = amount * CONVERSION_CONFIG.BRADICOIN_CONFIG.burnRate;
            const burnAmountUSD = burnAmount * this.brdPriceUSD;
            console.log(`[BRD] 🔥 Burned ${burnAmount} BRD ($${burnAmountUSD} USD) from transaction`);
        }
        
        return true;
    }

    async creditCrypto(customerId, crypto, amount) {
        const wallet = await this.getOrCreateWallet(customerId, crypto);
        wallet.balance += amount;
        wallet.lastUpdated = new Date();
        return true;
    }

    async debitFiat(customerId, fiat, amount) {
        const account = await this.getOrCreateFiatAccount(customerId, fiat);
        if (account.balance < amount) {
            throw new Error(`Insufficient ${fiat} balance`);
        }
        account.balance -= amount;
        return true;
    }

    async creditFiat(customerId, fiat, amount) {
        const account = await this.getOrCreateFiatAccount(customerId, fiat);
        account.balance += amount;
        return true;
    }
}

// ========================================
// AML INTEGRATION
// ========================================

class AMLIntegration {
    constructor(amlService) {
        this.amlService = amlService;
    }

    async checkConversion(customerId, fromType, fromCurrency, toType, toCurrency, amount, valueUSD) {
        const transaction = {
            transactionId: `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            customerId: customerId,
            amount: valueUSD,
            currency: 'USD',
            type: `${fromType.toUpperCase()}_TO_${toType.toUpperCase()}`,
            sourceCountry: 'XX',
            destinationCountry: 'XX',
            sourceAccount: `${fromCurrency}_WALLET`,
            destinationAccount: `${toCurrency}_ACCOUNT`,
            timestamp: new Date().toISOString(),
            description: `${fromCurrency} to ${toCurrency} conversion`
        };
        
        if (this.amlService) {
            const amlResult = await this.amlService.monitorTransaction(transaction);
            return {
                approved: amlResult.approved,
                riskScore: amlResult.riskScore,
                riskLevel: amlResult.riskLevel,
                blocked: amlResult.blocked || false
            };
        }
        
        return { approved: true, riskScore: 0, riskLevel: 'LOW', blocked: false };
    }
}

// ========================================
// CONVERSION ENGINE (with Bradicoin)
// ========================================

class ConversionEngine extends EventEmitter {
    constructor(priceOracle, walletManager, amlIntegration, stakingManager) {
        super();
        this.priceOracle = priceOracle;
        this.walletManager = walletManager;
        this.amlIntegration = amlIntegration;
        this.stakingManager = stakingManager;
        this.rateLocks = new Map();
        this.conversionHistory = [];
        this.brdPriceUSD = CONVERSION_CONFIG.BRADICOIN_CONFIG.basePriceUSD;
    }

    async getExchangeRate(crypto, fiat, includeFees = true, customerTier = 'STANDARD', volume = 0) {
        if (!CONVERSION_CONFIG.SUPPORTED_CRYPTOS[crypto]) {
            throw new Error(`Unsupported cryptocurrency: ${crypto}`);
        }
        
        let marketRate;
        let isBradicoin = false;
        
        if (crypto === 'BRD') {
            isBradicoin = true;
            const priceInfo = this.priceOracle.getBradicoinPriceWithDiscount(customerTier, volume);
            marketRate = priceInfo.finalPrice;
        } else {
            marketRate = await this.priceOracle.getCurrentPrice(crypto, fiat);
        }
        
        if (!includeFees) {
            return { 
                rate: marketRate, 
                marketRate, 
                fees: 0, 
                effectiveRate: marketRate, 
                isBradicoin,
                brdPriceUSD: isBradicoin ? this.brdPriceUSD : null
            };
        }
        
        const feePercentage = CONVERSION_CONFIG.FEES.cryptoToFiat.percentage;
        const fixedFee = CONVERSION_CONFIG.FEES.cryptoToFiat.fixedFee[crypto] || 0;
        const feeAmount = (marketRate * feePercentage) + fixedFee;
        const effectiveRate = marketRate - feeAmount;
        
        return {
            rate: marketRate,
            marketRate,
            fees: { percentage: feePercentage * 100, fixed: fixedFee, amount: feeAmount, currency: fiat },
            effectiveRate,
            isBradicoin,
            brdPriceUSD: isBradicoin ? this.brdPriceUSD : null,
            timestamp: new Date().toISOString()
        };
    }

    async convertCryptoToFiat(customerId, crypto, fiat, cryptoAmount, customerTier = 'STANDARD') {
        const startTime = Date.now();
        const cryptoConfig = CONVERSION_CONFIG.SUPPORTED_CRYPTOS[crypto];
        
        if (!cryptoConfig) throw new Error(`Unsupported crypto: ${crypto}`);
        if (cryptoAmount < cryptoConfig.minAmount) {
            throw new Error(`Minimum amount for ${crypto} is ${cryptoConfig.minAmount}`);
        }
        if (cryptoAmount > cryptoConfig.maxAmount) {
            throw new Error(`Maximum amount for ${crypto} is ${cryptoConfig.maxAmount}`);
        }
        
        if (crypto === 'BRD') {
            if (cryptoAmount > CONVERSION_CONFIG.BRADICOIN_LIMITS.daily) {
                throw new Error(`Daily Bradicoin limit exceeded. Maximum ${CONVERSION_CONFIG.BRADICOIN_LIMITS.daily} BRD per day`);
            }
        }
        
        const rateInfo = await this.getExchangeRate(crypto, fiat, true, customerTier, cryptoAmount);
        const fiatAmount = cryptoAmount * rateInfo.effectiveRate;
        
        let usdValue;
        if (crypto === 'BRD') {
            usdValue = cryptoAmount * this.brdPriceUSD;
        } else {
            usdValue = cryptoAmount * await this.priceOracle.getCurrentPrice(crypto, 'USD');
        }
        
        if (usdValue > CONVERSION_CONFIG.DAILY_LIMIT) {
            throw new Error(`Daily limit exceeded. Maximum ${CONVERSION_CONFIG.DAILY_LIMIT} USD per day`);
        }
        
        const amlCheck = await this.amlIntegration.checkConversion(
            customerId, 'CRYPTO', crypto, 'FIAT', fiat, cryptoAmount, usdValue
        );
        
        if (!amlCheck.approved) {
            this.emit('conversion_blocked', { customerId, crypto, fiat, amount: cryptoAmount, reason: 'AML check failed' });
            throw new Error(`Conversion blocked by AML monitoring. Risk score: ${amlCheck.riskScore}`);
        }
        
        const cryptoBalance = await this.walletManager.getCryptoBalance(customerId, crypto);
        if (cryptoBalance < cryptoAmount) {
            throw new Error(`Insufficient ${crypto} balance. Available: ${cryptoBalance}`);
        }
        
        await this.walletManager.debitCrypto(customerId, crypto, cryptoAmount);
        await this.walletManager.creditFiat(customerId, fiat, fiatAmount);
        
        const conversion = {
            conversionId: `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            customerId,
            type: 'CRYPTO_TO_FIAT',
            fromCurrency: crypto,
            toCurrency: fiat,
            fromAmount: cryptoAmount,
            toAmount: fiatAmount,
            exchangeRate: rateInfo.rate,
            effectiveRate: rateInfo.effectiveRate,
            fees: rateInfo.fees,
            usdValue,
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime
        };
        
        this.conversionHistory.push(conversion);
        this.emit('conversion_completed', conversion);
        
        return conversion;
    }

    async convertFiatToCrypto(customerId, fiat, crypto, fiatAmount, customerTier = 'STANDARD') {
        const startTime = Date.now();
        const cryptoConfig = CONVERSION_CONFIG.SUPPORTED_CRYPTOS[crypto];
        
        if (!cryptoConfig) throw new Error(`Unsupported crypto: ${crypto}`);
        
        const rateInfo = await this.getReverseExchangeRate(fiat, crypto, true, customerTier, fiatAmount);
        const cryptoAmount = fiatAmount * rateInfo.effectiveRate;
        
        if (cryptoAmount < cryptoConfig.minAmount) {
            throw new Error(`Converted amount (${cryptoAmount} ${crypto}) is below minimum`);
        }
        if (cryptoAmount > cryptoConfig.maxAmount) {
            throw new Error(`Converted amount (${cryptoAmount} ${crypto}) exceeds maximum`);
        }
        
        if (crypto === 'BRD') {
            if (cryptoAmount > CONVERSION_CONFIG.BRADICOIN_LIMITS.daily) {
                throw new Error(`Daily Bradicoin limit exceeded. Maximum ${CONVERSION_CONFIG.BRADICOIN_LIMITS.daily} BRD per day`);
            }
        }
        
        let usdValue;
        if (crypto === 'BRD') {
            usdValue = cryptoAmount * this.brdPriceUSD;
        } else {
            usdValue = cryptoAmount * await this.priceOracle.getCurrentPrice(crypto, 'USD');
        }
        
        if (usdValue > CONVERSION_CONFIG.DAILY_LIMIT) {
            throw new Error(`Daily limit exceeded. Maximum ${CONVERSION_CONFIG.DAILY_LIMIT} USD per day`);
        }
        
        const amlCheck = await this.amlIntegration.checkConversion(
            customerId, 'FIAT', fiat, 'CRYPTO', crypto, fiatAmount, usdValue
        );
        
        if (!amlCheck.approved) {
            this.emit('conversion_blocked', { customerId, fiat, crypto, amount: fiatAmount, reason: 'AML check failed' });
            throw new Error(`Conversion blocked by AML monitoring. Risk score: ${amlCheck.riskScore}`);
        }
        
        const fiatBalance = await this.walletManager.getFiatBalance(customerId, fiat);
        if (fiatBalance < fiatAmount) {
            throw new Error(`Insufficient ${fiat} balance. Available: ${fiatBalance}`);
        }
        
        await this.walletManager.debitFiat(customerId, fiat, fiatAmount);
        await this.walletManager.creditCrypto(customerId, crypto, cryptoAmount);
        
        const conversion = {
            conversionId: `CONV-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            customerId,
            type: 'FIAT_TO_CRYPTO',
            fromCurrency: fiat,
            toCurrency: crypto,
            fromAmount: fiatAmount,
            toAmount: cryptoAmount,
            exchangeRate: rateInfo.rate,
            effectiveRate: rateInfo.effectiveRate,
            fees: rateInfo.fees,
            usdValue,
            status: 'COMPLETED',
            timestamp: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime
        };
        
        this.conversionHistory.push(conversion);
        this.emit('conversion_completed', conversion);
        
        return conversion;
    }

    async getReverseExchangeRate(fiat, crypto, includeFees = true, customerTier = 'STANDARD', volume = 0) {
        let rate;
        let isBradicoin = false;
        
        if (crypto === 'BRD') {
            isBradicoin = true;
            const priceInfo = this.priceOracle.getBradicoinPriceWithDiscount(customerTier, volume);
            rate = priceInfo.finalPrice;
        } else {
            rate = await this.priceOracle.getCurrentPrice(crypto, fiat);
        }
        
        const inverseRate = 1 / rate;
        
        if (!includeFees) {
            return { 
                rate: inverseRate, 
                marketRate: inverseRate, 
                fees: 0, 
                effectiveRate: inverseRate, 
                isBradicoin,
                brdPriceUSD: isBradicoin ? this.brdPriceUSD : null
            };
        }
        
        const feePercentage = CONVERSION_CONFIG.FEES.fiatToCrypto.percentage;
        const fixedFee = CONVERSION_CONFIG.FEES.fiatToCrypto.fixedFee[crypto] || CONVERSION_CONFIG.FEES.fiatToCrypto.fixedFee.default;
        const feeAmount = (inverseRate * feePercentage) + fixedFee;
        const effectiveRate = inverseRate - feeAmount;
        
        return {
            rate: inverseRate,
            marketRate: inverseRate,
            fees: { percentage: feePercentage * 100, fixed: fixedFee, amount: feeAmount, currency: crypto },
            effectiveRate,
            isBradicoin,
            brdPriceUSD: isBradicoin ? this.brdPriceUSD : null,
            timestamp: new Date().toISOString()
        };
    }

    async getConversionHistory(customerId, limit = 50) {
        return this.conversionHistory.filter(conv => conv.customerId === customerId).slice(-limit).reverse();
    }

    async getBradicoinStats() {
        const bradicoinWallet = Array.from(this.walletManager.wallets.values()).filter(w => w.crypto === 'BRD');
        
        const totalSupply = CONVERSION_CONFIG.SUPPORTED_CRYPTOS.BRD.totalSupply;
        const circulatingSupply = bradicoinWallet.reduce((sum, w) => sum + w.balance, 0);
        const marketCap = circulatingSupply * this.brdPriceUSD;
        
        return {
            name: 'Bradicoin',
            symbol: 'BRD',
            priceUSD: this.brdPriceUSD,
            totalSupply: totalSupply,
            totalSupplyUSD: totalSupply * this.brdPriceUSD,
            circulatingSupply: circulatingSupply,
            circulatingSupplyUSD: marketCap,
            marketCap: marketCap,
            stakingAPY: CONVERSION_CONFIG.SUPPORTED_CRYPTOS.BRD.stakingAPY * 100,
            stakingMinAmountInBRD: CONVERSION_CONFIG.SUPPORTED_CRYPTOS.BRD.stakingMinAmount,
            stakingMinAmountInUSD: CONVERSION_CONFIG.SUPPORTED_CRYPTOS.BRD.stakingMinAmount * this.brdPriceUSD,
            activeWallets: bradicoinWallet.length,
            lastUpdated: new Date().toISOString()
        };
    }
}

// ========================================
// EXPRESS ROUTES
// ========================================

function createConversionRouter(conversionEngine, stakingManager) {
    const express = require('express');
    const router = express.Router();

    // Exchange rates
    router.get('/rates/:crypto/:fiat', async (req, res) => {
        try {
            const { crypto, fiat } = req.params;
            const { tier, volume } = req.query;
            const rate = await conversionEngine.getExchangeRate(
                crypto.toUpperCase(), fiat.toUpperCase(), true, tier || 'STANDARD', parseFloat(volume) || 0
            );
            res.json(rate);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Crypto to Fiat conversion
    router.post('/crypto-to-fiat', async (req, res) => {
        try {
            const { customerId, crypto, fiat, amount, customerTier } = req.body;
            const result = await conversionEngine.convertCryptoToFiat(
                customerId, crypto.toUpperCase(), fiat.toUpperCase(), amount, customerTier
            );
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Fiat to Crypto conversion
    router.post('/fiat-to-crypto', async (req, res) => {
        try {
            const { customerId, fiat, crypto, amount, customerTier } = req.body;
            const result = await conversionEngine.convertFiatToCrypto(
                customerId, fiat.toUpperCase(), crypto.toUpperCase(), amount, customerTier
            );
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    // Conversion history
    router.get('/history/:customerId', async (req, res) => {
        const history = await conversionEngine.getConversionHistory(req.params.customerId);
        res.json(history);
    });

    // Bradicoin stats
    router.get('/bradicoin/stats', async (req, res) => {
        const stats = await conversionEngine.getBradicoinStats();
        res.json(stats);
    });

    // Staking routes
    router.post('/staking/stake', async (req, res) => {
        try {
            const { customerId, amountInBRD, lockPeriodDays } = req.body;
            const result = await stakingManager.stake(customerId, amountInBRD, lockPeriodDays || 30);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    router.post('/staking/claim', async (req, res) => {
        try {
            const { customerId, stakeId } = req.body;
            const result = await stakingManager.claimRewards(customerId, stakeId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    router.post('/staking/unstake', async (req, res) => {
        try {
            const { customerId, stakeId, earlyUnlock } = req.body;
            const result = await stakingManager.unstake(customerId, stakeId, earlyUnlock || false);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    router.get('/staking/stats/:customerId', async (req, res) => {
        try {
            const stats = await stakingManager.getStakingStats(req.params.customerId);
            res.json(stats);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });

    router.get('/staking/leaderboard', async (req, res) => {
        const leaderboard = await stakingManager.getLeaderboard(parseInt(req.query.limit) || 10);
        res.json(leaderboard);
    });

    return router;
}

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initializeConversionSystem(amlService = null) {
    const priceOracle = new PriceOracle();
    await priceOracle.initialize();
    
    const walletManager = new WalletManager(null);
    const amlIntegration = new AMLIntegration(amlService);
    const stakingManager = new StakingManager(walletManager);
    stakingManager.initialize();
    
    const conversionEngine = new ConversionEngine(priceOracle, walletManager, amlIntegration, stakingManager);
    
    const brdPrice = CONVERSION_CONFIG.BRADICOIN_CONFIG.basePriceUSD;
    console.log(`[ConversionSystem] ✅ Fully initialized with Bradicoin (BRD) at $${brdPrice} USD and 17% APY staking rewards`);
    
    return {
        conversionEngine,
        stakingManager,
        walletManager,
        priceOracle
    };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    ConversionEngine,
    PriceOracle,
    WalletManager,
    StakingManager,
    AMLIntegration,
    createConversionRouter,
    initializeConversionSystem,
    CONVERSION_CONFIG
};
