// scheduledTransferService.js - Complete Scheduled Transfer System
// Features: Schedule future transfers, Recurring payments, Auto-cancellation, Notifications, Transfer history

const { v4: uuidv4 } = require('uuid');

class ScheduledTransferService {
    constructor() {
        this.scheduledTransfers = [];
        this.recurringTransfers = [];
        this.transferHistory = [];
        this.failedTransfers = [];
        this.cancelledTransfers = [];
        
        // Schedule checker interval (runs every minute)
        this.startScheduleChecker();
        
        // Initialize with sample data
        this.initializeSampleData();
    }

    // ============= 1. INITIALIZE SAMPLE DATA =============
    initializeSampleData() {
        const now = new Date();
        
        // Sample scheduled transfers
        const sampleSchedules = [
            {
                id: uuidv4(),
                userId: 'user_1',
                userName: 'Alexander Vance',
                fromAccount: 'USD',
                toAccountType: 'internal',
                toAccountId: 'user_2',
                toAccountName: 'Sarah Chen',
                amount: 5000,
                currency: 'USD',
                description: 'Monthly payment',
                scheduledDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'pending',
                priority: 'normal',
                createdAt: new Date().toISOString(),
                notificationSent: false,
                retryCount: 0,
                maxRetries: 3
            },
            {
                id: uuidv4(),
                userId: 'user_2',
                userName: 'Sarah Chen',
                fromAccount: 'EUR',
                toAccountType: 'external',
                toAccountDetails: {
                    bankName: 'Bank of America',
                    accountNumber: '****1234',
                    routingNumber: '****5678',
                    swiftCode: 'BOFAUS3N'
                },
                amount: 10000,
                currency: 'EUR',
                description: 'Investment transfer',
                scheduledDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'pending',
                priority: 'high',
                createdAt: new Date().toISOString(),
                notificationSent: false,
                retryCount: 0,
                maxRetries: 3
            }
        ];
        
        // Sample recurring transfers
        const sampleRecurring = [
            {
                id: uuidv4(),
                userId: 'user_1',
                userName: 'Alexander Vance',
                fromAccount: 'USD',
                toAccountType: 'internal',
                toAccountId: 'user_3',
                toAccountName: 'James Rodriguez',
                amount: 1000,
                currency: 'USD',
                description: 'Rent payment',
                frequency: 'monthly', // daily, weekly, monthly, yearly
                dayOfMonth: 1,
                startDate: new Date().toISOString(),
                endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString(),
                nextExecutionDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
                status: 'active', // active, paused, cancelled, completed
                totalExecutions: 0,
                maxExecutions: 12,
                createdAt: new Date().toISOString(),
                lastExecutionDate: null
            },
            {
                id: uuidv4(),
                userId: 'user_1',
                userName: 'Alexander Vance',
                fromAccount: 'BTC',
                toAccountType: 'external',
                toAccountDetails: {
                    walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
                    network: 'Bitcoin'
                },
                amount: 0.05,
                currency: 'BTC',
                description: 'Savings',
                frequency: 'weekly',
                dayOfWeek: 1, // Monday
                startDate: new Date().toISOString(),
                endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString(),
                nextExecutionDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'active',
                totalExecutions: 0,
                maxExecutions: 52,
                createdAt: new Date().toISOString(),
                lastExecutionDate: null
            }
        ];
        
        this.scheduledTransfers.push(...sampleSchedules);
        this.recurringTransfers.push(...sampleRecurring);
    }

    // ============= 2. START SCHEDULE CHECKER =============
    startScheduleChecker() {
        setInterval(async () => {
            await this.processPendingTransfers();
            await this.processRecurringTransfers();
        }, 60000); // Check every minute
    }

