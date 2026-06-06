/**
 * ZENTRONIX BANK - COMPLETE TRANSACTION MONITORING SYSTEM
 * Real-time transaction tracking, analytics, and fraud detection
 * Version: 1.0.0
 * Language: JavaScript (Node.js)
 * 
 * Features:
 * - Real-time transaction tracking and logging
 * - Multi-currency transaction support (USD, EUR, GBP, BRL, BTC, ETH, BRD)
 * - Transaction categorization and tagging
 * - Spending patterns and analytics
 * - Budget tracking and alerts
 * - Merchant categorization
 * - Recurring transaction detection
 * - Anomaly detection algorithms
 * - Transaction search and filtering
 * - Export capabilities (CSV, PDF, JSON)
 * - Custom transaction notes and receipts
 * - Real-time balance updates
 * - Subscription/ recurring bill detection
 * - Cash flow analytics
 * - Category-based spending limits
 * - Multi-account aggregation
 * - Scheduled reports
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ========================================
// CONFIGURATION
// ========================================

const MONITORING_CONFIG = {
    // Transaction types
    TRANSACTION_TYPES: {
        DEPOSIT: 'DEPOSIT',
        WITHDRAWAL: 'WITHDRAWAL',
        TRANSFER: 'TRANSFER',
        PAYMENT: 'PAYMENT',
        CONVERSION: 'CONVERSION',
        FEE: 'FEE',
        INTEREST: 'INTEREST',
        REFUND: 'REFUND',
        CHARGEBACK: 'CHARGEBACK'
    },
    
    // Transaction statuses
    TRANSACTION_STATUS: {
        PENDING: 'PENDING',
        PROCESSING: 'PROCESSING',
        COMPLETED: 'COMPLETED',
        FAILED: 'FAILED',
        CANCELLED: 'CANCELLED',
        REVERSED: 'REVERSED',
        FLAGGED: 'FLAGGED'
    },
    
    // Transaction categories
    CATEGORIES: {
        // Income categories
        INCOME: {
            SALARY: 'SALARY',
            FREELANCE: 'FREELANCE',
            INVESTMENT: 'INVESTMENT',
            GIFT: 'GIFT',
            REFUND: 'REFUND',
            OTHER_INCOME: 'OTHER_INCOME'
        },
        // Expense categories
        EXPENSES: {
            HOUSING: 'HOUSING', // Rent, mortgage
            UTILITIES: 'UTILITIES', // Electricity, water, internet
            FOOD: 'FOOD', // Groceries, dining
            TRANSPORTATION: 'TRANSPORTATION', // Gas, public transit
            HEALTHCARE: 'HEALTHCARE', // Medical, dental, insurance
            ENTERTAINMENT: 'ENTERTAINMENT', // Movies, games, subscriptions
            SHOPPING: 'SHOPPING', // Retail, online purchases
            EDUCATION: 'EDUCATION', // Tuition, courses
            TRAVEL: 'TRAVEL', // Flights, hotels, vacation
            BUSINESS: 'BUSINESS', // Business expenses
            CRYPTO: 'CRYPTO', // Crypto purchases
            OTHER: 'OTHER_EXPENSE'
        },
        // Transfer categories
        TRANSFERS: {
            INTERNAL: 'INTERNAL_TRANSFER',
            EXTERNAL: 'EXTERNAL_TRANSFER',
            CRYPTO_SEND: 'CRYPTO_SEND',
            CRYPTO_RECEIVE: 'CRYPTO_RECEIVE'
        }
    },
    
    // Supported currencies
    SUPPORTED_CURRENCIES: {
        USD: { name: 'US Dollar', symbol: '$', type: 'fiat' },
        EUR: { name: 'Euro', symbol: '€', type: 'fiat' },
        GBP: { name: 'British Pound', symbol: '£', type: 'fiat' },
        BRL: { name: 'Brazilian Real', symbol: 'R$', type: 'fiat' },
        BTC: { name: 'Bitcoin', symbol: '₿', type: 'crypto' },
        ETH: { name: 'Ethereum', symbol: 'Ξ', type: 'crypto' },
        USDT: { name: 'Tether', symbol: '₮', type: 'crypto' },
        BRD: { name: 'Bradicoin', symbol: 'BRD', type: 'crypto', priceUSD: 10.00 }
    },
    
    // Alert thresholds
    ALERT_THRESHOLDS: {
        HIGH_SPEND_ALERT: 5000, // Alert for transactions over $5000
        BUDGET_EXCEEDED: 80, // Alert at 80% of budget
        FREQUENT_TRANSACTIONS: 10, // Alert for 10+ transactions per hour
        UNUSUAL_HOURS: [0, 1, 2, 3, 4, 5], // Alert for transactions at night
        RAPID_SUCCESSIVE_MINUTES: 5 // Same category, multiple transactions
    },
    
    // Budget reset periods
    BUDGET_PERIODS: {
        DAILY: 'DAILY',
        WEEKLY: 'WEEKLY',
        MONTHLY: 'MONTHLY',
        YEARLY: 'YEARLY'
    },
    
    // Export formats
    EXPORT_FORMATS: ['CSV', 'JSON', 'PDF'],
    
    // Pagination defaults
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 200
};

// ========================================
// DATA MODELS
// ========================================

class Transaction {
    constructor(data) {
        this.transactionId = data.transactionId || this.generateTransactionId();
        this.customerId = data.customerId;
        this.accountId = data.accountId;
        this.type = data.type;
        this.status = data.status || MONITORING_CONFIG.TRANSACTION_STATUS.PENDING;
        this.amount = data.amount;
        this.currency = data.currency;
        this.amountUSD = this.calculateUSDEquivalent(data.amount, data.currency);
        this.category = data.category || this.autoCategorize(data);
        this.subcategory = data.subcategory || null;
        this.description = data.description || '';
        this.merchant = data.merchant || null;
        this.merchantCategory = data.merchantCategory || null;
        this.counterpartyId = data.counterpartyId || null;
        this.counterpartyName = data.counterpartyName || null;
        this.tags = data.tags || [];
        this.notes = data.notes || null;
        this.receiptUrl = data.receiptUrl || null;
        this.location = data.location || null;
        this.ipAddress = data.ipAddress || null;
        this.deviceId = data.deviceId || null;
        this.metadata = data.metadata || {};
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
        this.processedAt = data.processedAt || null;
    }
    
    generateTransactionId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `TXN-${timestamp}-${random}`;
    }
    
    calculateUSDEquivalent(amount, currency) {
        if (currency === 'USD') return amount;
        
        const rates = {
            EUR: 1.09, GBP: 1.27, BRL: 0.20,
            BTC: 65000, ETH: 3500, USDT: 1, BRD: 10.00
        };
        
        const rate = rates[currency] || 1;
        return amount * rate;
    }
    
    autoCategorize(data) {
        const desc = (data.description || '').toLowerCase();
        const merchant = (data.merchant || '').toLowerCase();
        
        // Income detection
        if (data.type === MONITORING_CONFIG.TRANSACTION_TYPES.DEPOSIT) {
            if (desc.includes('salary') || desc.includes('payroll')) {
                return MONITORING_CONFIG.CATEGORIES.INCOME.SALARY;
            }
            if (desc.includes('freelance') || desc.includes('contract')) {
                return MONITORING_CONFIG.CATEGORIES.INCOME.FREELANCE;
            }
            return MONITORING_CONFIG.CATEGORIES.INCOME.OTHER_INCOME;
        }
        
        // Expense categorization by merchant
        const merchantMap = {
            'amazon': MONITORING_CONFIG.CATEGORIES.EXPENSES.SHOPPING,
            'walmart': MONITORING_CONFIG.CATEGORIES.EXPENSES.SHOPPING,
            'target': MONITORING_CONFIG.CATEGORIES.EXPENSES.SHOPPING,
            'uber': MONITORING_CONFIG.CATEGORIES.EXPENSES.TRANSPORTATION,
            'lyft': MONITORING_CONFIG.CATEGORIES.EXPENSES.TRANSPORTATION,
            'starbucks': MONITORING_CONFIG.CATEGORIES.EXPENSES.FOOD,
            'mcdonalds': MONITORING_CONFIG.CATEGORIES.EXPENSES.FOOD,
            'netflix': MONITORING_CONFIG.CATEGORIES.EXPENSES.ENTERTAINMENT,
            'spotify': MONITORING_CONFIG.CATEGORIES.EXPENSES.ENTERTAINMENT,
            'airbnb': MONITORING_CONFIG.CATEGORIES.EXPENSES.TRAVEL,
            'expedia': MONITORING_CONFIG.CATEGORIES.EXPENSES.TRAVEL,
            'binance': MONITORING_CONFIG.CATEGORIES.EXPENSES.CRYPTO,
            'coinbase': MONITORING_CONFIG.CATEGORIES.EXPENSES.CRYPTO
        };
        
        for (const [key, category] of Object.entries(merchantMap)) {
            if (merchant.includes(key) || desc.includes(key)) {
                return category;
            }
        }
        
        // Crypto transactions
        if (data.currency === 'BTC' || data.currency === 'ETH' || data.currency === 'BRD') {
            return MONITORING_CONFIG.CATEGORIES.EXPENSES.CRYPTO;
        }
        
        return MONITORING_CONFIG.CATEGORIES.EXPENSES.OTHER;
    }
}

class Budget {
    constructor(data) {
        this.budgetId = data.budgetId || this.generateBudgetId();
        this.customerId = data.customerId;
        this.category = data.category;
        this.amount = data.amount;
        this.currency = data.currency || 'USD';
        this.period = data.period || MONITORING_CONFIG.BUDGET_PERIODS.MONTHLY;
        this.startDate = data.startDate || new Date();
        this.endDate = data.endDate || null;
        this.spent = data.spent || 0;
        this.notifyWhen = data.notifyWhen || 80; // percentage
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }
    
    generateBudgetId() {
        return `BDG-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    getRemaining() {
        return this.amount - this.spent;
    }
    
    getPercentageUsed() {
        return (this.spent / this.amount) * 100;
    }
    
    isExceeded() {
        return this.spent >= this.amount;
    }
    
    shouldNotify() {
        return this.getPercentageUsed() >= this.notifyWhen && !this.isExceeded();
    }
}

class SpendingAlert {
    constructor(data) {
        this.alertId = data.alertId || this.generateAlertId();
        this.customerId = data.customerId;
        this.type = data.type;
        this.severity = data.severity; // INFO, WARNING, CRITICAL
        this.message = data.message;
        this.transactionId = data.transactionId || null;
        this.category = data.category || null;
        this.amount = data.amount || null;
        this.threshold = data.threshold || null;
        this.isRead = data.isRead || false;
        this.createdAt = data.createdAt || new Date();
        this.resolvedAt = data.resolvedAt || null;
    }
    
    generateAlertId() {
        return `ALT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

// ========================================
// TRANSACTION MONITORING ENGINE
// ========================================

class TransactionMonitoringEngine extends EventEmitter {
    constructor() {
        super();
        this.transactions = new Map();
        this.budgets = new Map();
        this.alerts = new Map();
        this.recurringPatterns = new Map();
        this.dailyStats = new Map();
        this.monitoringInterval = null;
    }
    
    async initialize() {
        // Start real-time monitoring
        this.monitoringInterval = setInterval(() => this.processMonitoring(), 60000);
        console.log('[TransactionMonitoring] Engine initialized');
        return this;
    }
    
    async recordTransaction(transactionData) {
        const transaction = new Transaction(transactionData);
        
        // Store transaction
        this.transactions.set(transaction.transactionId, transaction);
        
        // Update budgets
        await this.updateBudgets(transaction);
        
        // Check for alerts
        const alerts = await this.checkForAlerts(transaction);
        
        // Detect recurring patterns
        await this.detectRecurringPatterns(transaction);
        
        // Update daily statistics
        await this.updateDailyStats(transaction);
        
        // Emit event for real-time listeners
        this.emit('transaction_recorded', transaction);
        
        return {
            transaction,
            alerts,
            budgetUpdates: alerts.filter(a => a.type === 'BUDGET_ALERT')
        };
    }
    
    async updateBudgets(transaction) {
        // Only track expense transactions
        if (transaction.type !== MONITORING_CONFIG.TRANSACTION_TYPES.WITHDRAWAL &&
            transaction.type !== MONITORING_CONFIG.TRANSACTION_TYPES.PAYMENT) {
            return;
        }
        
        const activeBudgets = Array.from(this.budgets.values())
            .filter(b => b.customerId === transaction.customerId && b.isActive);
        
        for (const budget of activeBudgets) {
            // Check if transaction matches budget category
            if (budget.category === transaction.category ||
                (budget.category === 'ALL' && transaction.category)) {
                
                // Check budget period
                const inPeriod = this.isInBudgetPeriod(transaction.createdAt, budget);
                
                if (inPeriod) {
                    budget.spent += transaction.amountUSD;
                    budget.updatedAt = new Date();
                    this.budgets.set(budget.budgetId, budget);
                    
                    // Check if budget alert needed
                    if (budget.shouldNotify()) {
                        const alert = new SpendingAlert({
                            customerId: transaction.customerId,
                            type: 'BUDGET_ALERT',
                            severity: budget.isExceeded() ? 'CRITICAL' : 'WARNING',
                            message: `Budget for ${budget.category} is at ${budget.getPercentageUsed().toFixed(1)}% (${budget.spent}/${budget.amount})`,
                            category: budget.category,
                            amount: budget.spent,
                            threshold: budget.amount
                        });
                        this.alerts.set(alert.alertId, alert);
                        this.emit('alert_generated', alert);
                    }
                }
            }
        }
    }
    
    isInBudgetPeriod(date, budget) {
        const transactionDate = new Date(date);
        const budgetStart = new Date(budget.startDate);
        
        switch (budget.period) {
            case MONITORING_CONFIG.BUDGET_PERIODS.DAILY:
                return transactionDate.toDateString() === budgetStart.toDateString();
                
            case MONITORING_CONFIG.BUDGET_PERIODS.WEEKLY:
                const weekStart = new Date(budgetStart);
                weekStart.setDate(budgetStart.getDate() - budgetStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return transactionDate >= weekStart && transactionDate <= weekEnd;
                
            case MONITORING_CONFIG.BUDGET_PERIODS.MONTHLY:
                return transactionDate.getMonth() === budgetStart.getMonth() &&
                       transactionDate.getFullYear() === budgetStart.getFullYear();
                
            case MONITORING_CONFIG.BUDGET_PERIODS.YEARLY:
                return transactionDate.getFullYear() === budgetStart.getFullYear();
                
            default:
                return true;
        }
    }
    
    async checkForAlerts(transaction) {
        const alerts = [];
        
        // Alert 1: High amount transaction
        if (transaction.amountUSD >= MONITORING_CONFIG.ALERT_THRESHOLDS.HIGH_SPEND_ALERT) {
            const alert = new SpendingAlert({
                customerId: transaction.customerId,
                type: 'HIGH_SPEND_ALERT',
                severity: 'WARNING',
                message: `High value transaction: ${transaction.amount} ${transaction.currency} at ${transaction.merchant || 'unknown merchant'}`,
                transactionId: transaction.transactionId,
                amount: transaction.amountUSD,
                threshold: MONITORING_CONFIG.ALERT_THRESHOLDS.HIGH_SPEND_ALERT
            });
            alerts.push(alert);
            this.alerts.set(alert.alertId, alert);
            this.emit('alert_generated', alert);
        }
        
        // Alert 2: Unusual hour transaction
        const hour = new Date(transaction.createdAt).getHours();
        if (MONITORING_CONFIG.ALERT_THRESHOLDS.UNUSUAL_HOURS.includes(hour)) {
            const alert = new SpendingAlert({
                customerId: transaction.customerId,
                type: 'UNUSUAL_HOUR_ALERT',
                severity: 'INFO',
                message: `Transaction at unusual hour (${hour}:00): ${transaction.amount} ${transaction.currency}`,
                transactionId: transaction.transactionId
            });
            alerts.push(alert);
            this.alerts.set(alert.alertId, alert);
        }
        
        // Alert 3: Rapid successive transactions
        const recentTransactions = await this.getCustomerTransactions(
            transaction.customerId, 
            new Date(Date.now() - 5 * 60000), // Last 5 minutes
            null
        );
        
        const sameCategoryCount = recentTransactions.filter(t => 
            t.category === transaction.category && 
            t.transactionId !== transaction.transactionId
        ).length;
        
        if (sameCategoryCount >= MONITORING_CONFIG.ALERT_THRESHOLDS.RAPID_SUCCESSIVE_MINUTES) {
            const alert = new SpendingAlert({
                customerId: transaction.customerId,
                type: 'RAPID_TRANSACTIONS_ALERT',
                severity: 'WARNING',
                message: `${sameCategoryCount + 1} transactions in ${transaction.category} category within 5 minutes`,
                transactionId: transaction.transactionId,
                category: transaction.category
            });
            alerts.push(alert);
            this.alerts.set(alert.alertId, alert);
            this.emit('alert_generated', alert);
        }
        
        return alerts;
    }
    
    async detectRecurringPatterns(transaction) {
        const key = `${transaction.customerId}_${transaction.merchant || transaction.category}`;
        const history = await this.getCustomerTransactions(transaction.customerId, null, 100);
        
        // Filter similar transactions (same merchant or category, similar amount)
        const similarTransactions = history.filter(t =>
            (t.merchant === transaction.merchant || t.category === transaction.category) &&
            Math.abs(t.amountUSD - transaction.amountUSD) / transaction.amountUSD < 0.1 && // Within 10%
            t.transactionId !== transaction.transactionId
        );
        
        if (similarTransactions.length >= 3) {
            // Check if they occur at regular intervals
            const intervals = [];
            for (let i = 1; i < similarTransactions.length; i++) {
                const diff = new Date(similarTransactions[i-1].createdAt) - new Date(similarTransactions[i].createdAt);
                intervals.push(Math.abs(diff));
            }
            
            const averageInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.map(i => Math.abs(i - averageInterval)).reduce((a, b) => a + b, 0) / intervals.length;
            
            // If low variance, likely recurring
            if (variance / averageInterval < 0.2) { // 20% variance threshold
                const pattern = {
                    patternId: `RPT-${transaction.customerId}-${transaction.merchant || transaction.category}`,
                    customerId: transaction.customerId,
                    merchant: transaction.merchant,
                    category: transaction.category,
                    averageAmount: similarTransactions.reduce((sum, t) => sum + t.amountUSD, 0) / similarTransactions.length,
                    frequencyMs: averageInterval,
                    lastDetected: new Date(),
                    occurrences: similarTransactions.length + 1
                };
                
                this.recurringPatterns.set(pattern.patternId, pattern);
                this.emit('recurring_pattern_detected', pattern);
            }
        }
    }
    
    async updateDailyStats(transaction) {
        const dateKey = new Date().toISOString().split('T')[0];
        let stats = this.dailyStats.get(dateKey);
        
        if (!stats) {
            stats = {
                date: dateKey,
                totalTransactions: 0,
                totalVolumeUSD: 0,
                byType: {},
                byCategory: {},
                uniqueCustomers: new Set()
            };
        }
        
        stats.totalTransactions++;
        stats.totalVolumeUSD += transaction.amountUSD;
        stats.byType[transaction.type] = (stats.byType[transaction.type] || 0) + 1;
        stats.byCategory[transaction.category] = (stats.byCategory[transaction.category] || 0) + transaction.amountUSD;
        stats.uniqueCustomers.add(transaction.customerId);
        
        this.dailyStats.set(dateKey, stats);
    }
    
    async createBudget(budgetData) {
        const budget = new Budget(budgetData);
        this.budgets.set(budget.budgetId, budget);
        this.emit('budget_created', budget);
        return budget;
    }
    
    async updateBudget(budgetId, updates) {
        const budget = this.budgets.get(budgetId);
        if (!budget) throw new Error('Budget not found');
        
        Object.assign(budget, updates);
        budget.updatedAt = new Date();
        this.budgets.set(budgetId, budget);
        
        this.emit('budget_updated', budget);
        return budget;
    }
    
    async deleteBudget(budgetId) {
        const budget = this.budgets.get(budgetId);
        if (!budget) throw new Error('Budget not found');
        
        budget.isActive = false;
        this.budgets.set(budgetId, budget);
        
        this.emit('budget_deleted', budget);
        return { success: true, budgetId };
    }
    
    async getTransaction(transactionId) {
        return this.transactions.get(transactionId) || null;
    }
    
    async getCustomerTransactions(customerId, startDate = null, endDate = null, limit = 100, offset = 0) {
        let filtered = Array.from(this.transactions.values())
            .filter(t => t.customerId === customerId);
        
        if (startDate) {
            filtered = filtered.filter(t => new Date(t.createdAt) >= startDate);
        }
        if (endDate) {
            filtered = filtered.filter(t => new Date(t.createdAt) <= endDate);
        }
        
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        
        return filtered.slice(offset, offset + limit);
    }
    
    async getTransactionSummary(customerId, startDate, endDate) {
        const transactions = await this.getCustomerTransactions(customerId, startDate, endDate, 10000);
        
        const summary = {
            customerId,
            period: { startDate, endDate },
            totalTransactions: transactions.length,
            totalIncome: 0,
            totalExpenses: 0,
            netCashflow: 0,
            byCategory: {},
            byType: {},
            dailyAverage: 0,
            largestTransaction: null,
            topMerchants: {},
            cryptoTransactions: 0,
            cryptoVolume: 0
        };
        
        for (const tx of transactions) {
            if (tx.type === MONITORING_CONFIG.TRANSACTION_TYPES.DEPOSIT ||
                tx.type === MONITORING_CONFIG.TRANSACTION_TYPES.REFUND) {
                summary.totalIncome += tx.amountUSD;
            } else if (tx.type === MONITORING_CONFIG.TRANSACTION_TYPES.WITHDRAWAL ||
                       tx.type === MONITORING_CONFIG.TRANSACTION_TYPES.PAYMENT) {
                summary.totalExpenses += tx.amountUSD;
            }
            
            // By category
            summary.byCategory[tx.category] = (summary.byCategory[tx.category] || 0) + tx.amountUSD;
            
            // By type
            summary.byType[tx.type] = (summary.byType[tx.type] || 0) + 1;
            
            // Largest transaction
            if (!summary.largestTransaction || tx.amountUSD > summary.largestTransaction.amount) {
                summary.largestTransaction = {
                    transactionId: tx.transactionId,
                    amount: tx.amount,
                    currency: tx.currency,
                    description: tx.description,
                    date: tx.createdAt
                };
            }
            
            // Top merchants
            if (tx.merchant) {
                summary.topMerchants[tx.merchant] = (summary.topMerchants[tx.merchant] || 0) + tx.amountUSD;
            }
            
            // Crypto tracking
            if (tx.currency === 'BTC' || tx.currency === 'ETH' || tx.currency === 'BRD' || tx.currency === 'USDT') {
                summary.cryptoTransactions++;
                summary.cryptoVolume += tx.amountUSD;
            }
        }
        
        summary.netCashflow = summary.totalIncome - summary.totalExpenses;
        const daysDiff = Math.max(1, (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
        summary.dailyAverage = summary.totalExpenses / daysDiff;
        
        // Sort top merchants
        summary.topMerchants = Object.entries(summary.topMerchants)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
        
        return summary;
    }
    
    async getSpendingByCategory(customerId, period = 'MONTHLY') {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'MONTHLY':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'WEEKLY':
                startDate = new Date(now.setDate(now.getDate() - now.getDay()));
                break;
            case 'YEARLY':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        const transactions = await this.getCustomerTransactions(customerId, startDate, now, 10000);
        
        const spending = {};
        for (const tx of transactions) {
            if (tx.type === MONITORING_CONFIG.TRANSACTION_TYPES.WITHDRAWAL ||
                tx.type === MONITORING_CONFIG.TRANSACTION_TYPES.PAYMENT) {
                spending[tx.category] = (spending[tx.category] || 0) + tx.amountUSD;
            }
        }
        
        return {
            period,
            startDate,
            endDate: now,
            totalSpending: Object.values(spending).reduce((a, b) => a + b, 0),
            spending,
            budgetStatus: await this.getBudgetStatus(customerId)
        };
    }
    
    async getBudgetStatus(customerId) {
        const customerBudgets = Array.from(this.budgets.values())
            .filter(b => b.customerId === customerId && b.isActive);
        
        const status = [];
        for (const budget of customerBudgets) {
            status.push({
                budgetId: budget.budgetId,
                category: budget.category,
                allocated: budget.amount,
                spent: budget.spent,
                remaining: budget.getRemaining(),
                percentageUsed: budget.getPercentageUsed(),
                isExceeded: budget.isExceeded(),
                period: budget.period
            });
        }
        
        return status;
    }
    
    async getAlerts(customerId, isRead = false, limit = 50) {
        let alerts = Array.from(this.alerts.values())
            .filter(a => a.customerId === customerId);
        
        if (isRead !== undefined) {
            alerts = alerts.filter(a => a.isRead === isRead);
        }
        
        return alerts.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    }
    
    async markAlertRead(alertId) {
        const alert = this.alerts.get(alertId);
        if (!alert) throw new Error('Alert not found');
        
        alert.isRead = true;
        alert.resolvedAt = new Date();
        this.alerts.set(alertId, alert);
        
        return alert;
    }
    
    async searchTransactions(customerId, filters) {
        let transactions = Array.from(this.transactions.values())
            .filter(t => t.customerId === customerId);
        
        // Apply filters
        if (filters.startDate) {
            transactions = transactions.filter(t => new Date(t.createdAt) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            transactions = transactions.filter(t => new Date(t.createdAt) <= new Date(filters.endDate));
        }
        if (filters.category) {
            transactions = transactions.filter(t => t.category === filters.category);
        }
        if (filters.type) {
            transactions = transactions.filter(t => t.type === filters.type);
        }
        if (filters.minAmount) {
            transactions = transactions.filter(t => t.amountUSD >= filters.minAmount);
        }
        if (filters.maxAmount) {
            transactions = transactions.filter(t => t.amountUSD <= filters.maxAmount);
        }
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            transactions = transactions.filter(t => 
                t.description?.toLowerCase().includes(term) ||
                t.merchant?.toLowerCase().includes(term) ||
                t.transactionId.toLowerCase().includes(term)
            );
        }
        
        const page = filters.page || 1;
        const pageSize = filters.pageSize || MONITORING_CONFIG.DEFAULT_PAGE_SIZE;
        const start = (page - 1) * pageSize;
        const paginated = transactions.slice(start, start + pageSize);
        
        return {
            transactions: paginated,
            total: transactions.length,
            page,
            pageSize,
            totalPages: Math.ceil(transactions.length / pageSize)
        };
    }
    
    async exportTransactions(customerId, format, filters = {}) {
        const searchResult = await this.searchTransactions(customerId, filters);
        const transactions = searchResult.transactions;
        
        switch (format.toUpperCase()) {
            case 'CSV':
                return this.exportToCSV(transactions);
            case 'JSON':
                return JSON.stringify(transactions, null, 2);
            case 'PDF':
                return this.exportToPDF(transactions);
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
    }
    
    exportToCSV(transactions) {
        const headers = ['Transaction ID', 'Date', 'Type', 'Amount', 'Currency', 'Category', 'Description', 'Merchant', 'Status'];
        const rows = transactions.map(t => [
            t.transactionId,
            t.createdAt.toISOString(),
            t.type,
            t.amount,
            t.currency,
            t.category,
            t.description || '',
            t.merchant || '',
            t.status
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        
        return csvContent;
    }
    
    exportToPDF(transactions) {
        // In production, use a PDF library like pdfkit
        const summary = {
            totalTransactions: transactions.length,
            totalAmount: transactions.reduce((sum, t) => sum + t.amountUSD, 0),
            dateRange: {
                from: transactions[0]?.createdAt,
                to: transactions[transactions.length - 1]?.createdAt
            }
        };
        
        return {
            summary,
            transactions: transactions.map(t => ({
                id: t.transactionId,
                date: t.createdAt,
                amount: `${t.amount} ${t.currency}`,
                description: t.description,
                category: t.category
            }))
        };
    }
    
    async getDashboardStats() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const todayTransactions = Array.from(this.transactions.values())
            .filter(t => new Date(t.createdAt) >= today);
        
        const monthTransactions = Array.from(this.transactions.values())
            .filter(t => new Date(t.createdAt) >= thisMonth);
        
        const uniqueCustomers = new Set(Array.from(this.transactions.values()).map(t => t.customerId));
        
        return {
            today: {
                transactions: todayTransactions.length,
                volume: todayTransactions.reduce((sum, t) => sum + t.amountUSD, 0)
            },
            thisMonth: {
                transactions: monthTransactions.length,
                volume: monthTransactions.reduce((sum, t) => sum + t.amountUSD, 0)
            },
            alerts: {
                total: this.alerts.size,
                unread: Array.from(this.alerts.values()).filter(a => !a.isRead).length,
                critical: Array.from(this.alerts.values()).filter(a => a.severity === 'CRITICAL').length
            },
            budgets: {
                active: Array.from(this.budgets.values()).filter(b => b.isActive).length,
                exceeded: Array.from(this.budgets.values()).filter(b => b.isExceeded()).length
            },
            uniqueCustomers: uniqueCustomers.size,
            recurringPatterns: this.recurringPatterns.size,
            lastUpdated: new Date().toISOString()
        };
    }
    
    async processMonitoring() {
        const stats = await this.getDashboardStats();
        this.emit('monitoring_update', stats);
        
        // Check for critical alerts that need immediate attention
        const criticalAlerts = Array.from(this.alerts.values())
            .filter(a => a.severity === 'CRITICAL' && !a.isRead);
        
        if (criticalAlerts.length > 0) {
            this.emit('critical_alerts_detected', criticalAlerts);
        }
    }
    
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
    }
}

// ========================================
// EXPRESS ROUTES
// ========================================

function createMonitoringRouter(monitoringEngine) {
    const express = require('express');
    const router = express.Router();
    
    // Record a transaction
    router.post('/transaction', async (req, res) => {
        try {
            const result = await monitoringEngine.recordTransaction(req.body);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Get transaction by ID
    router.get('/transaction/:transactionId', async (req, res) => {
        const transaction = await monitoringEngine.getTransaction(req.params.transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json(transaction);
    });
    
    // Get customer transactions
    router.get('/transactions/:customerId', async (req, res) => {
        const { startDate, endDate, limit, offset } = req.query;
        const transactions = await monitoringEngine.getCustomerTransactions(
            req.params.customerId,
            startDate ? new Date(startDate) : null,
            endDate ? new Date(endDate) : null,
            parseInt(limit) || 100,
            parseInt(offset) || 0
        );
        res.json(transactions);
    });
    
    // Get transaction summary
    router.get('/summary/:customerId', async (req, res) => {
        const { startDate, endDate } = req.query;
        const summary = await monitoringEngine.getTransactionSummary(
            req.params.customerId,
            startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate ? new Date(endDate) : new Date()
        );
        res.json(summary);
    });
    
    // Get spending by category
    router.get('/spending/:customerId', async (req, res) => {
        const { period } = req.query;
        const spending = await monitoringEngine.getSpendingByCategory(req.params.customerId, period);
        res.json(spending);
    });
    
    // Create budget
    router.post('/budget', async (req, res) => {
        try {
            const budget = await monitoringEngine.createBudget(req.body);
            res.json(budget);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Update budget
    router.put('/budget/:budgetId', async (req, res) => {
        try {
            const budget = await monitoringEngine.updateBudget(req.params.budgetId, req.body);
            res.json(budget);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Delete budget
    router.delete('/budget/:budgetId', async (req, res) => {
        try {
            const result = await monitoringEngine.deleteBudget(req.params.budgetId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Get budget status
    router.get('/budget-status/:customerId', async (req, res) => {
        const status = await monitoringEngine.getBudgetStatus(req.params.customerId);
        res.json(status);
    });
    
    // Get alerts
    router.get('/alerts/:customerId', async (req, res) => {
        const { isRead, limit } = req.query;
        const alerts = await monitoringEngine.getAlerts(
            req.params.customerId,
            isRead === 'true' ? true : (isRead === 'false' ? false : undefined),
            parseInt(limit) || 50
        );
        res.json(alerts);
    });
    
    // Mark alert as read
    router.put('/alert/:alertId/read', async (req, res) => {
        try {
            const alert = await monitoringEngine.markAlertRead(req.params.alertId);
            res.json(alert);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Search transactions
    router.post('/search/:customerId', async (req, res) => {
        const results = await monitoringEngine.searchTransactions(req.params.customerId, req.body);
        res.json(results);
    });
    
    // Export transactions
    router.post('/export/:customerId', async (req, res) => {
        const { format, filters } = req.body;
        const exported = await monitoringEngine.exportTransactions(req.params.customerId, format, filters);
        
        res.setHeader('Content-Type', format === 'CSV' ? 'text/csv' : 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=transactions.${format.toLowerCase()}`);
        res.send(exported);
    });
    
    // Get dashboard statistics
    router.get('/dashboard-stats', async (req, res) => {
        const stats = await monitoringEngine.getDashboardStats();
        res.json(stats);
    });
    
    return router;
}

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initializeMonitoringSystem() {
    const monitoringEngine = new TransactionMonitoringEngine();
    await monitoringEngine.initialize();
    
    console.log('[TransactionMonitoring] ✅ System initialized');
    console.log('[TransactionMonitoring] Features: Real-time tracking, budgets, alerts, analytics');
    console.log('[TransactionMonitoring] Supported currencies:', Object.keys(MONITORING_CONFIG.SUPPORTED_CURRENCIES).join(', '));
    
    return {
        monitoringEngine
    };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    TransactionMonitoringEngine,
    Transaction,
    Budget,
    SpendingAlert,
    createMonitoringRouter,
    initializeMonitoringSystem,
    MONITORING_CONFIG
};
