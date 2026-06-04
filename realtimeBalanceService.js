// realtimeBalanceService.js - Real-Time Balance System
// Features: Live balance updates, Multi-currency support, Instant transactions, Balance history, WebSocket streaming

const { v4: uuidv4 } = require('uuid');

class RealtimeBalanceService {
    constructor() {
        this.userBalances = new Map(); // userId -> balances
        this.balanceHistory = new Map(); // userId -> history
        this.balanceLocks = new Map(); // userId -> lock status
        this.pendingUpdates = [];
        this.balanceSubscribers = new Map(); // userId -> subscribers
        
        // Initialize with sample data
        this.initializeSampleBalances();
    }

    // ============= 1. INITIALIZE SAMPLE BALANCES =============
    initializeSampleBalances() {
        const sampleUsers = [
            { userId: 'user_1', name: 'Alexander Vance' },
            { userId: 'user_2', name: 'Sarah Chen' },
            { userId: 'user_3', name: 'James Rodriguez' },
            { userId: 'user_4', name: 'Maria Silva' }
        ];
        
        sampleUsers.forEach(user => {
            this.userBalances.set(user.userId, {
                userId: user.userId,
                userName: user.name,
                balances: {
                    USD: this.generateRandomBalance(10000, 250000),
                    EUR: this.generateRandomBalance(5000, 150000),
                    GBP: this.generateRandomBalance(3000, 100000),
                    CHF: this.generateRandomBalance(2000, 80000),
                    JPY: this.generateRandomBalance(500000, 5000000),
                    BTC: this.generateRandomBalance(0.1, 5),
                    ETH: this.generateRandomBalance(1, 50),
                    BRADICOIN: this.generateRandomBalance(1000, 50000),
                    SOL: this.generateRandomBalance(50, 2000),
                    USDT: this.generateRandomBalance(5000, 200000),
                    BNB: this.generateRandomBalance(10, 500),
                    LTC: this.generateRandomBalance(50, 1000)
                },
                lastUpdated: new Date().toISOString(),
                version: 1
            });
            
            this.balanceHistory.set(user.userId, []);
        });
    }

    generateRandomBalance(min, max) {
        return Math.random() * (max - min) + min;
    }

    // ============= 2. GET REAL-TIME BALANCE =============
    async getBalance(userId, currency = null) {
        const userBalance = this.userBalances.get(userId);
        
        if (!userBalance) {
            return {
                success: false,
                error: 'User not found'
            };
        }
        
        if (currency) {
            const balance = userBalance.balances[currency.toUpperCase()];
            if (balance === undefined) {
                return {
                    success: false,
                    error: `Currency ${currency} not supported`
                };
            }
            
            return {
                success: true,
                userId: userId,
                userName: userBalance.userName,
                currency: currency.toUpperCase(),
                balance: balance,
                lastUpdated: userBalance.lastUpdated,
                timestamp: new Date().toISOString()
            };
        }
        
        return {
            success: true,
            userId: userId,
            userName: userBalance.userName,
            balances: userBalance.balances,
            lastUpdated: userBalance.lastUpdated,
            timestamp: new Date().toISOString()
        };
    }

    // ============= 3. GET ALL BALANCES (ADMIN) =============
    async getAllBalances() {
        const allBalances = [];
        
        for (const [userId, data] of this.userBalances) {
            allBalances.push({
                userId: userId,
                userName: data.userName,
                balances: data.balances,
                lastUpdated: data.lastUpdated
            });
        }
        
        return {
            success: true,
            total: allBalances.length,
            users: allBalances,
            timestamp: new Date().toISOString()
        };
    }