    // ============= 3. SCHEDULE A TRANSFER =============
    async scheduleTransfer(transferData) {
        const {
            userId,
            userName,
            fromAccount,
            toAccountType, // internal, external, crypto
            toAccountId,
            toAccountName,
            toAccountDetails,
            amount,
            currency,
            description,
            scheduledDate,
            priority = 'normal',
            maxRetries = 3
        } = transferData;

        // Validate scheduled date
        const scheduledDateTime = new Date(scheduledDate);
        if (scheduledDateTime <= new Date()) {
            return {
                success: false,
                error: 'Scheduled date must be in the future'
            };
        }

        // Validate balance (check if user has sufficient funds)
        const hasSufficientBalance = await this.checkBalance(userId, currency, amount);
        if (!hasSufficientBalance) {
            return {
                success: false,
                error: 'Insufficient balance for scheduled transfer'
            };
        }

        const scheduledTransfer = {
            id: uuidv4(),
            userId,
            userName,
            fromAccount,
            toAccountType,
            toAccountId: toAccountId || null,
            toAccountName: toAccountName || null,
            toAccountDetails: toAccountDetails || null,
            amount,
            currency,
            description: description || 'Scheduled transfer',
            scheduledDate: scheduledDateTime.toISOString(),
            status: 'pending', // pending, processed, failed, cancelled
            priority, // low, normal, high
            createdAt: new Date().toISOString(),
            processedAt: null,
            notificationSent: false,
            retryCount: 0,
            maxRetries,
            failureReason: null
        };

        this.scheduledTransfers.push(scheduledTransfer);

        // Send confirmation notification
        await this.sendNotification(userId, 'TRANSFER_SCHEDULED', {
            transferId: scheduledTransfer.id,
            amount,
            currency,
            scheduledDate: scheduledDateTime.toISOString()
        });

        return {
            success: true,
            message: 'Transfer scheduled successfully',
            transfer: scheduledTransfer
        };
    }

    // ============= 4. CREATE RECURRING TRANSFER =============
    async createRecurringTransfer(recurringData) {
        const {
            userId,
            userName,
            fromAccount,
            toAccountType,
            toAccountId,
            toAccountName,
            toAccountDetails,
            amount,
            currency,
            description,
            frequency, // daily, weekly, monthly, yearly
            dayOfMonth,
            dayOfWeek,
            startDate,
            endDate,
            maxExecutions
        } = recurringData;

        // Calculate next execution date
        const nextExecutionDate = this.calculateNextExecutionDate(frequency, dayOfMonth, dayOfWeek);

        // Validate balance
        const hasSufficientBalance = await this.checkBalance(userId, currency, amount);
        if (!hasSufficientBalance) {
            return {
                success: false,
                error: 'Insufficient balance for recurring transfer'
            };
        }

        const recurringTransfer = {
            id: uuidv4(),
            userId,
            userName,
            fromAccount,
            toAccountType,
            toAccountId: toAccountId || null,
            toAccountName: toAccountName || null,
            toAccountDetails: toAccountDetails || null,
            amount,
            currency,
            description: description || 'Recurring transfer',
            frequency, // daily, weekly, monthly, yearly
            dayOfMonth: dayOfMonth || null,
            dayOfWeek: dayOfWeek || null,
            startDate: startDate || new Date().toISOString(),
            endDate: endDate || null,
            nextExecutionDate: nextExecutionDate.toISOString(),
            status: 'active', // active, paused, cancelled, completed
            totalExecutions: 0,
            maxExecutions: maxExecutions || null,
            createdAt: new Date().toISOString(),
            lastExecutionDate: null,
            failureCount: 0
        };

        this.recurringTransfers.push(recurringTransfer);

        return {
            success: true,
            message: 'Recurring transfer created successfully',
            recurring: recurringTransfer
        };
    }

    // ============= 5. PROCESS PENDING TRANSFERS =============
    async processPendingTransfers() {
        const now = new Date();
        const pendingTransfers = this.scheduledTransfers.filter(t => 
            t.status === 'pending' && 
            new Date(t.scheduledDate) <= now
        );

        for (const transfer of pendingTransfers) {
            await this.executeTransfer(transfer);
        }
    }

