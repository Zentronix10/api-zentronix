// detailedHistoryService.js - Complete Transaction History System
// Features: Full transaction logging, Filtering, Export capabilities, Audit trail, Statement generation

const { v4: uuidv4 } = require('uuid');

class DetailedHistoryService {
    constructor() {
        this.transactions = [];
        this.auditLogs = [];
        this.statements = [];
        this.exportJobs = [];
        
        // Initialize with sample data
        this.initializeSampleTransactions();
    }

    // ============= 1. INITIALIZE SAMPLE TRANSACTIONS =============
    initializeSampleTransactions() {
        const now = new Date();
        const users = [
            { id: 'user_1', name: 'Alexander Vance' },
            { id: 'user_2', name: 'Sarah Chen' },
            { id: 'user_3', name: 'James Rodriguez' },
            { id: 'user_4', name: 'Maria Silva' }
        ];
        
        const transactionTypes = [
            'transfer', 'deposit', 'withdrawal', 'payment', 'crypto_purchase',
            'crypto_sale', 'loan_disbursement', 'loan_repayment', 'fee', 'interest',
            'card_payment', 'card_refund', 'exchange', 'staking_reward', 'referral_bonus'
        ];
        
        const statuses = ['completed', 'pending', 'failed', 'reversed', 'cancelled'];
        
        for (let i = 0; i < 500; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const amount = this.generateRandomAmount(type);
            const currency = this.getRandomCurrency();
            
            const transaction = {
                id: uuidv4(),
                userId: user.id,
                userName: user.name,
                type: type,
                status: status,
                amount: amount,
                currency: currency,
                fee: this.calculateFee(amount, type),
                totalAmount: amount + this.calculateFee(amount, type),
                description: this.generateDescription(type, amount, currency),
                reference: `TXN_${Date.now()}_${i}`,
                counterparty: this.getRandomCounterparty(),
                metadata: {
                    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
                    deviceInfo: this.getRandomDevice(),
                    location: this.getRandomLocation(),
                    category: this.getTransactionCategory(type)
                },
                createdAt: new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
                completedAt: status === 'completed' ? new Date().toISOString() : null,
                tags: this.generateTags(type, status)
            };
            
            this.transactions.push(transaction);
        }
        
        // Sort by date (newest first)
        this.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    generateRandomAmount(type) {
        const ranges = {
            transfer: [100, 50000],
            deposit: [500, 100000],
            withdrawal: [50, 20000],
            payment: [10, 5000],
            crypto_purchase: [100, 50000],
            crypto_sale: [100, 50000],
            loan_disbursement: [5000, 200000],
            loan_repayment: [500, 10000],
            fee: [1, 50],
            interest: [10, 500],
            card_payment: [5, 3000],
            card_refund: [5, 3000],
            exchange: [100, 10000],
            staking_reward: [10, 500],
            referral_bonus: [25, 500]
        };
        
        const range = ranges[type] || [10, 1000];
        return Math.round((Math.random() * (range[1] - range[0]) + range[0]) * 100) / 100;
    }

    getRandomCurrency() {
        const currencies = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'BRADICOIN', 'SOL', 'USDT', 'BNB', 'LTC'];
        return currencies[Math.floor(Math.random() * currencies.length)];
    }

    calculateFee(amount, type) {
        const feeRates = {
            transfer: 0.001,
            withdrawal: 0.005,
            crypto_purchase: 0.002,
            crypto_sale: 0.002,
            exchange: 0.0015,
            card_payment: 0.02
        };
        
        const rate = feeRates[type] || 0;
        return Math.round(amount * rate * 100) / 100;
    }

    generateDescription(type, amount, currency) {
        const descriptions = {
            transfer: `Transfer of ${currency} ${amount.toLocaleString()}`,
            deposit: `Deposit of ${currency} ${amount.toLocaleString()}`,
            withdrawal: `Withdrawal of ${currency} ${amount.toLocaleString()}`,
            payment: `Payment of ${currency} ${amount.toLocaleString()}`,
            crypto_purchase: `Purchase of ${currency} ${amount.toLocaleString()}`,
            crypto_sale: `Sale of ${currency} ${amount.toLocaleString()}`,
            loan_disbursement: `Loan disbursement of ${currency} ${amount.toLocaleString()}`,
            loan_repayment: `Loan repayment of ${currency} ${amount.toLocaleString()}`,
            fee: `Service fee of ${currency} ${amount.toLocaleString()}`,
            interest: `Interest earned of ${currency} ${amount.toLocaleString()}`,
            card_payment: `Card payment of ${currency} ${amount.toLocaleString()}`,
            card_refund: `Card refund of ${currency} ${amount.toLocaleString()}`,
            exchange: `Currency exchange of ${currency} ${amount.toLocaleString()}`,
            staking_reward: `Staking reward of ${currency} ${amount.toLocaleString()}`,
            referral_bonus: `Referral bonus of ${currency} ${amount.toLocaleString()}`
        };
        
        return descriptions[type] || `Transaction of ${currency} ${amount.toLocaleString()}`;
    }

