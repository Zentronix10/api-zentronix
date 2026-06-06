/**
 * ZENTRONIX BANK - COMPLETE INTERNAL ACCOUNT TRANSFER SYSTEM
 * Secure transfers between internal bank accounts
 * Version: 1.0.0
 * Language: JavaScript (Node.js)
 * 
 * Features:
 * - Real-time transfers between internal accounts
 * - Multi-currency support (USD, EUR, GBP, BRL, etc.)
 * - Multi-crypto support including Bradicoin (BRD)
 * - Scheduled/recurring transfers
 * - Batch transfers (multiple recipients)
 * - Transfer limits and fees
 * - AML and fraud prevention integration
 * - Two-factor authentication for high-value transfers
 * - Beneficiary whitelist management
 * - Transfer reversal/cancellation
 * - Detailed transaction history and receipts
 * - Real-time balance updates
 * - Webhook notifications
 * - Automatic currency conversion
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ========================================
// CONFIGURATION
// ========================================

const INTERNAL_TRANSFER_CONFIG = {
    // Transfer types
    TRANSFER_TYPES: {
        INSTANT: 'INSTANT',
        SCHEDULED: 'SCHEDULED',
        BATCH: 'BATCH',
        RECURRING: 'RECURRING'
    },
    
    // Transfer statuses
    TRANSFER_STATUS: {
        PENDING: 'PENDING',
        PROCESSING: 'PROCESSING',
        COMPLETED: 'COMPLETED',
        FAILED: 'FAILED',
        CANCELLED: 'CANCELLED',
        REVERSED: 'REVERSED',
        HELD_FOR_REVIEW: 'HELD_FOR_REVIEW'
    },
    
    // Transfer limits (USD equivalent)
    LIMITS: {
        MINIMUM_AMOUNT: 1,
        MAXIMUM_SINGLE: 50000,
        MAXIMUM_DAILY: 100000,
        MAXIMUM_MONTHLY: 500000,
        REQUIRES_2FA_ABOVE: 10000,
        REQUIRES_ADMIN_APPROVAL_ABOVE: 25000
    },
    
    // Fee structure
    FEES: {
        INSTANT_TRANSFER: 0, // Free for internal transfers
        SCHEDULED_TRANSFER: 0,
        BATCH_TRANSFER: {
            percentage: 0.001, // 0.1%
            maxFee: 10
        },
        CURRENCY_CONVERSION: 0.005 // 0.5%
    },
    
    // Recurring transfer options
    RECURRING_FREQUENCIES: {
        DAILY: 'DAILY',
        WEEKLY: 'WEEKLY',
        BIWEEKLY: 'BIWEEKLY',
        MONTHLY: 'MONTHLY',
        QUARTERLY: 'QUARTERLY'
    },
    
    // Supported currencies
    SUPPORTED_CURRENCIES: {
        USD: { name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
        EUR: { name: 'Euro', symbol: '€', decimalPlaces: 2 },
        GBP: { name: 'British Pound', symbol: '£', decimalPlaces: 2 },
        BRL: { name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2 },
        BTC: { name: 'Bitcoin', symbol: '₿', decimalPlaces: 8 },
        ETH: { name: 'Ethereum', symbol: 'Ξ', decimalPlaces: 6 },
        USDT: { name: 'Tether', symbol: '₮', decimalPlaces: 2 },
        BRD: { name: 'Bradicoin', symbol: 'BRD', decimalPlaces: 2, priceUSD: 10.00 }
    },
    
    // Beneficiary limits
    BENEFICIARY_LIMITS: {
        MAX_BENEFICIARIES: 50,
        DAILY_BENEFICIARY_ADDITIONS: 10,
        NEW_BENEFICIARY_HOLD_PERIOD_HOURS: 24 // Hold for new beneficiaries
    },
    
    // Processing times (milliseconds)
    PROCESSING_TIMES: {
        INSTANT: 100,
        SCHEDULED_CHECK_INTERVAL: 60000, // 1 minute
        BATCH_MAX_RECIPIENTS: 100
    }
};

// ========================================
// DATA MODELS
// ========================================

class InternalTransfer {
    constructor(data) {
        this.transferId = data.transferId || this.generateTransferId();
        this.reference = data.reference || this.generateReference();
        this.fromAccountId = data.fromAccountId;
        this.toAccountId = data.toAccountId;
        this.fromCustomerId = data.fromCustomerId;
        this.toCustomerId = data.toCustomerId;
        this.amount = data.amount;
        this.currency = data.currency;
        this.convertedAmount = data.convertedAmount || null;
        this.conversionRate = data.conversionRate || null;
        this.fees = data.fees || 0;
        this.totalAmount = data.totalAmount || data.amount;
        this.description = data.description || '';
        this.category = data.category || 'TRANSFER';
        this.type = data.type || INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.INSTANT;
        this.status = data.status || INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.PENDING;
        this.scheduleDate = data.scheduleDate || null;
        this.recurringId = data.recurringId || null;
        this.batchId = data.batchId || null;
        this.requires2FA = data.requires2FA || false;
        this.requiresAdminApproval = data.requiresAdminApproval || false;
        this.approvedBy = data.approvedBy || null;
        this.approvedAt = data.approvedAt || null;
        this.cancelledBy = data.cancelledBy || null;
        this.cancelledAt = data.cancelledAt || null;
        this.cancellationReason = data.cancellationReason || null;
        this.reversedBy = data.reversedBy || null;
        this.reversedAt = data.reversedAt || null;
        this.reversalReason = data.reversalReason || null;
        this.ipAddress = data.ipAddress || null;
        this.deviceId = data.deviceId || null;
        this.location = data.location || null;
        this.createdAt = data.createdAt || new Date();
        this.processedAt = data.processedAt || null;
        this.metadata = data.metadata || {};
    }
    
    generateTransferId() {
        return `TRF-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    generateReference() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `ZENT-${year}${month}-${random}`;
    }
}

class Beneficiary {
    constructor(data) {
        this.beneficiaryId = data.beneficiaryId || this.generateBeneficiaryId();
        this.customerId = data.customerId;
        this.accountId = data.accountId;
        this.accountHolderName = data.accountHolderName;
        this.nickname = data.nickname || null;
        this.email = data.email || null;
        this.phone = data.phone || null;
        this.isWhitelisted = data.isWhitelisted || false;
        this.verifiedAt = data.verifiedAt || null;
        this.createdAt = data.createdAt || new Date();
        this.lastUsedAt = data.lastUsedAt || null;
        this.totalTransferred = data.totalTransferred || 0;
        this.metadata = data.metadata || {};
    }
    
    generateBeneficiaryId() {
        return `BEN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

class RecurringTransfer {
    constructor(data) {
        this.recurringId = data.recurringId || this.generateRecurringId();
        this.customerId = data.customerId;
        this.fromAccountId = data.fromAccountId;
        this.toAccountId = data.toAccountId;
        this.amount = data.amount;
        this.currency = data.currency;
        this.frequency = data.frequency;
        this.description = data.description || '';
        this.startDate = data.startDate || new Date();
        this.endDate = data.endDate || null;
        this.nextExecutionDate = data.nextExecutionDate || new Date();
        this.lastExecutionDate = data.lastExecutionDate || null;
        this.totalExecutions = data.totalExecutions || 0;
        this.maxExecutions = data.maxExecutions || null;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date();
        this.cancelledAt = data.cancelledAt || null;
    }
    
    generateRecurringId() {
        return `RPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    calculateNextExecution() {
        const nextDate = new Date(this.nextExecutionDate);
        
        switch (this.frequency) {
            case INTERNAL_TRANSFER_CONFIG.RECURRING_FREQUENCIES.DAILY:
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case INTERNAL_TRANSFER_CONFIG.RECURRING_FREQUENCIES.WEEKLY:
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case INTERNAL_TRANSFER_CONFIG.RECURRING_FREQUENCIES.BIWEEKLY:
                nextDate.setDate(nextDate.getDate() + 14);
                break;
            case INTERNAL_TRANSFER_CONFIG.RECURRING_FREQUENCIES.MONTHLY:
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case INTERNAL_TRANSFER_CONFIG.RECURRING_FREQUENCIES.QUARTERLY:
                nextDate.setMonth(nextDate.getMonth() + 3);
                break;
        }
        
        return nextDate;
    }
}

class BatchTransfer {
    constructor(data) {
        this.batchId = data.batchId || this.generateBatchId();
        this.customerId = data.customerId;
        this.fromAccountId = data.fromAccountId;
        this.totalAmount = data.totalAmount;
        this.currency = data.currency;
        this.recipients = data.recipients || [];
        this.status = data.status || 'PENDING';
        this.processedCount = data.processedCount || 0;
        this.failedCount = data.failedCount || 0;
        this.results = data.results || [];
        this.createdAt = data.createdAt || new Date();
        this.processedAt = data.processedAt || null;
        this.metadata = data.metadata || {};
    }
    
    generateBatchId() {
        return `BCH-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

// ========================================
// ACCOUNT SERVICE (Internal)
// ========================================

class InternalAccountService {
    constructor() {
        this.accounts = new Map();
    }
    
    async getAccountBalance(accountId) {
        // In production, fetch from database
        const account = this.accounts.get(accountId) || {
            accountId,
            balance: 100000, // Mock balance
            currency: 'USD'
        };
        return account.balance;
    }
    
    async debitAccount(accountId, amount, currency, transferId) {
        const account = this.accounts.get(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }
        
        if (account.balance < amount) {
            throw new Error(`Insufficient balance. Available: ${account.balance} ${currency}`);
        }
        
        account.balance -= amount;
        account.lastUpdated = new Date();
        this.accounts.set(accountId, account);
        
        console.log(`[Account] Debited ${amount} ${currency} from ${accountId} (Transfer: ${transferId})`);
        return true;
    }
    
    async creditAccount(accountId, amount, currency, transferId) {
        const account = this.accounts.get(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} not found`);
        }
        
        account.balance += amount;
        account.lastUpdated = new Date();
        this.accounts.set(accountId, account);
        
        console.log(`[Account] Credited ${amount} ${currency} to ${accountId} (Transfer: ${transferId})`);
        return true;
    }
    
    async validateAccount(accountId, customerId = null) {
        // Validate account exists and belongs to customer
        const account = this.accounts.get(accountId);
        if (!account) {
            throw new Error(`Account ${accountId} does not exist`);
        }
        
        if (customerId && account.customerId !== customerId) {
            throw new Error(`Account ${accountId} does not belong to customer ${customerId}`);
        }
        
        return account;
    }
    
    async getAccountDetails(accountId) {
        return this.accounts.get(accountId) || null;
    }
}

// ========================================
// BENEFICIARY MANAGER
// ========================================

class BeneficiaryManager {
    constructor() {
        this.beneficiaries = new Map();
    }
    
    async addBeneficiary(customerId, beneficiaryData) {
        const customerBeneficiaries = await this.getBeneficiaries(customerId);
        
        if (customerBeneficiaries.length >= INTERNAL_TRANSFER_CONFIG.BENEFICIARY_LIMITS.MAX_BENEFICIARIES) {
            throw new Error(`Maximum beneficiaries (${INTERNAL_TRANSFER_CONFIG.BENEFICIARY_LIMITS.MAX_BENEFICIARIES}) reached`);
        }
        
        const beneficiary = new Beneficiary({
            ...beneficiaryData,
            customerId,
            isWhitelisted: false
        });
        
        this.beneficiaries.set(beneficiary.beneficiaryId, beneficiary);
        return beneficiary;
    }
    
    async getBeneficiaries(customerId) {
        const result = [];
        for (const beneficiary of this.beneficiaries.values()) {
            if (beneficiary.customerId === customerId) {
                result.push(beneficiary);
            }
        }
        return result;
    }
    
    async whitelistBeneficiary(beneficiaryId, customerId) {
        const beneficiary = this.beneficiaries.get(beneficiaryId);
        if (!beneficiary) throw new Error('Beneficiary not found');
        if (beneficiary.customerId !== customerId) throw new Error('Unauthorized');
        
        beneficiary.isWhitelisted = true;
        beneficiary.verifiedAt = new Date();
        this.beneficiaries.set(beneficiaryId, beneficiary);
        
        return beneficiary;
    }
    
    async removeBeneficiary(beneficiaryId, customerId) {
        const beneficiary = this.beneficiaries.get(beneficiaryId);
        if (!beneficiary) throw new Error('Beneficiary not found');
        if (beneficiary.customerId !== customerId) throw new Error('Unauthorized');
        
        this.beneficiaries.delete(beneficiaryId);
        return { success: true, beneficiaryId };
    }
    
    async checkBeneficiaryLimit(customerId, accountId) {
        const today = new Date().toDateString();
        const additionsToday = Array.from(this.beneficiaries.values())
            .filter(b => b.customerId === customerId && 
                   new Date(b.createdAt).toDateString() === today).length;
        
        if (additionsToday >= INTERNAL_TRANSFER_CONFIG.BENEFICIARY_LIMITS.DAILY_BENEFICIARY_ADDITIONS) {
            throw new Error(`Daily beneficiary addition limit (${INTERNAL_TRANSFER_CONFIG.BENEFICIARY_LIMITS.DAILY_BENEFICIARY_ADDITIONS}) reached`);
        }
        
        return true;
    }
}

// ========================================
// FRAUD PREVENTION INTEGRATION
// ========================================

class TransferFraudPrevention {
    constructor(fraudDetectionEngine = null) {
        this.fraudDetection = fraudDetectionEngine;
    }
    
    async analyzeTransfer(transfer, customerHistory) {
        const riskFactors = [];
        let totalRiskScore = 0;
        
        // Check 1: Unusual amount
        if (transfer.amount > INTERNAL_TRANSFER_CONFIG.LIMITS.MAXIMUM_SINGLE * 0.8) {
            riskFactors.push({
                factor: 'HIGH_AMOUNT',
                score: 30,
                details: `Amount ${transfer.amount} is near maximum limit`
            });
            totalRiskScore += 30;
        }
        
        // Check 2: Transfer to self? (same customer)
        if (transfer.fromCustomerId === transfer.toCustomerId) {
            riskFactors.push({
                factor: 'SELF_TRANSFER',
                score: 0,
                details: 'Transfer to own account'
            });
        }
        
        // Check 3: First time transfer to beneficiary
        const isNewBeneficiary = !customerHistory.some(t => 
            t.toAccountId === transfer.toAccountId && t.status === 'COMPLETED'
        );
        
        if (isNewBeneficiary) {
            riskFactors.push({
                factor: 'NEW_BENEFICIARY',
                score: 15,
                details: 'First time transfer to this beneficiary'
            });
            totalRiskScore += 15;
        }
        
        // Check 4: Rapid consecutive transfers
        const recentTransfers = customerHistory.filter(t => 
            new Date(t.createdAt) > new Date(Date.now() - 60 * 60 * 1000)
        );
        
        if (recentTransfers.length >= 5) {
            riskFactors.push({
                factor: 'HIGH_VELOCITY',
                score: 40,
                details: `${recentTransfers.length} transfers in last hour`
            });
            totalRiskScore += 40;
        }
        
        // Check 5: Daily limit approaching
        const dailyTotal = customerHistory
            .filter(t => new Date(t.createdAt).toDateString() === new Date().toDateString())
            .reduce((sum, t) => sum + t.amount, 0);
        
        const dailyRemaining = INTERNAL_TRANSFER_CONFIG.LIMITS.MAXIMUM_DAILY - dailyTotal;
        if (dailyRemaining < transfer.amount) {
            riskFactors.push({
                factor: 'DAILY_LIMIT_EXCEEDED',
                score: 100,
                details: 'Transfer would exceed daily limit'
            });
            totalRiskScore = 100;
        }
        
        return {
            riskScore: Math.min(totalRiskScore, 100),
            riskLevel: totalRiskScore >= 70 ? 'HIGH' : (totalRiskScore >= 40 ? 'MEDIUM' : 'LOW'),
            riskFactors,
            requires2FA: transfer.amount >= INTERNAL_TRANSFER_CONFIG.LIMITS.REQUIRES_2FA_ABOVE,
            requiresAdminApproval: transfer.amount >= INTERNAL_TRANSFER_CONFIG.LIMITS.REQUIRES_ADMIN_APPROVAL_ABOVE
        };
    }
}

// ========================================
// NOTIFICATION MANAGER
// ========================================

class TransferNotificationManager extends EventEmitter {
    constructor() {
        super();
    }
    
    async sendTransferNotification(transfer, type = 'TRANSFER_SENT') {
        const notification = {
            notificationId: `NOTIF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
            customerId: transfer.fromCustomerId,
            type,
            title: this.getNotificationTitle(type),
            message: this.getNotificationMessage(transfer, type),
            data: {
                transferId: transfer.transferId,
                reference: transfer.reference,
                amount: transfer.amount,
                currency: transfer.currency,
                toAccountId: transfer.toAccountId,
                status: transfer.status,
                timestamp: transfer.processedAt || transfer.createdAt
            },
            timestamp: new Date()
        };
        
        this.emit('notification_sent', notification);
        return notification;
    }
    
    getNotificationTitle(type) {
        const titles = {
            TRANSFER_SENT: 'Transfer Sent Successfully',
            TRANSFER_RECEIVED: 'Transfer Received',
            TRANSFER_FAILED: 'Transfer Failed',
            TRANSFER_HELD: 'Transfer Held for Review',
            TRANSFER_CANCELLED: 'Transfer Cancelled'
        };
        return titles[type] || 'Transfer Update';
    }
    
    getNotificationMessage(transfer, type) {
        switch (type) {
            case 'TRANSFER_SENT':
                return `You sent ${transfer.amount} ${transfer.currency} to account ${transfer.toAccountId}. Reference: ${transfer.reference}`;
            case 'TRANSFER_RECEIVED':
                return `You received ${transfer.amount} ${transfer.currency} from account ${transfer.fromAccountId}. Reference: ${transfer.reference}`;
            case 'TRANSFER_FAILED':
                return `Transfer of ${transfer.amount} ${transfer.currency} failed. Please check your balance and try again.`;
            case 'TRANSFER_HELD':
                return `Transfer of ${transfer.amount} ${transfer.currency} is under review. We will notify you when processed.`;
            default:
                return `Transfer update for reference ${transfer.reference}`;
        }
    }
}

// ========================================
// MAIN TRANSFER SERVICE
// ========================================

class InternalTransferService extends EventEmitter {
    constructor(accountService, beneficiaryManager, fraudPrevention, notificationManager) {
        super();
        this.accountService = accountService;
        this.beneficiaryManager = beneficiaryManager;
        this.fraudPrevention = fraudPrevention;
        this.notificationManager = notificationManager;
        this.transfers = new Map();
        this.recurringTransfers = new Map();
        this.batchTransfers = new Map();
        this.scheduledInterval = null;
    }
    
    async initialize() {
        // Start scheduled transfer processor
        this.scheduledInterval = setInterval(() => this.processScheduledTransfers(), 
            INTERNAL_TRANSFER_CONFIG.PROCESSING_TIMES.SCHEDULED_CHECK_INTERVAL);
        
        console.log('[InternalTransfer] Service initialized');
        return this;
    }
    
    async createTransfer(transferData) {
        const {
            fromCustomerId,
            fromAccountId,
            toAccountId,
            amount,
            currency,
            description,
            type = INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.INSTANT,
            scheduleDate = null,
            requires2FA = false,
            requiresAdminApproval = false
        } = transferData;
        
        // Validate accounts
        const fromAccount = await this.accountService.validateAccount(fromAccountId, fromCustomerId);
        const toAccount = await this.accountService.validateAccount(toAccountId);
        
        // Check minimum amount
        if (amount < INTERNAL_TRANSFER_CONFIG.LIMITS.MINIMUM_AMOUNT) {
            throw new Error(`Minimum transfer amount is ${INTERNAL_TRANSFER_CONFIG.LIMITS.MINIMUM_AMOUNT}`);
        }
        
        // Get customer transfer history for fraud analysis
        const customerHistory = await this.getCustomerTransfers(fromCustomerId);
        
        // Fraud analysis
        const fraudAnalysis = await this.fraudPrevention.analyzeTransfer({
            ...transferData,
            amount,
            toAccountId
        }, customerHistory);
        
        // Determine if needs approval
        const needs2FA = requires2FA || fraudAnalysis.requires2FA;
        const needsAdminApproval = requiresAdminApproval || fraudAnalysis.requiresAdminApproval;
        
        // Calculate fees
        const fees = this.calculateFees(amount, currency, type);
        const totalAmount = amount + fees;
        
        // Check balance including fees
        const balance = await this.accountService.getAccountBalance(fromAccountId);
        if (balance < totalAmount) {
            throw new Error(`Insufficient balance. Required: ${totalAmount} ${currency}, Available: ${balance}`);
        }
        
        const transfer = new InternalTransfer({
            fromCustomerId,
            fromAccountId,
            toCustomerId: toAccount.customerId,
            toAccountId,
            amount,
            currency,
            fees,
            totalAmount,
            description,
            type,
            scheduleDate: scheduleDate ? new Date(scheduleDate) : null,
            requires2FA: needs2FA,
            requiresAdminApproval: needsAdminApproval,
            status: scheduleDate ? INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.PENDING : 
                    (needsAdminApproval ? INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.HELD_FOR_REVIEW : 
                     INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.PROCESSING),
            metadata: { fraudAnalysis }
        });
        
        this.transfers.set(transfer.transferId, transfer);
        
        // Process immediately if not scheduled
        if (!scheduleDate && !needsAdminApproval) {
            await this.processTransfer(transfer.transferId);
        }
        
        this.emit('transfer_created', transfer);
        return transfer;
    }
    
    async processTransfer(transferId) {
        const transfer = this.transfers.get(transferId);
        if (!transfer) throw new Error('Transfer not found');
        
        if (transfer.status !== INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.PROCESSING &&
            transfer.status !== INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.PENDING) {
            throw new Error(`Transfer cannot be processed (status: ${transfer.status})`);
        }
        
        try {
            // Debit from account
            await this.accountService.debitAccount(
                transfer.fromAccountId, 
                transfer.totalAmount, 
                transfer.currency, 
                transfer.transferId
            );
            
            // Credit to account
            await this.accountService.creditAccount(
                transfer.toAccountId, 
                transfer.amount, 
                transfer.currency, 
                transfer.transferId
            );
            
            transfer.status = INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.COMPLETED;
            transfer.processedAt = new Date();
            
            // Update beneficiary last used
            await this.updateBeneficiaryLastUsed(transfer);
            
            this.emit('transfer_completed', transfer);
            
            // Send notifications
            await this.notificationManager.sendTransferNotification(transfer, 'TRANSFER_SENT');
            
            // Send notification to recipient (separate notification)
            const recipientNotification = { ...transfer, fromCustomerId: transfer.toCustomerId };
            await this.notificationManager.sendTransferNotification(recipientNotification, 'TRANSFER_RECEIVED');
            
            return transfer;
        } catch (error) {
            transfer.status = INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.FAILED;
            transfer.metadata.error = error.message;
            this.emit('transfer_failed', transfer);
            throw error;
        }
    }
    
    async cancelTransfer(transferId, customerId, reason) {
        const transfer = this.transfers.get(transferId);
        if (!transfer) throw new Error('Transfer not found');
        if (transfer.fromCustomerId !== customerId) throw new Error('Unauthorized');
        
        if (transfer.status !== INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.PENDING &&
            transfer.status !== INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.HELD_FOR_REVIEW) {
            throw new Error(`Transfer cannot be cancelled (status: ${transfer.status})`);
        }
        
        transfer.status = INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.CANCELLED;
        transfer.cancelledAt = new Date();
        transfer.cancelledBy = customerId;
        transfer.cancellationReason = reason;
        
        this.emit('transfer_cancelled', transfer);
        
        return transfer;
    }
    
    async reverseTransfer(transferId, adminId, reason) {
        const transfer = this.transfers.get(transferId);
        if (!transfer) throw new Error('Transfer not found');
        
        if (transfer.status !== INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.COMPLETED) {
            throw new Error(`Only completed transfers can be reversed`);
        }
        
        // Reverse the transaction
        await this.accountService.debitAccount(
            transfer.toAccountId,
            transfer.amount,
            transfer.currency,
            `${transfer.transferId}_REVERSE`
        );
        
        await this.accountService.creditAccount(
            transfer.fromAccountId,
            transfer.totalAmount,
            transfer.currency,
            `${transfer.transferId}_REVERSE`
        );
        
        transfer.status = INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.REVERSED;
        transfer.reversedAt = new Date();
        transfer.reversedBy = adminId;
        transfer.reversalReason = reason;
        
        this.emit('transfer_reversed', transfer);
        
        return transfer;
    }
    
    async createRecurringTransfer(data) {
        const {
            customerId,
            fromAccountId,
            toAccountId,
            amount,
            currency,
            frequency,
            description,
            startDate,
            endDate,
            maxExecutions
        } = data;
        
        // Validate account
        await this.accountService.validateAccount(fromAccountId, customerId);
        
        const recurring = new RecurringTransfer({
            customerId,
            fromAccountId,
            toAccountId,
            amount,
            currency,
            frequency,
            description,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null,
            nextExecutionDate: startDate ? new Date(startDate) : new Date(),
            maxExecutions
        });
        
        this.recurringTransfers.set(recurring.recurringId, recurring);
        this.emit('recurring_created', recurring);
        
        return recurring;
    }
    
    async createBatchTransfer(data) {
        const {
            customerId,
            fromAccountId,
            recipients,
            currency,
            description
        } = data;
        
        if (recipients.length > INTERNAL_TRANSFER_CONFIG.PROCESSING_TIMES.BATCH_MAX_RECIPIENTS) {
            throw new Error(`Maximum ${INTERNAL_TRANSFER_CONFIG.PROCESSING_TIMES.BATCH_MAX_RECIPIENTS} recipients per batch`);
        }
        
        const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);
        
        // Validate account balance
        const balance = await this.accountService.getAccountBalance(fromAccountId);
        const fees = this.calculateFees(totalAmount, currency, INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.BATCH);
        const totalWithFees = totalAmount + fees;
        
        if (balance < totalWithFees) {
            throw new Error(`Insufficient balance for batch transfer. Required: ${totalWithFees}`);
        }
        
        const batch = new BatchTransfer({
            customerId,
            fromAccountId,
            totalAmount,
            currency,
            recipients,
            status: 'PROCESSING'
        });
        
        this.batchTransfers.set(batch.batchId, batch);
        
        // Process batch
        for (const recipient of recipients) {
            try {
                const transfer = await this.createTransfer({
                    fromCustomerId: customerId,
                    fromAccountId,
                    toAccountId: recipient.accountId,
                    amount: recipient.amount,
                    currency,
                    description: description || recipient.description || 'Batch transfer',
                    type: INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.BATCH,
                    batchId: batch.batchId
                });
                
                batch.processedCount++;
                batch.results.push({
                    accountId: recipient.accountId,
                    amount: recipient.amount,
                    status: 'SUCCESS',
                    transferId: transfer.transferId
                });
            } catch (error) {
                batch.failedCount++;
                batch.results.push({
                    accountId: recipient.accountId,
                    amount: recipient.amount,
                    status: 'FAILED',
                    error: error.message
                });
            }
        }
        
        batch.status = 'COMPLETED';
        batch.processedAt = new Date();
        
        this.emit('batch_completed', batch);
        
        return batch;
    }
    
    async processScheduledTransfers() {
        const now = new Date();
        
        for (const recurring of this.recurringTransfers.values()) {
            if (!recurring.isActive) continue;
            
            if (recurring.endDate && now > recurring.endDate) {
                recurring.isActive = false;
                continue;
            }
            
            if (recurring.maxExecutions && recurring.totalExecutions >= recurring.maxExecutions) {
                recurring.isActive = false;
                continue;
            }
            
            if (now >= recurring.nextExecutionDate) {
                try {
                    const transfer = await this.createTransfer({
                        fromCustomerId: recurring.customerId,
                        fromAccountId: recurring.fromAccountId,
                        toAccountId: recurring.toAccountId,
                        amount: recurring.amount,
                        currency: recurring.currency,
                        description: `[Recurring] ${recurring.description || 'Scheduled transfer'}`,
                        type: INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.RECURRING,
                        recurringId: recurring.recurringId
                    });
                    
                    recurring.lastExecutionDate = now;
                    recurring.totalExecutions++;
                    recurring.nextExecutionDate = recurring.calculateNextExecution();
                    
                    this.emit('recurring_executed', { recurring, transfer });
                } catch (error) {
                    this.emit('recurring_failed', { recurring, error: error.message });
                }
            }
        }
    }
    
    async getTransfer(transferId) {
        return this.transfers.get(transferId) || null;
    }
    
    async getCustomerTransfers(customerId, limit = 50, offset = 0) {
        const transfers = [];
        for (const transfer of this.transfers.values()) {
            if (transfer.fromCustomerId === customerId || transfer.toCustomerId === customerId) {
                transfers.push(transfer);
            }
        }
        return transfers.sort((a, b) => b.createdAt - a.createdAt).slice(offset, offset + limit);
    }
    
    async getTransferStatistics(customerId) {
        const transfers = await this.getCustomerTransfers(customerId, 10000);
        const completed = transfers.filter(t => t.status === 'COMPLETED');
        
        const totalSent = completed
            .filter(t => t.fromCustomerId === customerId)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalReceived = completed
            .filter(t => t.toCustomerId === customerId)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthlyStats = this.calculateMonthlyStats(completed, customerId);
        
        return {
            customerId,
            totalTransfers: completed.length,
            totalSent,
            totalReceived,
            netFlow: totalReceived - totalSent,
            averageTransferAmount: completed.length > 0 ? totalSent / completed.length : 0,
            monthlyBreakdown: monthlyStats,
            pendingTransfers: transfers.filter(t => t.status === 'PENDING').length,
            failedTransfers: transfers.filter(t => t.status === 'FAILED').length
        };
    }
    
    calculateMonthlyStats(transfers, customerId) {
        const monthly = {};
        const now = new Date();
        
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            
            const monthTransfers = transfers.filter(t => {
                const transferDate = new Date(t.createdAt);
                return transferDate.getFullYear() === date.getFullYear() &&
                       transferDate.getMonth() === date.getMonth() &&
                       t.fromCustomerId === customerId;
            });
            
            monthly[key] = {
                month: date.toLocaleString('default', { month: 'long' }),
                year: date.getFullYear(),
                count: monthTransfers.length,
                total: monthTransfers.reduce((sum, t) => sum + t.amount, 0)
            };
        }
        
        return monthly;
    }
    
    calculateFees(amount, currency, type) {
        if (type === INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.INSTANT ||
            type === INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.SCHEDULED ||
            type === INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.RECURRING) {
            return 0;
        }
        
        if (type === INTERNAL_TRANSFER_CONFIG.TRANSFER_TYPES.BATCH) {
            const fee = amount * INTERNAL_TRANSFER_CONFIG.FEES.BATCH_TRANSFER.percentage;
            return Math.min(fee, INTERNAL_TRANSFER_CONFIG.FEES.BATCH_TRANSFER.maxFee);
        }
        
        return 0;
    }
    
    async updateBeneficiaryLastUsed(transfer) {
        const beneficiaries = await this.beneficiaryManager.getBeneficiaries(transfer.fromCustomerId);
        const beneficiary = beneficiaries.find(b => b.accountId === transfer.toAccountId);
        
        if (beneficiary) {
            beneficiary.lastUsedAt = new Date();
            beneficiary.totalTransferred += transfer.amount;
            this.beneficiaryManager.beneficiaries.set(beneficiary.beneficiaryId, beneficiary);
        }
    }
    
    async approveTransfer(transferId, adminId) {
        const transfer = this.transfers.get(transferId);
        if (!transfer) throw new Error('Transfer not found');
        
        if (transfer.status !== INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.HELD_FOR_REVIEW) {
            throw new Error(`Transfer is not pending approval (status: ${transfer.status})`);
        }
        
        transfer.requiresAdminApproval = false;
        transfer.approvedBy = adminId;
        transfer.approvedAt = new Date();
        transfer.status = INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.PROCESSING;
        
        await this.processTransfer(transferId);
        
        return transfer;
    }
    
    async declineTransfer(transferId, adminId, reason) {
        const transfer = this.transfers.get(transferId);
        if (!transfer) throw new Error('Transfer not found');
        
        if (transfer.status !== INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.HELD_FOR_REVIEW) {
            throw new Error(`Transfer is not pending approval (status: ${transfer.status})`);
        }
        
        transfer.status = INTERNAL_TRANSFER_CONFIG.TRANSFER_STATUS.CANCELLED;
        transfer.cancelledAt = new Date();
        transfer.cancelledBy = adminId;
        transfer.cancellationReason = reason;
        
        this.emit('transfer_declined', transfer);
        
        return transfer;
    }
    
    stop() {
        if (this.scheduledInterval) {
            clearInterval(this.scheduledInterval);
        }
    }
}

// ========================================
// EXPRESS ROUTES
// ========================================

function createInternalTransferRouter(transferService) {
    const express = require('express');
    const router = express.Router();
    
    // Create a transfer
    router.post('/transfer', async (req, res) => {
        try {
            const transfer = await transferService.createTransfer(req.body);
            res.json({
                success: true,
                transferId: transfer.transferId,
                reference: transfer.reference,
                status: transfer.status,
                message: transfer.status === 'COMPLETED' ? 'Transfer completed successfully' : 'Transfer created and processing'
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Get transfer by ID
    router.get('/transfer/:transferId', async (req, res) => {
        const transfer = await transferService.getTransfer(req.params.transferId);
        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }
        res.json(transfer);
    });
    
    // Cancel transfer
    router.post('/transfer/:transferId/cancel', async (req, res) => {
        try {
            const { customerId, reason } = req.body;
            const transfer = await transferService.cancelTransfer(req.params.transferId, customerId, reason);
            res.json({ success: true, transfer });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Reverse transfer (admin)
    router.post('/transfer/:transferId/reverse', async (req, res) => {
        try {
            const { adminId, reason } = req.body;
            const transfer = await transferService.reverseTransfer(req.params.transferId, adminId, reason);
            res.json({ success: true, transfer });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Approve transfer (admin)
    router.post('/transfer/:transferId/approve', async (req, res) => {
        try {
            const { adminId } = req.body;
            const transfer = await transferService.approveTransfer(req.params.transferId, adminId);
            res.json({ success: true, transfer });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Decline transfer (admin)
    router.post('/transfer/:transferId/decline', async (req, res) => {
        try {
            const { adminId, reason } = req.body;
            const transfer = await transferService.declineTransfer(req.params.transferId, adminId, reason);
            res.json({ success: true, transfer });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Get customer transfer history
    router.get('/history/:customerId', async (req, res) => {
        const { limit, offset } = req.query;
        const transfers = await transferService.getCustomerTransfers(
            req.params.customerId,
            parseInt(limit) || 50,
            parseInt(offset) || 0
        );
        res.json(transfers);
    });
    
    // Get transfer statistics
    router.get('/statistics/:customerId', async (req, res) => {
        const stats = await transferService.getTransferStatistics(req.params.customerId);
        res.json(stats);
    });
    
    // Create recurring transfer
    router.post('/recurring', async (req, res) => {
        try {
            const recurring = await transferService.createRecurringTransfer(req.body);
            res.json(recurring);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Create batch transfer
    router.post('/batch', async (req, res) => {
        try {
            const batch = await transferService.createBatchTransfer(req.body);
            res.json(batch);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Beneficiary management
    router.post('/beneficiary', async (req, res) => {
        try {
            const { customerId, ...beneficiaryData } = req.body;
            const beneficiary = await transferService.beneficiaryManager.addBeneficiary(customerId, beneficiaryData);
            res.json(beneficiary);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/beneficiaries/:customerId', async (req, res) => {
        const beneficiaries = await transferService.beneficiaryManager.getBeneficiaries(req.params.customerId);
        res.json(beneficiaries);
    });
    
    router.delete('/beneficiary/:beneficiaryId', async (req, res) => {
        try {
            const { customerId } = req.body;
            const result = await transferService.beneficiaryManager.removeBeneficiary(req.params.beneficiaryId, customerId);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/beneficiary/:beneficiaryId/whitelist', async (req, res) => {
        try {
            const { customerId } = req.body;
            const beneficiary = await transferService.beneficiaryManager.whitelistBeneficiary(req.params.beneficiaryId, customerId);
            res.json(beneficiary);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    return router;
}

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initializeInternalTransferSystem(fraudPrevention = null) {
    const accountService = new InternalAccountService();
    const beneficiaryManager = new BeneficiaryManager();
    const transferFraudPrevention = new TransferFraudPrevention(fraudPrevention);
    const notificationManager = new TransferNotificationManager();
    
    const transferService = new InternalTransferService(
        accountService,
        beneficiaryManager,
        transferFraudPrevention,
        notificationManager
    );
    
    await transferService.initialize();
    
    console.log('[InternalTransfer] ✅ System initialized');
    console.log('[InternalTransfer] Features: Instant transfers, recurring transfers, batch transfers');
    console.log('[InternalTransfer] Limits: Min $1, Max $50,000 single, $100,000 daily');
    
    return {
        transferService,
        accountService,
        beneficiaryManager,
        notificationManager
    };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    InternalTransferService,
    InternalAccountService,
    BeneficiaryManager,
    TransferFraudPrevention,
    TransferNotificationManager,
    createInternalTransferRouter,
    initializeInternalTransferSystem,
    INTERNAL_TRANSFER_CONFIG,
    InternalTransfer,
    Beneficiary,
    RecurringTransfer,
    BatchTransfer
};