    // ============= 6. PROCESS RECURRING TRANSFERS =============
    async processRecurringTransfers() {
        const now = new Date();
        const dueRecurring = this.recurringTransfers.filter(r => 
            r.status === 'active' &&
            new Date(r.nextExecutionDate) <= now &&
            (!r.endDate || new Date(r.endDate) >= now) &&
            (!r.maxExecutions || r.totalExecutions < r.maxExecutions)
        );

        for (const recurring of dueRecurring) {
            await this.executeRecurringTransfer(recurring);
        }
    }

    // ============= 7. EXECUTE A TRANSFER =============
    async executeTransfer(transfer) {
        try {
            // Check balance again before executing
            const hasSufficientBalance = await this.checkBalance(transfer.userId, transfer.currency, transfer.amount);
            
            if (!hasSufficientBalance) {
                throw new Error('Insufficient balance');
            }

            // Execute the transfer based on type
            let executionResult;
            
            if (transfer.toAccountType === 'internal') {
                executionResult = await this.executeInternalTransfer(transfer);
            } else if (transfer.toAccountType === 'external') {
                executionResult = await this.executeExternalTransfer(transfer);
            } else if (transfer.toAccountType === 'crypto') {
                executionResult = await this.executeCryptoTransfer(transfer);
            }

            if (executionResult.success) {
                transfer.status = 'processed';
                transfer.processedAt = new Date().toISOString();
                
                // Add to history
                this.transferHistory.push({
                    id: uuidv4(),
                    transferId: transfer.id,
                    userId: transfer.userId,
                    type: 'scheduled',
                    ...executionResult.details,
                    executedAt: transfer.processedAt
                });

                // Send success notification
                await this.sendNotification(transfer.userId, 'TRANSFER_COMPLETED', {
                    transferId: transfer.id,
                    amount: transfer.amount,
                    currency: transfer.currency,
                    toAccount: transfer.toAccountName || transfer.toAccountDetails?.bankName || 'External'
                });

                return { success: true };
            } else {
                throw new Error(executionResult.error);
            }
        } catch (error) {
            transfer.retryCount++;
            
            if (transfer.retryCount >= transfer.maxRetries) {
                transfer.status = 'failed';
                transfer.failureReason = error.message;
                
                this.failedTransfers.push({
                    transferId: transfer.id,
                    userId: transfer.userId,
                    reason: error.message,
                    failedAt: new Date().toISOString()
                });

                // Send failure notification
                await this.sendNotification(transfer.userId, 'TRANSFER_FAILED', {
                    transferId: transfer.id,
                    amount: transfer.amount,
                    currency: transfer.currency,
                    reason: error.message
                });
            } else {
                // Reschedule for retry (5 minutes later)
                const retryDate = new Date();
                retryDate.setMinutes(retryDate.getMinutes() + 5);
                transfer.scheduledDate = retryDate.toISOString();
            }
            
            return { success: false, error: error.message };
        }
    }