    getRandomCounterparty() {
        const counterparts = [
            'Bank of America', 'Coinbase', 'Binance', 'Kraken', 'Revolut',
            'Wise', 'PayPal', 'Stripe', 'Visa', 'Mastercard', 'Internal Transfer',
            'Zentronix Bank', 'Crypto.com', 'Ledger', 'Trezor'
        ];
        return counterparts[Math.floor(Math.random() * counterparts.length)];
    }

    getRandomDevice() {
        const devices = [
            'Chrome on Windows', 'Safari on Mac', 'Firefox on Linux',
            'Chrome on Android', 'Safari on iOS', 'Edge on Windows'
        ];
        return devices[Math.floor(Math.random() * devices.length)];
    }

    getRandomLocation() {
        const locations = [
            'New York, USA', 'London, UK', 'Singapore', 'Zurich, Switzerland',
            'Dubai, UAE', 'Hong Kong', 'Tokyo, Japan', 'Berlin, Germany'
        ];
        return locations[Math.floor(Math.random() * locations.length)];
    }

    getTransactionCategory(type) {
        const categories = {
            transfer: 'Internal Transfer',
            deposit: 'Funding',
            withdrawal: 'Withdrawal',
            payment: 'Payment',
            crypto_purchase: 'Crypto Investment',
            crypto_sale: 'Crypto Liquidation',
            loan_disbursement: 'Credit',
            loan_repayment: 'Credit Repayment',
            fee: 'Bank Fee',
            interest: 'Earnings',
            card_payment: 'Card Transaction',
            card_refund: 'Card Refund',
            exchange: 'Currency Exchange',
            staking_reward: 'Crypto Earnings',
            referral_bonus: 'Bonus'
        };
        return categories[type] || 'Other';
    }

    generateTags(type, status) {
        const tags = [type, status];
        if (status === 'completed') tags.push('settled');
        if (['crypto_purchase', 'crypto_sale'].includes(type)) tags.push('crypto');
        if (['deposit', 'withdrawal'].includes(type)) tags.push('fiat');
        if (status === 'pending') tags.push('unsettled');
        return tags;
    }

    // ============= 2. ADD NEW TRANSACTION =============
    async addTransaction(transactionData) {
        const transaction = {
            id: uuidv4(),
            ...transactionData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata: {
                ...transactionData.metadata,
                recordedAt: new Date().toISOString()
            }
        };
        
        this.transactions.unshift(transaction);
        
        // Add to audit log
        await this.addAuditLog({
            action: 'TRANSACTION_CREATED',
            transactionId: transaction.id,
            userId: transaction.userId,
            details: transaction
        });
        
        return transaction;
    }

    // ============= 3. GET TRANSACTION HISTORY =============
    async getTransactionHistory(userId, filters = {}) {
        let filteredTransactions = this.transactions.filter(t => t.userId === userId);
        
        // Apply filters
        if (filters.type) {
            filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
        }
        
        if (filters.status) {
            filteredTransactions = filteredTransactions.filter(t => t.status === filters.status);
        }
        
        if (filters.currency) {
            filteredTransactions = filteredTransactions.filter(t => t.currency === filters.currency);
        }
        
        if (filters.startDate) {
            filteredTransactions = filteredTransactions.filter(t => new Date(t.createdAt) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            filteredTransactions = filteredTransactions.filter(t => new Date(t.createdAt) <= new Date(filters.endDate));
        }
        
        if (filters.minAmount) {
            filteredTransactions = filteredTransactions.filter(t => t.amount >= parseFloat(filters.minAmount));
        }
        
        if (filters.maxAmount) {
            filteredTransactions = filteredTransactions.filter(t => t.amount <= parseFloat(filters.maxAmount));
        }
        
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            filteredTransactions = filteredTransactions.filter(t => 
                t.description.toLowerCase().includes(searchTerm) ||
                t.reference.toLowerCase().includes(searchTerm) ||
                t.counterparty.toLowerCase().includes(searchTerm)
            );
        }
        
        if (filters.category) {
            filteredTransactions = filteredTransactions.filter(t => 
                this.getTransactionCategory(t.type) === filters.category
            );
        }
        
        if (filters.tags && filters.tags.length > 0) {
            filteredTransactions = filteredTransactions.filter(t => 
                filters.tags.some(tag => t.tags.includes(tag))
            );
        }
        
        // Pagination
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 50;
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
        
        // Calculate summary
        const summary = this.calculateTransactionSummary(filteredTransactions);
        
        return {
            success: true,
            userId: userId,
            filters: filters,
            pagination: {
                currentPage: page,
                limit: limit,
                total: filteredTransactions.length,
                totalPages: Math.ceil(filteredTransactions.length / limit),
                hasNext: endIndex < filteredTransactions.length,
                hasPrev: page > 1
            },
            transactions: paginatedTransactions,
            summary: summary,
            timestamp: new Date().toISOString()
        };
    }