    // ============= 4. UPDATE BALANCE (WITH LOCK) =============
    async updateBalance(userId, currency, amount, operation, reference, metadata = {}) {
        // Acquire lock to prevent race conditions
        const lockKey = `${userId}_${currency}`;
        if (this.balanceLocks.get(lockKey)) {
            return {
                success: false,
                error: 'Balance update in progress, please try again',
                locked: true
            };
        }
        
        this.balanceLocks.set(lockKey, true);
        
        try {
            const userBalance = this.userBalances.get(userId);
            
            if (!userBalance) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }
            
            const currentBalance = userBalance.balances[currency.toUpperCase()];
            
            if (currentBalance === undefined) {
                return {
                    success: false,
                    error: `Currency ${currency} not supported`
                };
            }
            
            let newBalance;
            let operationType;
            
            switch (operation) {
                case 'credit':
                case 'add':
                    newBalance = currentBalance + amount;
                    operationType = 'credit';
                    break;
                case 'debit':
                case 'subtract':
                    if (currentBalance < amount) {
                        return {
                            success: false,
                            error: 'Insufficient balance',
                            currentBalance: currentBalance,
                            required: amount
                        };
                    }
                    newBalance = currentBalance - amount;
                    operationType = 'debit';
                    break;
                case 'set':
                    newBalance = amount;
                    operationType = 'set';
                    break;
                default:
                    return {
                        success: false,
                        error: 'Invalid operation'
                    };
            }
            
            // Update balance
            const oldBalance = currentBalance;
            userBalance.balances[currency.toUpperCase()] = newBalance;
            userBalance.lastUpdated = new Date().toISOString();
            userBalance.version += 1;
            
            // Record transaction in history
            const transaction = {
                id: uuidv4(),
                userId: userId,
                currency: currency.toUpperCase(),
                operation: operationType,
                oldBalance: oldBalance,
                newBalance: newBalance,
                amount: amount,
                reference: reference,
                metadata: metadata,
                timestamp: new Date().toISOString(),
                version: userBalance.version
            };
            
            this.addToHistory(userId, transaction);
            
            // Notify subscribers of balance change
            this.notifyBalanceChange(userId, currency.toUpperCase(), newBalance, transaction);
            
            return {
                success: true,
                transaction: transaction,
                newBalance: newBalance,
                oldBalance: oldBalance,
                currency: currency.toUpperCase(),
                timestamp: transaction.timestamp
            };
            
        } finally {
            // Release lock
            this.balanceLocks.delete(lockKey);
        }
    }

    // ============= 5. BULK BALANCE UPDATE =============
    async bulkUpdateBalance(updates) {
        const results = [];
        
        for (const update of updates) {
            const result = await this.updateBalance(
                update.userId,
                update.currency,
                update.amount,
                update.operation,
                update.reference,
                update.metadata
            );
            results.push(result);
            
            // Small delay between updates to prevent overwhelming
            await this.sleep(10);
        }
        
        return {
            success: true,
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };
    }

    // ============= 6. TRANSFER BETWEEN USERS =============
    async transferBalance(fromUserId, toUserId, currency, amount, reference, metadata = {}) {
        // Lock both users to prevent race conditions
        const fromLock = `${fromUserId}_${currency}`;
        const toLock = `${toUserId}_${currency}`;
        
        if (this.balanceLocks.get(fromLock) || this.balanceLocks.get(toLock)) {
            return {
                success: false,
                error: 'One or both accounts are busy, please try again'
            };
        }
        
        this.balanceLocks.set(fromLock, true);
        this.balanceLocks.set(toLock, true);
        
        try {
            const fromUser = this.userBalances.get(fromUserId);
            const toUser = this.userBalances.get(toUserId);
            
            if (!fromUser || !toUser) {
                return {
                    success: false,
                    error: 'One or both users not found'
                };
            }
            
            const fromBalance = fromUser.balances[currency.toUpperCase()];
            if (fromBalance < amount) {
                return {
                    success: false,
                    error: 'Insufficient balance',
                    currentBalance: fromBalance,
                    required: amount
                };
            }
            
            // Debit from sender
            const debitResult = await this.updateBalance(
                fromUserId,
                currency,
                amount,
                'debit',
                `Transfer to ${toUserId}: ${reference}`,
                { ...metadata, transferType: 'outgoing' }
            );
            
            if (!debitResult.success) {
                return debitResult;
            }
            
            // Credit to receiver
            const creditResult = await this.updateBalance(
                toUserId,
                currency,
                amount,
                'credit',
                `Transfer from ${fromUserId}: ${reference}`,
                { ...metadata, transferType: 'incoming' }
            );
            
            if (!creditResult.success) {
                // Rollback debit if credit fails
                await this.updateBalance(
                    fromUserId,
                    currency,
                    amount,
                    'credit',
                    `Rollback: ${reference}`,
                    { ...metadata, rollback: true }
                );
                return creditResult;
            }
            
            return {
                success: true,
                transferId: uuidv4(),
                fromUser: fromUserId,
                toUser: toUserId,
                currency: currency.toUpperCase(),
                amount: amount,
                reference: reference,
                fromNewBalance: debitResult.newBalance,
                toNewBalance: creditResult.newBalance,
                timestamp: new Date().toISOString()
            };
            
        } finally {
            this.balanceLocks.delete(fromLock);
            this.balanceLocks.delete(toLock);
        }
    }

    // ============= 7. GET BALANCE HISTORY =============
    async getBalanceHistory(userId, currency = null, limit = 50, startDate = null, endDate = null) {
        const history = this.balanceHistory.get(userId) || [];
        
        let filteredHistory = history;
        
        if (currency) {
            filteredHistory = filteredHistory.filter(t => t.currency === currency.toUpperCase());
        }
        
        if (startDate) {
            filteredHistory = filteredHistory.filter(t => new Date(t.timestamp) >= new Date(startDate));
        }
        
        if (endDate) {
            filteredHistory = filteredHistory.filter(t => new Date(t.timestamp) <= new Date(endDate));
        }
        
        filteredHistory = filteredHistory.slice(-limit).reverse();
        
        return {
            success: true,
            userId: userId,
            total: filteredHistory.length,
            history: filteredHistory,
            summary: this.calculateHistorySummary(filteredHistory)
        };
    }

    // ============= 8. CALCULATE HISTORY SUMMARY =============
    calculateHistorySummary(history) {
        const summary = {
            totalCredits: 0,
            totalDebits: 0,
            netChange: 0,
            byCurrency: {}
        };
        
        history.forEach(transaction => {
            const currency = transaction.currency;
            if (!summary.byCurrency[currency]) {
                summary.byCurrency[currency] = { credits: 0, debits: 0, net: 0 };
            }
            
            if (transaction.operation === 'credit') {
                summary.totalCredits += transaction.amount;
                summary.byCurrency[currency].credits += transaction.amount;
                summary.byCurrency[currency].net += transaction.amount;
            } else if (transaction.operation === 'debit') {
                summary.totalDebits += transaction.amount;
                summary.byCurrency[currency].debits += transaction.amount;
                summary.byCurrency[currency].net -= transaction.amount;
            }
            
            summary.netChange = summary.totalCredits - summary.totalDebits;
        });
        
        return summary;
    }

    // ============= 9. ADD TO HISTORY =============
    addToHistory(userId, transaction) {
        let history = this.balanceHistory.get(userId);
        if (!history) {
            history = [];
            this.balanceHistory.set(userId, history);
        }
        
        history.push(transaction);
        
        // Keep only last 1000 transactions per user
        if (history.length > 1000) {
            this.balanceHistory.set(userId, history.slice(-1000));
        }
    }

    // ============= 10. SUBSCRIBE TO BALANCE UPDATES =============
    subscribeToBalance(userId, callback) {
        let subscribers = this.balanceSubscribers.get(userId);
        if (!subscribers) {
            subscribers = [];
            this.balanceSubscribers.set(userId, subscribers);
        }
        
        const subscriptionId = uuidv4();
        subscribers.push({
            id: subscriptionId,
            callback: callback
        });
        
        // Send initial balance
        this.getBalance(userId).then(balance => {
            if (balance.success) {
                callback({
                    type: 'connected',
                    data: balance,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        return subscriptionId;
    }

    unsubscribeFromBalance(userId, subscriptionId) {
        const subscribers = this.balanceSubscribers.get(userId);
        if (subscribers) {
            const index = subscribers.findIndex(s => s.id === subscriptionId);
            if (index !== -1) {
                subscribers.splice(index, 1);
            }
        }
    }

    notifyBalanceChange(userId, currency, newBalance, transaction) {
        const subscribers = this.balanceSubscribers.get(userId);
        if (subscribers) {
            const notification = {
                type: 'balance_update',
                data: {
                    userId: userId,
                    currency: currency,
                    newBalance: newBalance,
                    transaction: transaction
                },
                timestamp: new Date().toISOString()
            };
            
            subscribers.forEach(subscriber => {
                try {
                    subscriber.callback(notification);
                } catch (error) {
                    console.error('Error notifying subscriber:', error);
                }
            });
        }
    }

    // ============= 11. GET TOTAL NET WORTH =============
    async getTotalNetWorth(userId) {
        const userBalance = this.userBalances.get(userId);
        
        if (!userBalance) {
            return {
                success: false,
                error: 'User not found'
            };
        }
        
        const exchangeRates = await this.getExchangeRates();
        let totalUSD = 0;
        
        for (const [currency, balance] of Object.entries(userBalance.balances)) {
            if (balance > 0) {
                const rate = exchangeRates[`${currency}_USD`] || 1;
                totalUSD += balance * rate;
            }
        }
        
        return {
            success: true,
            userId: userId,
            userName: userBalance.userName,
            totalUSD: totalUSD,
            totalFormatted: `$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            breakdown: userBalance.balances,
            exchangeRates: exchangeRates,
            timestamp: new Date().toISOString()
        };
    }

    // ============= 12. GET EXCHANGE RATES =============
    async getExchangeRates() {
        // In production, call a real API like OpenExchangeRates
        return {
            USD_USD: 1,
            EUR_USD: 1.09,
            GBP_USD: 1.27,
            CHF_USD: 1.12,
            JPY_USD: 0.0067,
            BTC_USD: 67200,
            ETH_USD: 3443,
            BRADICOIN_USD: 10.42,
            SOL_USD: 98.07,
            USDT_USD: 1,
            BNB_USD: 312.50,
            LTC_USD: 82.50
        };
    }

    // ============= 13. FROZEN / UNFREEZE BALANCE =============
    async freezeBalance(userId, reason, frozenBy) {
        const userBalance = this.userBalances.get(userId);
        
        if (!userBalance) {
            return {
                success: false,
                error: 'User not found'
            };
        }
        
        userBalance.frozen = true;
        userBalance.frozenReason = reason;
        userBalance.frozenBy = frozenBy;
        userBalance.frozenAt = new Date().toISOString();
        
        this.notifyBalanceChange(userId, 'ALL', null, {
            type: 'account_frozen',
            reason: reason
        });
        
        return {
            success: true,
            message: `Balance frozen for user ${userId}`,
            reason: reason,
            frozenAt: userBalance.frozenAt
        };
    }

    async unfreezeBalance(userId, unfrozenBy) {
        const userBalance = this.userBalances.get(userId);
        
        if (!userBalance) {
            return {
                success: false,
                error: 'User not found'
            };
        }
        
        userBalance.frozen = false;
        userBalance.frozenReason = null;
        userBalance.unfrozenBy = unfrozenBy;
        userBalance.unfrozenAt = new Date().toISOString();
        
        this.notifyBalanceChange(userId, 'ALL', null, {
            type: 'account_unfrozen'
        });
        
        return {
            success: true,
            message: `Balance unfrozen for user ${userId}`,
            unfrozenAt: userBalance.unfrozenAt
        };
    }

    // ============= 14. GET BALANCE SNAPSHOT =============
    async getBalanceSnapshot(userId) {
        const userBalance = this.userBalances.get(userId);
        
        if (!userBalance) {
            return {
                success: false,
                error: 'User not found'
            };
        }
        
        const netWorth = await this.getTotalNetWorth(userId);
        
        return {
            success: true,
            userId: userId,
            userName: userBalance.userName,
            snapshot: {
                current: userBalance.balances,
                netWorth: netWorth.totalUSD,
                lastUpdated: userBalance.lastUpdated,
                version: userBalance.version,
                isFrozen: userBalance.frozen || false,
                frozenReason: userBalance.frozenReason || null
            },
            timestamp: new Date().toISOString()
        };
    }

    // ============= 15. COMPARE BALANCES (BEFORE/AFTER) =============
    async compareBalances(userId, transactionId) {
        const history = this.balanceHistory.get(userId) || [];
        const transaction = history.find(t => t.id === transactionId);
        
        if (!transaction) {
            return {
                success: false,
                error: 'Transaction not found'
            };
        }
        
        return {
            success: true,
            transaction: transaction,
            before: transaction.oldBalance,
            after: transaction.newBalance,
            difference: transaction.newBalance - transaction.oldBalance,
            currency: transaction.currency
        };
    }

    // ============= 16. ADMIN: SET BALANCE =============
    async adminSetBalance(userId, currency, newBalance, adminId, reason) {
        const userBalance = this.userBalances.get(userId);
        
        if (!userBalance) {
            return {
                success: false,
                error: 'User not found'
            };
        }
        
        const oldBalance = userBalance.balances[currency.toUpperCase()];
        const amount = Math.abs(newBalance - oldBalance);
        const operation = newBalance > oldBalance ? 'credit' : 'debit';
        
        const result = await this.updateBalance(
            userId,
            currency,
            amount,
            operation,
            `Admin adjustment: ${reason}`,
            { adminId: adminId, reason: reason, isAdminAction: true }
        );
        
        return {
            success: result.success,
            adminId: adminId,
            userId: userId,
            currency: currency,
            oldBalance: oldBalance,
            newBalance: newBalance,
            reason: reason,
            timestamp: new Date().toISOString()
        };
    }

    // ============= 17. GET BALANCE TRENDS =============
    async getBalanceTrends(userId, currency, period = '7d') {
        const history = this.balanceHistory.get(userId) || [];
        const filtered = history.filter(t => t.currency === currency.toUpperCase());
        
        const periods = {
            '24h': 24,
            '7d': 168,
            '30d': 720,
            '90d': 2160
        };
        
        const hours = periods[period] || 168;
        const now = new Date();
        const trendData = [];
        
        for (let i = hours; i >= 0; i -= 4) {
            const time = new Date(now - i * 60 * 60 * 1000);
            const transactionsInWindow = filtered.filter(t => 
                new Date(t.timestamp) >= time && new Date(t.timestamp) < new Date(time.getTime() + 4 * 60 * 60 * 1000)
            );
            
            const lastTransaction = transactionsInWindow[transactionsInWindow.length - 1];
            trendData.push({
                time: time.toISOString(),
                balance: lastTransaction ? lastTransaction.newBalance : null,
                transactions: transactionsInWindow.length,
                volume: transactionsInWindow.reduce((sum, t) => sum + t.amount, 0)
            });
        }
        
        return {
            success: true,
            userId: userId,
            currency: currency.toUpperCase(),
            period: period,
            trend: trendData,
            currentBalance: (this.userBalances.get(userId)?.balances[currency.toUpperCase()]) || 0
        };
    }

    // ============= 18. VALIDATE BALANCE CONSISTENCY =============
    async validateBalanceConsistency(userId) {
        const userBalance = this.userBalances.get(userId);
        const history = this.balanceHistory.get(userId) || [];
        
        if (!userBalance) {
            return {
                success: false,
                error: 'User not found'
            };
        }
        
        const inconsistencies = [];
        
        // Reconstruct balance from history
        for (const [currency, currentBalance] of Object.entries(userBalance.balances)) {
            let reconstructedBalance = 0;
            const currencyHistory = history.filter(t => t.currency === currency);
            
            for (const transaction of currencyHistory) {
                if (transaction.operation === 'credit') {
                    reconstructedBalance += transaction.amount;
                } else if (transaction.operation === 'debit') {
                    reconstructedBalance -= transaction.amount;
                }
            }
            
            // Add initial balance (first transaction's oldBalance)
            if (currencyHistory.length > 0) {
                const firstTransaction = currencyHistory[0];
                reconstructedBalance = firstTransaction.oldBalance + 
                    (firstTransaction.operation === 'credit' ? firstTransaction.amount : -firstTransaction.amount);
            }
            
            if (Math.abs(reconstructedBalance - currentBalance) > 0.01) {
                inconsistencies.push({
                    currency: currency,
                    currentBalance: currentBalance,
                    reconstructedBalance: reconstructedBalance,
                    difference: currentBalance - reconstructedBalance
                });
            }
        }
        
        return {
            success: true,
            userId: userId,
            isConsistent: inconsistencies.length === 0,
            inconsistencies: inconsistencies,
            totalHistoryEntries: history.length
        };
    }

    // ============= HELPER FUNCTIONS =============
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new RealtimeBalanceService();