    // ============= 8. EXECUTE RECURRING TRANSFER =============
    async executeRecurringTransfer(recurring) {
        try {
            // Check balance
            const hasSufficientBalance = await this.checkBalance(recurring.userId, recurring.currency, recurring.amount);
            
            if (!hasSufficientBalance) {
                recurring.failureCount++;
                
                if (recurring.failureCount >= 3) {
                    recurring.status = 'paused';
                    await this.sendNotification(recurring.userId, 'RECURRING_PAUSED', {
                        recurringId: recurring.id,
                        reason: 'Insufficient balance for 3 consecutive attempts'
                    });
                }
                return { success: false };
            }

            // Execute the transfer
            let executionResult;
            
            if (recurring.toAccountType === 'internal') {
                executionResult = await this.executeInternalTransfer(recurring);
            } else if (recurring.toAccountType === 'external') {
                executionResult = await this.executeExternalTransfer(recurring);
            } else if (recurring.toAccountType === 'crypto') {
                executionResult = await this.executeCryptoTransfer(recurring);
            }

            if (executionResult.success) {
                recurring.totalExecutions++;
                recurring.lastExecutionDate = new Date().toISOString();
                recurring.failureCount = 0;
                
                // Calculate next execution date
                recurring.nextExecutionDate = this.calculateNextExecutionDate(
                    recurring.frequency,
                    recurring.dayOfMonth,
                    recurring.dayOfWeek,
                    true
                ).toISOString();
                
                // Check if completed
                if (recurring.maxExecutions && recurring.totalExecutions >= recurring.maxExecutions) {
                    recurring.status = 'completed';
                }
                
                if (recurring.endDate && new Date(recurring.endDate) <= new Date()) {
                    recurring.status = 'completed';
                }

                // Add to history
                this.transferHistory.push({
                    id: uuidv4(),
                    recurringId: recurring.id,
                    userId: recurring.userId,
                    type: 'recurring',
                    executionNumber: recurring.totalExecutions,
                    ...executionResult.details,
                    executedAt: recurring.lastExecutionDate
                });

                // Send notification
                await this.sendNotification(recurring.userId, 'RECURRING_EXECUTED', {
                    recurringId: recurring.id,
                    amount: recurring.amount,
                    currency: recurring.currency,
                    executionNumber: recurring.totalExecutions
                });
            }
        } catch (error) {
            console.error(`Failed to execute recurring transfer ${recurring.id}:`, error);
        }
    }

    // ============= 9. EXECUTE INTERNAL TRANSFER =============
    async executeInternalTransfer(transfer) {
        // In production, this would update balances in your database
        // Simulating successful transfer
        return {
            success: true,
            details: {
                fromUser: transfer.userId,
                toUser: transfer.toAccountId,
                amount: transfer.amount,
                currency: transfer.currency,
                reference: transfer.id
            }
        };
    }

    // ============= 10. EXECUTE EXTERNAL TRANSFER =============
    async executeExternalTransfer(transfer) {
        // In production, integrate with banking APIs (Plaid, Yapily, etc.)
        // Simulating successful transfer
        return {
            success: true,
            details: {
                bankName: transfer.toAccountDetails?.bankName,
                accountNumber: transfer.toAccountDetails?.accountNumber,
                amount: transfer.amount,
                currency: transfer.currency,
                swiftCode: transfer.toAccountDetails?.swiftCode,
                reference: transfer.id
            }
        };
    }

    // ============= 11. EXECUTE CRYPTO TRANSFER =============
    async executeCryptoTransfer(transfer) {
        // In production, integrate with blockchain APIs (Web3, Ethers, etc.)
        // Simulating successful transfer
        return {
            success: true,
            details: {
                walletAddress: transfer.toAccountDetails?.walletAddress,
                network: transfer.toAccountDetails?.network,
                amount: transfer.amount,
                currency: transfer.currency,
                transactionHash: '0x' + Math.random().toString(36).substring(2, 15),
                reference: transfer.id
            }
        };
    }

    // ============= 12. CHECK USER BALANCE =============
    async checkBalance(userId, currency, amount) {
        // In production, query your balance service
        // Simulating balance check
        return true;
    }

    // ============= 13. CALCULATE NEXT EXECUTION DATE =============
    calculateNextExecutionDate(frequency, dayOfMonth, dayOfWeek, fromCurrent = false) {
        const now = new Date();
        let nextDate = new Date();
        
        if (!fromCurrent) {
            nextDate = now;
        }
        
        switch (frequency) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekly':
                const currentDay = nextDate.getDay();
                let daysToAdd = (dayOfWeek - currentDay + 7) % 7;
                if (daysToAdd === 0 && !fromCurrent) daysToAdd = 7;
                nextDate.setDate(nextDate.getDate() + daysToAdd);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                if (dayOfMonth) {
                    nextDate.setDate(dayOfMonth);
                }
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        
        return nextDate;
    }