    // ============= 4. CALCULATE TRANSACTION SUMMARY =============
    calculateTransactionSummary(transactions) {
        const summary = {
            totalTransactions: transactions.length,
            totalInflow: 0,
            totalOutflow: 0,
            netFlow: 0,
            byType: {},
            byCurrency: {},
            byStatus: {},
            byMonth: {}
        };
        
        transactions.forEach(transaction => {
            // Track by type
            if (!summary.byType[transaction.type]) {
                summary.byType[transaction.type] = { count: 0, amount: 0 };
            }
            summary.byType[transaction.type].count++;
            summary.byType[transaction.type].amount += transaction.amount;
            
            // Track by currency
            if (!summary.byCurrency[transaction.currency]) {
                summary.byCurrency[transaction.currency] = { count: 0, amount: 0 };
            }
            summary.byCurrency[transaction.currency].count++;
            summary.byCurrency[transaction.currency].amount += transaction.amount;
            
            // Track by status
            if (!summary.byStatus[transaction.status]) {
                summary.byStatus[transaction.status] = 0;
            }
            summary.byStatus[transaction.status]++;
            
            // Track inflow/outflow
            const isInflow = ['deposit', 'crypto_sale', 'loan_disbursement', 'interest', 'staking_reward', 'referral_bonus', 'card_refund'].includes(transaction.type);
            const isOutflow = ['withdrawal', 'payment', 'crypto_purchase', 'loan_repayment', 'fee', 'card_payment', 'exchange'].includes(transaction.type);
            
            if (isInflow && transaction.status === 'completed') {
                summary.totalInflow += transaction.amount;
            }
            if (isOutflow && transaction.status === 'completed') {
                summary.totalOutflow += transaction.amount;
            }
            
            // Track by month
            const month = new Date(transaction.createdAt).toISOString().slice(0, 7);
            if (!summary.byMonth[month]) {
                summary.byMonth[month] = { count: 0, inflow: 0, outflow: 0 };
            }
            summary.byMonth[month].count++;
            if (isInflow) summary.byMonth[month].inflow += transaction.amount;
            if (isOutflow) summary.byMonth[month].outflow += transaction.amount;
        });
        
        summary.netFlow = summary.totalInflow - summary.totalOutflow;
        
        return summary;
    }

    // ============= 5. GET TRANSACTION DETAILS =============
    async getTransactionDetails(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        
        if (!transaction) {
            return {
                success: false,
                error: 'Transaction not found'
            };
        }
        
        return {
            success: true,
            transaction: transaction,
            relatedTransactions: this.getRelatedTransactions(transaction)
        };
    }

    // ============= 6. GET RELATED TRANSACTIONS =============
    getRelatedTransactions(transaction) {
        return this.transactions.filter(t => 
            t.reference === transaction.reference && t.id !== transaction.id
        );
    }

    // ============= 7. UPDATE TRANSACTION STATUS =============
    async updateTransactionStatus(transactionId, newStatus, updatedBy, reason) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        
        if (!transaction) {
            return {
                success: false,
                error: 'Transaction not found'
            };
        }
        
        const oldStatus = transaction.status;
        transaction.status = newStatus;
        transaction.updatedAt = new Date().toISOString();
        
        if (newStatus === 'completed') {
            transaction.completedAt = new Date().toISOString();
        }
        
        // Add to audit log
        await this.addAuditLog({
            action: 'TRANSACTION_STATUS_UPDATED',
            transactionId: transactionId,
            userId: transaction.userId,
            updatedBy: updatedBy,
            details: {
                oldStatus: oldStatus,
                newStatus: newStatus,
                reason: reason
            }
        });
        
        return {
            success: true,
            transaction: transaction,
            oldStatus: oldStatus,
            newStatus: newStatus
        };
    }

    // ============= 8. GENERATE STATEMENT =============
    async generateStatement(userId, statementType, dateRange, format = 'pdf') {
        const statementId = uuidv4();
        const transactions = await this.getTransactionHistory(userId, {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            limit: 10000
        });
        
        const summary = this.calculateTransactionSummary(transactions.transactions);
        
        const statement = {
            id: statementId,
            userId: userId,
            type: statementType, // account_statement, tax_statement, crypto_statement
            format: format,
            dateRange: dateRange,
            generatedAt: new Date().toISOString(),
            transactions: transactions.transactions,
            summary: summary,
            status: 'pending'
        };
        
        this.statements.push(statement);
        
        // Simulate generation process
        this.processStatementGeneration(statementId);
        
        return {
            success: true,
            statementId: statementId,
            message: 'Statement generation started',
            estimatedCompletion: new Date(Date.now() + 30000).toISOString()
        };
    }

    async processStatementGeneration(statementId) {
        const statement = this.statements.find(s => s.id === statementId);
        if (statement) {
            setTimeout(() => {
                statement.status = 'completed';
                statement.completedAt = new Date().toISOString();
                statement.downloadUrl = `/api/history/statements/download/${statementId}`;
            }, 5000);
        }
    }

    async getStatement(statementId) {
        const statement = this.statements.find(s => s.id === statementId);
        
        if (!statement) {
            return {
                success: false,
                error: 'Statement not found'
            };
        }
        
        return {
            success: true,
            statement: statement
        };
    }

    async downloadStatement(statementId) {
        const statement = this.statements.find(s => s.id === statementId);
        
        if (!statement || statement.status !== 'completed') {
            return {
                success: false,
                error: 'Statement not ready for download'
            };
        }
        
        // Generate CSV/PDF content
        const content = this.generateStatementContent(statement);
        
        return {
            success: true,
            content: content,
            filename: `statement_${statementId}.csv`,
            mimeType: 'text/csv'
        };
    }

    generateStatementContent(statement) {
        let csv = 'Date,Type,Description,Amount,Currency,Fee,Total,Status,Reference,Counterparty\n';
        
        statement.transactions.forEach(t => {
            csv += `${t.createdAt},${t.type},"${t.description}",${t.amount},${t.currency},${t.fee},${t.totalAmount},${t.status},${t.reference},${t.counterparty}\n`;
        });
        
        csv += `\n\nSUMMARY\n`;
        csv += `Total Transactions,${statement.summary.totalTransactions}\n`;
        csv += `Total Inflow,${statement.summary.totalInflow}\n`;
        csv += `Total Outflow,${statement.summary.totalOutflow}\n`;
        csv += `Net Flow,${statement.summary.netFlow}\n`;
        
        return csv;
    }

    // ============= 9. EXPORT TRANSACTIONS =============
    async exportTransactions(userId, filters, format = 'csv') {
        const exportId = uuidv4();
        const transactions = await this.getTransactionHistory(userId, filters);
        
        const exportJob = {
            id: exportId,
            userId: userId,
            format: format,
            filters: filters,
            totalTransactions: transactions.transactions.length,
            status: 'processing',
            createdAt: new Date().toISOString(),
            downloadUrl: null
        };
        
        this.exportJobs.push(exportJob);
        
        // Process export
        this.processExport(exportId, transactions.transactions, format);
        
        return {
            success: true,
            exportId: exportId,
            message: 'Export started',
            totalTransactions: transactions.transactions.length
        };
    }

    async processExport(exportId, transactions, format) {
        const exportJob = this.exportJobs.find(e => e.id === exportId);
        
        setTimeout(() => {
            let content = '';
            
            if (format === 'csv') {
                content = this.convertToCSV(transactions);
            } else if (format === 'json') {
                content = JSON.stringify(transactions, null, 2);
            } else if (format === 'xlsx') {
                content = this.convertToXLSX(transactions);
            }
            
            exportJob.status = 'completed';
            exportJob.completedAt = new Date().toISOString();
            exportJob.downloadUrl = `/api/history/export/download/${exportId}`;
            exportJob.content = content;
        }, 3000);
    }

    convertToCSV(transactions) {
        let csv = 'Date,Type,Description,Amount,Currency,Fee,Total,Status,Reference,Counterparty,Location,Device\n';
        
        transactions.forEach(t => {
            csv += `${t.createdAt},${t.type},"${t.description}",${t.amount},${t.currency},${t.fee},${t.totalAmount},${t.status},${t.reference},${t.counterparty},${t.metadata.location},${t.metadata.deviceInfo}\n`;
        });
        
        return csv;
    }

    convertToXLSX(transactions) {
        // Simplified - in production use a library like xlsx
        return JSON.stringify(transactions, null, 2);
    }

    async getExportStatus(exportId) {
        const exportJob = this.exportJobs.find(e => e.id === exportId);
        
        if (!exportJob) {
            return {
                success: false,
                error: 'Export job not found'
            };
        }
        
        return {
            success: true,
            export: exportJob
        };
    }

    async downloadExport(exportId) {
        const exportJob = this.exportJobs.find(e => e.id === exportId);
        
        if (!exportJob || exportJob.status !== 'completed') {
            return {
                success: false,
                error: 'Export not ready'
            };
        }
        
        return {
            success: true,
            content: exportJob.content,
            filename: `transactions_export_${exportId}.${exportJob.format}`,
            mimeType: exportJob.format === 'csv' ? 'text/csv' : 'application/json'
        };
    }

    // ============= 10. ADD AUDIT LOG =============
    async addAuditLog(logData) {
        const auditLog = {
            id: uuidv4(),
            ...logData,
            timestamp: new Date().toISOString()
        };
        
        this.auditLogs.unshift(auditLog);
        
        // Keep only last 10,000 logs
        if (this.auditLogs.length > 10000) {
            this.auditLogs = this.auditLogs.slice(0, 10000);
        }
        
        return auditLog;
    }

    async getAuditLogs(filters = {}) {
        let logs = this.auditLogs;
        
        if (filters.userId) {
            logs = logs.filter(l => l.userId === filters.userId);
        }
        
        if (filters.action) {
            logs = logs.filter(l => l.action === filters.action);
        }
        
        if (filters.startDate) {
            logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.endDate));
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 100;
        const startIndex = (page - 1) * limit;
        
        return {
            success: true,
            total: logs.length,
            page: page,
            limit: limit,
            logs: logs.slice(startIndex, startIndex + limit)
        };
    }

    // ============= 11. GET TRANSACTION STATISTICS =============
    async getTransactionStatistics(userId, period = '30d') {
        const endDate = new Date();
        let startDate = new Date();
        
        switch (period) {
            case '7d':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(startDate.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(startDate.getDate() - 90);
                break;
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
        }
        
        const transactions = await this.getTransactionHistory(userId, {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            limit: 10000
        });
        
        const stats = {
            period: period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalTransactions: transactions.transactions.length,
            totalVolume: transactions.summary.totalInflow + transactions.summary.totalOutflow,
            netChange: transactions.summary.netFlow,
            averageTransaction: (transactions.summary.totalInflow + transactions.summary.totalOutflow) / transactions.transactions.length || 0,
            mostActiveDay: this.getMostActiveDay(transactions.transactions),
            topCategories: Object.entries(transactions.summary.byType)
                .sort((a, b) => b[1].amount - a[1].amount)
                .slice(0, 5)
                .map(([category, data]) => ({ category, amount: data.amount, count: data.count })),
            dailyAverage: this.calculateDailyAverage(transactions.transactions, startDate, endDate)
        };
        
        return {
            success: true,
            statistics: stats
        };
    }

    getMostActiveDay(transactions) {
        const dayCount = {};
        
        transactions.forEach(t => {
            const day = new Date(t.createdAt).toISOString().slice(0, 10);
            dayCount[day] = (dayCount[day] || 0) + 1;
        });
        
        let maxDay = null;
        let maxCount = 0;
        
        for (const [day, count] of Object.entries(dayCount)) {
            if (count > maxCount) {
                maxCount = count;
                maxDay = day;
            }
        }
        
        return { date: maxDay, transactionCount: maxCount };
    }

    calculateDailyAverage(transactions, startDate, endDate) {
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
        return totalVolume / days;
    }

    // ============= 12. SEARCH TRANSACTIONS =============
    async searchTransactions(userId, query, filters = {}) {
        let results = this.transactions.filter(t => t.userId === userId);
        
        // Search in description, reference, counterparty
        const searchLower = query.toLowerCase();
        results = results.filter(t => 
            t.description.toLowerCase().includes(searchLower) ||
            t.reference.toLowerCase().includes(searchLower) ||
            t.counterparty.toLowerCase().includes(searchLower)
        );
        
        // Apply additional filters
        if (filters.type) {
            results = results.filter(t => t.type === filters.type);
        }
        
        if (filters.status) {
            results = results.filter(t => t.status === filters.status);
        }
        
        if (filters.minAmount) {
            results = results.filter(t => t.amount >= filters.minAmount);
        }
        
        if (filters.maxAmount) {
            results = results.filter(t => t.amount <= filters.maxAmount);
        }
        
        return {
            success: true,
            query: query,
            totalResults: results.length,
            transactions: results.slice(0, 100),
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new DetailedHistoryService();