    // ============= 14. CANCEL SCHEDULED TRANSFER =============
    async cancelScheduledTransfer(transferId, userId, reason) {
        const transfer = this.scheduledTransfers.find(t => t.id === transferId);
        
        if (!transfer) {
            return { success: false, error: 'Transfer not found' };
        }
        
        if (transfer.userId !== userId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        if (transfer.status !== 'pending') {
            return { success: false, error: 'Cannot cancel transfer that is already processed or failed' };
        }
        
        transfer.status = 'cancelled';
        this.cancelledTransfers.push({
            transferId: transfer.id,
            userId: transfer.userId,
            reason,
            cancelledAt: new Date().toISOString()
        });
        
        await this.sendNotification(userId, 'TRANSFER_CANCELLED', {
            transferId: transfer.id,
            amount: transfer.amount,
            currency: transfer.currency,
            reason
        });
        
        return {
            success: true,
            message: 'Transfer cancelled successfully'
        };
    }

    // ============= 15. PAUSE/RESUME RECURRING TRANSFER =============
    async pauseRecurringTransfer(recurringId, userId) {
        const recurring = this.recurringTransfers.find(r => r.id === recurringId);
        
        if (!recurring) {
            return { success: false, error: 'Recurring transfer not found' };
        }
        
        if (recurring.userId !== userId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        recurring.status = 'paused';
        
        await this.sendNotification(userId, 'RECURRING_PAUSED', {
            recurringId: recurring.id,
            amount: recurring.amount,
            currency: recurring.currency
        });
        
        return { success: true, message: 'Recurring transfer paused' };
    }

    async resumeRecurringTransfer(recurringId, userId) {
        const recurring = this.recurringTransfers.find(r => r.id === recurringId);
        
        if (!recurring) {
            return { success: false, error: 'Recurring transfer not found' };
        }
        
        if (recurring.userId !== userId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        recurring.status = 'active';
        
        await this.sendNotification(userId, 'RECURRING_RESUMED', {
            recurringId: recurring.id,
            amount: recurring.amount,
            currency: recurring.currency
        });
        
        return { success: true, message: 'Recurring transfer resumed' };
    }

    // ============= 16. GET USER'S SCHEDULED TRANSFERS =============
    async getUserScheduledTransfers(userId, filters = {}) {
        let transfers = this.scheduledTransfers.filter(t => t.userId === userId);
        
        if (filters.status) {
            transfers = transfers.filter(t => t.status === filters.status);
        }
        
        if (filters.startDate) {
            transfers = transfers.filter(t => new Date(t.scheduledDate) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            transfers = transfers.filter(t => new Date(t.scheduledDate) <= new Date(filters.endDate));
        }
        
        transfers.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        
        return {
            success: true,
            total: transfers.length,
            transfers
        };
    }

    // ============= 17. GET USER'S RECURRING TRANSFERS =============
    async getUserRecurringTransfers(userId) {
        const recurring = this.recurringTransfers.filter(r => r.userId === userId);
        
        return {
            success: true,
            total: recurring.length,
            recurring
        };
    }

    // ============= 18. GET TRANSFER HISTORY =============
    async getTransferHistory(userId, filters = {}) {
        let history = this.transferHistory.filter(h => h.userId === userId);
        
        if (filters.type) {
            history = history.filter(h => h.type === filters.type);
        }
        
        if (filters.startDate) {
            history = history.filter(h => new Date(h.executedAt) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            history = history.filter(h => new Date(h.executedAt) <= new Date(filters.endDate));
        }
        
        history.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));
        
        const limit = parseInt(filters.limit) || 50;
        const page = parseInt(filters.page) || 1;
        const startIndex = (page - 1) * limit;
        
        return {
            success: true,
            total: history.length,
            page,
            limit,
            history: history.slice(startIndex, startIndex + limit)
        };
    }

    // ============= 19. UPDATE SCHEDULED TRANSFER =============
    async updateScheduledTransfer(transferId, userId, updateData) {
        const transfer = this.scheduledTransfers.find(t => t.id === transferId);
        
        if (!transfer) {
            return { success: false, error: 'Transfer not found' };
        }
        
        if (transfer.userId !== userId) {
            return { success: false, error: 'Unauthorized' };
        }
        
        if (transfer.status !== 'pending') {
            return { success: false, error: 'Cannot update transfer that is already processed' };
        }
        
        if (updateData.scheduledDate) {
            const newDate = new Date(updateData.scheduledDate);
            if (newDate <= new Date()) {
                return { success: false, error: 'Scheduled date must be in the future' };
            }
            transfer.scheduledDate = newDate.toISOString();
        }
        
        if (updateData.amount) {
            transfer.amount = updateData.amount;
        }
        
        if (updateData.description) {
            transfer.description = updateData.description;
        }
        
        if (updateData.priority) {
            transfer.priority = updateData.priority;
        }
        
        await this.sendNotification(userId, 'TRANSFER_UPDATED', {
            transferId: transfer.id,
            updates: Object.keys(updateData)
        });
        
        return {
            success: true,
            message: 'Transfer updated successfully',
            transfer
        };
    }

    // ============= 20. GET UPCOMING TRANSFERS SUMMARY =============
    async getUpcomingTransfersSummary(userId) {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const scheduled = this.scheduledTransfers.filter(t => 
            t.userId === userId && 
            t.status === 'pending' &&
            new Date(t.scheduledDate) >= now &&
            new Date(t.scheduledDate) <= nextWeek
        );
        
        const recurring = this.recurringTransfers.filter(r => 
            r.userId === userId && 
            r.status === 'active' &&
            new Date(r.nextExecutionDate) >= now &&
            new Date(r.nextExecutionDate) <= nextWeek
        );
        
        const totalAmount = [...scheduled, ...recurring].reduce((sum, t) => sum + t.amount, 0);
        
        return {
            success: true,
            scheduledCount: scheduled.length,
            recurringCount: recurring.length,
            totalAmount,
            totalAmountFormatted: `$${totalAmount.toLocaleString()}`,
            upcoming: {
                scheduled: scheduled.map(s => ({
                    id: s.id,
                    date: s.scheduledDate,
                    amount: s.amount,
                    currency: s.currency,
                    description: s.description,
                    toAccount: s.toAccountName
                })),
                recurring: recurring.map(r => ({
                    id: r.id,
                    date: r.nextExecutionDate,
                    amount: r.amount,
                    currency: r.currency,
                    description: r.description,
                    frequency: r.frequency
                }))
            }
        };
    }

    // ============= 21. GET TRANSFER STATISTICS =============
    async getTransferStatistics(userId, period = '30d') {
        const now = new Date();
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
        }
        
        const history = this.transferHistory.filter(h => 
            h.userId === userId && 
            new Date(h.executedAt) >= startDate
        );
        
        const totalTransfers = history.length;
        const totalAmount = history.reduce((sum, h) => sum + h.amount, 0);
        
        const byType = {
            scheduled: history.filter(h => h.type === 'scheduled').length,
            recurring: history.filter(h => h.type === 'recurring').length
        };
        
        const byCurrency = {};
        history.forEach(h => {
            if (!byCurrency[h.currency]) {
                byCurrency[h.currency] = { count: 0, amount: 0 };
            }
            byCurrency[h.currency].count++;
            byCurrency[h.currency].amount += h.amount;
        });
        
        return {
            success: true,
            period,
            statistics: {
                totalTransfers,
                totalAmount,
                averageAmount: totalTransfers > 0 ? totalAmount / totalTransfers : 0,
                byType,
                byCurrency,
                mostActiveDay: this.getMostActiveDay(history)
            }
        };
    }

    // ============= 22. SEND NOTIFICATION =============
    async sendNotification(userId, type, data) {
        // In production, integrate with email/SMS/push notification service
        console.log(`📧 Notification sent to ${userId}: ${type}`, data);
        return true;
    }

    // ============= HELPER FUNCTIONS =============
    getMostActiveDay(history) {
        const dayCount = {};
        history.forEach(h => {
            const day = new Date(h.executedAt).toLocaleDateString();
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
        
        return { date: maxDay, count: maxCount };
    }
}

module.exports = new ScheduledTransferService();
