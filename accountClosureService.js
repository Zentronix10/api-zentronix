// accountClosureService.js - Complete Account Closure System
// Features: Account closure requests, Balance settlement, Document export, Cooling-off period, Reinstatement

const { v4: uuidv4 } = require('uuid');

class AccountClosureService {
    constructor() {
        this.closureRequests = new Map(); // requestId -> request details
        this.closedAccounts = new Map(); // accountId -> closure details
        this.pendingSettlements = new Map(); // accountId -> settlement details
        this.reinstatementRequests = new Map(); // requestId -> reinstatement details
        this.closureReasons = this.initializeClosureReasons();
        
        // Initialize with sample data
        this.initializeSampleData();
    }

    // ============= 1. INITIALIZE CLOSURE REASONS =============
    initializeClosureReasons() {
        return {
            dissatisfied_service: {
                name: 'Dissatisfied with Service',
                category: 'service',
                requiresFeedback: true,
                coolingOffDays: 0,
                canReinstate: true
            },
            better_rates_elsewhere: {
                name: 'Found Better Rates Elsewhere',
                category: 'competitive',
                requiresFeedback: true,
                coolingOffDays: 0,
                canReinstate: true
            },
            moving_abroad: {
                name: 'Moving Abroad',
                category: 'relocation',
                requiresFeedback: false,
                coolingOffDays: 0,
                canReinstate: true
            },
            no_longer_need: {
                name: 'No Longer Need Account',
                category: 'personal',
                requiresFeedback: false,
                coolingOffDays: 0,
                canReinstate: true
            },
            security_concern: {
                name: 'Security Concerns',
                category: 'security',
                requiresFeedback: true,
                coolingOffDays: 7,
                canReinstate: true,
                requiresVerification: true
            },
            compliance_issue: {
                name: 'Compliance Related',
                category: 'compliance',
                requiresFeedback: false,
                coolingOffDays: 0,
                canReinstate: false
            },
            deceased: {
                name: 'Account Holder Deceased',
                category: 'estate',
                requiresFeedback: false,
                coolingOffDays: 0,
                canReinstate: false,
                requiresLegalDocs: true
            },
            business_closed: {
                name: 'Business Closed',
                category: 'business',
                requiresFeedback: false,
                coolingOffDays: 0,
                canReinstate: true
            },
            duplicate_account: {
                name: 'Duplicate Account',
                category: 'administrative',
                requiresFeedback: false,
                coolingOffDays: 0,
                canReinstate: true
            },
            fraud_prevention: {
                name: 'Fraud Prevention',
                category: 'security',
                requiresFeedback: false,
                coolingOffDays: 30,
                canReinstate: false,
                requiresInvestigation: true
            }
        };
    }

    // ============= 2. INITIALIZE SAMPLE DATA =============
    initializeSampleData() {
        // Sample closed account
        const sampleClosedAccount = {
            accountId: 'user_6',
            userName: 'Robert Johnson',
            email: 'robert@example.com',
            closedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            closedBy: 'user',
            reason: 'moving_abroad',
            reasonText: 'Relocating to Europe',
            status: 'closed',
            settlementCompleted: true,
            fundsTransferred: true,
            documentsExported: true,
            coolingOffPeriodEnded: true,
            canReinstate: true,
            reinstatementDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        this.closedAccounts.set('user_6', sampleClosedAccount);
        
        // Sample pending closure request
        const sampleRequest = {
            id: uuidv4(),
            accountId: 'user_7',
            userName: 'Maria Garcia',
            email: 'maria@example.com',
            requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            reason: 'dissatisfied_service',
            reasonText: 'Poor customer support experience',
            feedback: 'Response times are too slow',
            status: 'pending_review',
            closureDate: null,
            processedBy: null,
            processedAt: null,
            settlementDetails: null,
            coolingOffEnds: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            documentsRequested: false,
            documentsProvided: false,
            retainData: true
        };
        
        this.closureRequests.set(sampleRequest.id, sampleRequest);
    }

    // ============= 3. SUBMIT CLOSURE REQUEST =============
    async submitClosureRequest(accountId, requestData) {
        const {
            reason,
            reasonText,
            feedback,
            retainData = true,
            settlementAccountId = null
        } = requestData;

        // Check if account is already closed
        const existingClosure = this.closedAccounts.get(accountId);
        if (existingClosure) {
            return {
                success: false,
                error: 'Account is already closed',
                closureDate: existingClosure.closedAt
            };
        }

        // Check if there's already a pending request
        const pendingRequest = Array.from(this.closureRequests.values()).find(
            r => r.accountId === accountId && ['pending_review', 'cooling_off', 'processing_settlement'].includes(r.status)
        );
        
        if (pendingRequest) {
            return {
                success: false,
                error: 'You already have a pending closure request',
                requestId: pendingRequest.id,
                status: pendingRequest.status
            };
        }

        const reasonConfig = this.closureReasons[reason];
        if (!reasonConfig) {
            return {
                success: false,
                error: 'Invalid closure reason'
            };
        }

        const requestId = uuidv4();
        const coolingOffDays = reasonConfig.coolingOffDays;
        const coolingOffEnds = new Date();
        coolingOffEnds.setDate(coolingOffEnds.getDate() + coolingOffDays);

        const closureRequest = {
            id: requestId,
            accountId: accountId,
            userName: await this.getUserName(accountId),
            email: await this.getUserEmail(accountId),
            requestedAt: new Date().toISOString(),
            reason: reason,
            reasonText: reasonText || reasonConfig.name,
            feedback: feedback || null,
            status: coolingOffDays > 0 ? 'cooling_off' : 'pending_review',
            closureDate: null,
            processedBy: null,
            processedAt: null,
            settlementDetails: null,
            coolingOffEnds: coolingOffEnds.toISOString(),
            coolingOffDays: coolingOffDays,
            documentsRequested: false,
            documentsProvided: false,
            retainData: retainData,
            requiresVerification: reasonConfig.requiresVerification || false,
            requiresLegalDocs: reasonConfig.requiresLegalDocs || false,
            requiresInvestigation: reasonConfig.requiresInvestigation || false,
            settlementAccountId: settlementAccountId,
            canReinstate: reasonConfig.canReinstate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.closureRequests.set(requestId, closureRequest);

        // Send confirmation notification
        await this.sendNotification(accountId, 'CLOSURE_REQUEST_SUBMITTED', {
            requestId: requestId,
            coolingOffEnds: closureRequest.coolingOffEnds,
            nextSteps: this.getNextSteps(closureRequest)
        });

        // Schedule cooling-off period end check
        if (coolingOffDays > 0) {
            this.scheduleCoolingOffEnd(requestId, coolingOffEnds);
        }

        return {
            success: true,
            message: 'Closure request submitted successfully',
            requestId: requestId,
            status: closureRequest.status,
            coolingOffEnds: closureRequest.coolingOffEnds,
            nextSteps: this.getNextSteps(closureRequest)
        };
    }

    // ============= 4. GET CLOSURE REQUEST STATUS =============
    async getClosureStatus(accountId) {
        // Check if account is already closed
        const closedAccount = this.closedAccounts.get(accountId);
        if (closedAccount) {
            return {
                success: true,
                isClosed: true,
                closureDetails: {
                    closedAt: closedAccount.closedAt,
                    reason: closedAccount.reason,
                    reasonText: closedAccount.reasonText,
                    canReinstate: closedAccount.canReinstate,
                    reinstatementDeadline: closedAccount.reinstatementDeadline
                }
            };
        }

        // Check for pending request
        const pendingRequest = Array.from(this.closureRequests.values()).find(
            r => r.accountId === accountId
        );

        if (!pendingRequest) {
            return {
                success: true,
                hasRequest: false,
                message: 'No closure request found'
            };
        }

        return {
            success: true,
            hasRequest: true,
            request: {
                id: pendingRequest.id,
                status: pendingRequest.status,
                reason: pendingRequest.reason,
                reasonText: pendingRequest.reasonText,
                requestedAt: pendingRequest.requestedAt,
                coolingOffEnds: pendingRequest.coolingOffEnds,
                estimatedCompletion: this.estimateCompletion(pendingRequest),
                requiredActions: this.getRequiredActions(pendingRequest)
            }
        };
    }

    // ============= 5. CANCEL CLOSURE REQUEST =============
    async cancelClosureRequest(accountId) {
        const request = Array.from(this.closureRequests.values()).find(
            r => r.accountId === accountId && ['pending_review', 'cooling_off'].includes(r.status)
        );

        if (!request) {
            return {
                success: false,
                error: 'No pending closure request found to cancel'
            };
        }

        request.status = 'cancelled';
        request.updatedAt = new Date().toISOString();
        this.closureRequests.set(request.id, request);

        await this.sendNotification(accountId, 'CLOSURE_REQUEST_CANCELLED', {
            requestId: request.id
        });

        return {
            success: true,
            message: 'Closure request cancelled successfully'
        };
    }

    // ============= 6. PROCESS CLOSURE REQUEST (ADMIN) =============
    async processClosureRequest(requestId, adminId, action, notes) {
        const request = this.closureRequests.get(requestId);
        
        if (!request) {
            return {
                success: false,
                error: 'Closure request not found'
            };
        }

        if (request.status === 'cancelled') {
            return {
                success: false,
                error: 'Request has been cancelled by user'
            };
        }

        if (request.status === 'completed') {
            return {
                success: false,
                error: 'Request has already been processed'
            };
        }

        if (action === 'approve') {
            return await this.approveClosure(requestId, adminId, notes);
        } else if (action === 'reject') {
            return await this.rejectClosure(requestId, adminId, notes);
        } else if (action === 'request_info') {
            return await this.requestMoreInfo(requestId, adminId, notes);
        }

        return {
            success: false,
            error: 'Invalid action'
        };
    }

    // ============= 7. APPROVE CLOSURE =============
    async approveClosure(requestId, adminId, notes) {
        const request = this.closureRequests.get(requestId);
        
        // Calculate final balance and fees
        const balanceInfo = await this.calculateFinalBalance(request.accountId);
        
        // Check if there are pending transactions
        const pendingTransactions = await this.checkPendingTransactions(request.accountId);
        if (pendingTransactions.length > 0) {
            return {
                success: false,
                error: 'Cannot close account with pending transactions',
                pendingTransactions: pendingTransactions
            };
        }

        // Check if there are active loans
        const activeLoans = await this.checkActiveLoans(request.accountId);
        if (activeLoans.length > 0) {
            return {
                success: false,
                error: 'Cannot close account with active loans',
                activeLoans: activeLoans
            };
        }

        request.status = 'processing_settlement';
        request.processedBy = adminId;
        request.processedAt = new Date().toISOString();
        request.approvalNotes = notes;
        request.updatedAt = new Date().toISOString();
        
        this.closureRequests.set(requestId, request);

        // Process settlement
        const settlementResult = await this.processSettlement(request, balanceInfo);
        
        if (!settlementResult.success) {
            return settlementResult;
        }

        // Export account data if requested
        let exportResult = null;
        if (request.retainData) {
            exportResult = await this.exportAccountData(request.accountId);
        }

        // Close the account
        const closureDate = new Date().toISOString();
        const closedAccount = {
            accountId: request.accountId,
            userName: request.userName,
            email: request.email,
            closedAt: closureDate,
            closedBy: adminId,
            reason: request.reason,
            reasonText: request.reasonText,
            status: 'closed',
            settlementCompleted: true,
            settlementAmount: balanceInfo.totalBalance,
            settlementCurrency: 'USD',
            fundsTransferredTo: request.settlementAccountId || 'external',
            documentsExported: exportResult?.success || false,
            coolingOffPeriodEnded: true,
            canReinstate: request.canReinstate,
            reinstatementDeadline: request.canReinstate ? this.calculateReinstatementDeadline() : null,
            retainData: request.retainData,
            closureRequestId: requestId,
            processedBy: adminId
        };

        this.closedAccounts.set(request.accountId, closedAccount);
        
        // Update request status
        request.status = 'completed';
        request.closureDate = closureDate;
        request.settlementDetails = settlementResult;
        this.closureRequests.set(requestId, request);

        // Send completion notification
        await this.sendNotification(request.accountId, 'ACCOUNT_CLOSED', {
            accountId: request.accountId,
            closureDate: closureDate,
            settlementAmount: balanceInfo.totalBalance,
            dataRetained: request.retainData,
            reinstatementDeadline: closedAccount.reinstatementDeadline
        });

        return {
            success: true,
            message: 'Account closed successfully',
            closureDetails: closedAccount,
            settlement: settlementResult,
            export: exportResult
        };
    }

    // ============= 8. REJECT CLOSURE REQUEST =============
    async rejectClosure(requestId, adminId, reason) {
        const request = this.closureRequests.get(requestId);
        
        request.status = 'rejected';
        request.rejectionReason = reason;
        request.processedBy = adminId;
        request.processedAt = new Date().toISOString();
        request.updatedAt = new Date().toISOString();
        
        this.closureRequests.set(requestId, request);

        await this.sendNotification(request.accountId, 'CLOSURE_REQUEST_REJECTED', {
            requestId: requestId,
            reason: reason,
            appealProcess: 'Contact support to appeal this decision'
        });

        return {
            success: true,
            message: 'Closure request rejected',
            reason: reason
        };
    }

    // ============= 9. REQUEST MORE INFORMATION =============
    async requestMoreInfo(requestId, adminId, requiredInfo) {
        const request = this.closureRequests.get(requestId);
        
        request.status = 'info_required';
        request.requiredInfo = requiredInfo;
        request.processedBy = adminId;
        request.processedAt = new Date().toISOString();
        request.updatedAt = new Date().toISOString();
        
        this.closureRequests.set(requestId, request);

        await this.sendNotification(request.accountId, 'CLOSURE_INFO_REQUIRED', {
            requestId: requestId,
            requiredInfo: requiredInfo
        });

        return {
            success: true,
            message: 'Additional information requested',
            requiredInfo: requiredInfo
        };
    }

    // ============= 10. SUBMIT ADDITIONAL INFORMATION =============
    async submitAdditionalInfo(requestId, accountId, info) {
        const request = this.closureRequests.get(requestId);
        
        if (!request || request.accountId !== accountId) {
            return {
                success: false,
                error: 'Request not found'
            };
        }

        if (request.status !== 'info_required') {
            return {
                success: false,
                error: 'No information currently required'
            };
        }

        request.providedInfo = info;
        request.status = 'pending_review';
        request.updatedAt = new Date().toISOString();
        
        this.closureRequests.set(requestId, request);

        await this.sendNotification(accountId, 'CLOSURE_INFO_SUBMITTED', {
            requestId: requestId
        });

        return {
            success: true,
            message: 'Information submitted successfully'
        };
    }

    // ============= 11. PROCESS SETTLEMENT =============
    async processSettlement(request, balanceInfo) {
        const { totalBalance, availableBalance, heldAmount, currencies } = balanceInfo;
        
        if (totalBalance === 0) {
            return {
                success: true,
                message: 'No balance to settle',
                amount: 0
            };
        }

        // Check for closure fees
        const closureFee = this.calculateClosureFee(request);
        const netAmount = totalBalance - closureFee;

        // Process transfer to settlement account
        let transferResult;
        if (request.settlementAccountId) {
            transferResult = await this.transferToInternalAccount(request.accountId, request.settlementAccountId, netAmount);
        } else {
            transferResult = await this.transferToExternalAccount(request.accountId, netAmount);
        }

        if (!transferResult.success) {
            return {
                success: false,
                error: 'Settlement transfer failed: ' + transferResult.error
            };
        }

        return {
            success: true,
            message: 'Settlement processed successfully',
            totalBalance: totalBalance,
            closureFee: closureFee,
            netAmount: netAmount,
            transferReference: transferResult.reference,
            currencies: currencies
        };
    }

    // ============= 12. REINSTATE CLOSED ACCOUNT =============
    async reinstateAccount(accountId, requestData) {
        const closedAccount = this.closedAccounts.get(accountId);
        
        if (!closedAccount) {
            return {
                success: false,
                error: 'Account not found or not closed'
            };
        }

        if (!closedAccount.canReinstate) {
            return {
                success: false,
                error: 'This account cannot be reinstated due to ' + closedAccount.reason
            };
        }

        if (closedAccount.reinstatementDeadline && new Date(closedAccount.reinstatementDeadline) < new Date()) {
            return {
                success: false,
                error: 'Reinstatement deadline has passed',
                deadline: closedAccount.reinstatementDeadline
            };
        }

        const { reason, verificationData } = requestData;

        const reinstatementId = uuidv4();
        const reinstatementRequest = {
            id: reinstatementId,
            accountId: accountId,
            userName: closedAccount.userName,
            requestedAt: new Date().toISOString(),
            reason: reason,
            verificationData: verificationData,
            status: 'pending_review',
            processedBy: null,
            processedAt: null,
            approvalNotes: null,
            createdAt: new Date().toISOString()
        };

        this.reinstatementRequests.set(reinstatementId, reinstatementRequest);

        await this.sendNotification(accountId, 'REINSTATEMENT_REQUESTED', {
            reinstatementId: reinstatementId
        });

        return {
            success: true,
            message: 'Reinstatement request submitted',
            reinstatementId: reinstatementId,
            estimatedProcessing: '2-3 business days'
        };
    }

    // ============= 13. APPROVE REINSTATEMENT (ADMIN) =============
    async approveReinstatement(reinstatementId, adminId, notes) {
        const request = this.reinstatementRequests.get(reinstatementId);
        
        if (!request) {
            return {
                success: false,
                error: 'Reinstatement request not found'
            };
        }

        const closedAccount = this.closedAccounts.get(request.accountId);
        if (!closedAccount) {
            return {
                success: false,
                error: 'Account record not found'
            };
        }

        // Remove from closed accounts
        this.closedAccounts.delete(request.accountId);
        
        // Update request status
        request.status = 'approved';
        request.processedBy = adminId;
        request.processedAt = new Date().toISOString();
        request.approvalNotes = notes;
        this.reinstatementRequests.set(reinstatementId, request);

        // Reactivate account in main system
        await this.reactivateAccount(request.accountId);

        await this.sendNotification(request.accountId, 'ACCOUNT_REINSTATED', {
            accountId: request.accountId,
            reinstatedAt: new Date().toISOString()
        });

        return {
            success: true,
            message: 'Account reinstated successfully',
            accountId: request.accountId
        };
    }

    // ============= 14. GET ALL CLOSURE REQUESTS (ADMIN) =============
    async getAllClosureRequests(filters = {}) {
        let requests = Array.from(this.closureRequests.values());
        
        if (filters.status) {
            requests = requests.filter(r => r.status === filters.status);
        }
        
        if (filters.reason) {
            requests = requests.filter(r => r.reason === filters.reason);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            requests = requests.filter(r => 
                r.userName.toLowerCase().includes(search) ||
                r.email.toLowerCase().includes(search) ||
                r.accountId.toLowerCase().includes(search)
            );
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const startIndex = (page - 1) * limit;
        
        const statusOrder = { cooling_off: 0, pending_review: 1, processing_settlement: 2, info_required: 3 };
        requests.sort((a, b) => {
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return new Date(a.requestedAt) - new Date(b.requestedAt);
        });
        
        return {
            success: true,
            total: requests.length,
            page: page,
            limit: limit,
            requests: requests.slice(startIndex, startIndex + limit),
            summary: {
                cooling_off: requests.filter(r => r.status === 'cooling_off').length,
                pending_review: requests.filter(r => r.status === 'pending_review').length,
                processing_settlement: requests.filter(r => r.status === 'processing_settlement').length,
                info_required: requests.filter(r => r.status === 'info_required').length,
                completed: requests.filter(r => r.status === 'completed').length,
                rejected: requests.filter(r => r.status === 'rejected').length,
                cancelled: requests.filter(r => r.status === 'cancelled').length
            }
        };
    }

    // ============= 15. GET CLOSED ACCOUNTS (ADMIN) =============
    async getClosedAccounts(filters = {}) {
        let accounts = Array.from(this.closedAccounts.values());
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            accounts = accounts.filter(a => 
                a.userName.toLowerCase().includes(search) ||
                a.email.toLowerCase().includes(search) ||
                a.accountId.toLowerCase().includes(search)
            );
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const startIndex = (page - 1) * limit;
        
        return {
            success: true,
            total: accounts.length,
            page: page,
            limit: limit,
            accounts: accounts.slice(startIndex, startIndex + limit)
        };
    }

    // ============= 16. GET REINSTATEMENT REQUESTS (ADMIN) =============
    async getReinstatementRequests(filters = {}) {
        let requests = Array.from(this.reinstatementRequests.values());
        
        if (filters.status) {
            requests = requests.filter(r => r.status === filters.status);
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const startIndex = (page - 1) * limit;
        
        return {
            success: true,
            total: requests.length,
            page: page,
            limit: limit,
            requests: requests.slice(startIndex, startIndex + limit)
        };
    }

    // ============= 17. EXPORT ACCOUNT DATA =============
    async exportAccountData(accountId) {
        // In production, gather all account data
        const exportData = {
            accountId: accountId,
            exportedAt: new Date().toISOString(),
            data: {
                profile: await this.getAccountProfile(accountId),
                transactions: await this.getTransactionHistory(accountId),
                statements: await this.getStatements(accountId),
                taxDocuments: await this.getTaxDocuments(accountId)
            }
        };
        
        // Generate download link
        const exportId = uuidv4();
        const downloadUrl = `/api/account-closure/export/${exportId}/download`;
        
        return {
            success: true,
            exportId: exportId,
            downloadUrl: downloadUrl,
            dataSize: JSON.stringify(exportData).length,
            message: 'Account data exported successfully'
        };
    }

    // ============= 18. GET CLOSURE STATISTICS (ADMIN) =============
    async getClosureStatistics(period = '30d') {
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
            case '1y':
                startDate.setFullYear(startDate.getFullYear() - 1);
                break;
        }
        
        const closedInPeriod = Array.from(this.closedAccounts.values()).filter(
            a => new Date(a.closedAt) >= startDate
        );
        
        const requestsInPeriod = Array.from(this.closureRequests.values()).filter(
            r => new Date(r.requestedAt) >= startDate
        );
        
        const byReason = {};
        closedInPeriod.forEach(account => {
            byReason[account.reason] = (byReason[account.reason] || 0) + 1;
        });
        
        const totalSettlements = closedInPeriod.reduce((sum, a) => sum + (a.settlementAmount || 0), 0);
        
        return {
            success: true,
            period: period,
            statistics: {
                totalClosed: closedInPeriod.length,
                totalRequests: requestsInPeriod.length,
                approvalRate: requestsInPeriod.length > 0 ? 
                    (closedInPeriod.length / requestsInPeriod.length * 100).toFixed(1) : 0,
                totalSettlements: totalSettlements,
                averageSettlement: closedInPeriod.length > 0 ? 
                    totalSettlements / closedInPeriod.length : 0,
                byReason: byReason,
                byStatus: {
                    completed: requestsInPeriod.filter(r => r.status === 'completed').length,
                    rejected: requestsInPeriod.filter(r => r.status === 'rejected').length,
                    cancelled: requestsInPeriod.filter(r => r.status === 'cancelled').length,
                    pending: requestsInPeriod.filter(r => 
                        ['cooling_off', 'pending_review', 'processing_settlement', 'info_required'].includes(r.status)
                    ).length
                }
            }
        };
    }

    // ============= HELPER FUNCTIONS =============
    
    async calculateFinalBalance(accountId) {
        // In production, calculate actual balances
        return {
            totalBalance: 12500.00,
            availableBalance: 12500.00,
            heldAmount: 0,
            currencies: [
                { code: 'USD', amount: 10000 },
                { code: 'EUR', amount: 2500 }
            ]
        };
    }

    calculateClosureFee(request) {
        // Different fees based on account type and reason
        return 0; // No fee for standard closures
    }

    calculateReinstatementDeadline() {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 90); // 90 days to reinstate
        return deadline.toISOString();
    }

    estimateCompletion(request) {
        if (request.status === 'cooling_off') {
            return request.coolingOffEnds;
        }
        const estimate = new Date();
        estimate.setDate(estimate.getDate() + 2);
        return estimate.toISOString();
    }

    getRequiredActions(request) {
        const actions = [];
        
        if (request.status === 'cooling_off') {
            actions.push(`Wait until ${new Date(request.coolingOffEnds).toLocaleDateString()} for cooling-off period to end`);
        }
        
        if (request.documentsRequested && !request.documentsProvided) {
            actions.push('Submit required documentation');
        }
        
        if (request.requiresVerification) {
            actions.push('Complete identity verification');
        }
        
        if (request.requiresLegalDocs) {
            actions.push('Submit legal documentation');
        }
        
        return actions;
    }

    getNextSteps(request) {
        const steps = [];
        
        if (request.status === 'cooling_off') {
            steps.push(`Cooling-off period ends on ${new Date(request.coolingOffEnds).toLocaleDateString()}`);
            steps.push('After cooling-off period, your request will be reviewed');
        } else if (request.status === 'pending_review') {
            steps.push('Your request is in queue for review');
            steps.push('Estimated processing time: 2-3 business days');
        } else if (request.status === 'processing_settlement') {
            steps.push('Your balance is being settled');
            steps.push('Funds will be transferred to your nominated account');
        }
        
        steps.push('You will receive email notifications at each step');
        
        return steps;
    }

    scheduleCoolingOffEnd(requestId, coolingOffEnds) {
        const delay = new Date(coolingOffEnds) - new Date();
        if (delay > 0) {
            setTimeout(async () => {
                const request = this.closureRequests.get(requestId);
                if (request && request.status === 'cooling_off') {
                    request.status = 'pending_review';
                    request.updatedAt = new Date().toISOString();
                    this.closureRequests.set(requestId, request);
                    
                    await this.sendNotification(request.accountId, 'COOLING_OFF_ENDED', {
                        requestId: requestId,
                        nextSteps: 'Your request is now pending review'
                    });
                }
            }, delay);
        }
    }

    async checkPendingTransactions(accountId) {
        // In production, check for pending transactions
        return [];
    }

    async checkActiveLoans(accountId) {
        // In production, check for active loans
        return [];
    }

    async transferToInternalAccount(fromAccountId, toAccountId, amount) {
        // In production, process internal transfer
        return {
            success: true,
            reference: 'INT_' + uuidv4().substring(0, 8)
        };
    }

    async transferToExternalAccount(accountId, amount) {
        // In production, process external transfer
        return {
            success: true,
            reference: 'EXT_' + uuidv4().substring(0, 8)
        };
    }

    async reactivateAccount(accountId) {
        // In production, reactivate account in main system
        console.log(`Account ${accountId} reactivated`);
    }

    async getAccountProfile(accountId) {
        return { accountId: accountId, name: 'User Name' };
    }

    async getTransactionHistory(accountId) {
        return [];
    }

    async getStatements(accountId) {
        return [];
    }

    async getTaxDocuments(accountId) {
        return [];
    }

    async getUserName(accountId) {
        const users = {
            'user_6': 'Robert Johnson',
            'user_7': 'Maria Garcia'
        };
        return users[accountId] || 'User';
    }

    async getUserEmail(accountId) {
        const emails = {
            'user_6': 'robert@example.com',
            'user_7': 'maria@example.com'
        };
        return emails[accountId] || 'user@example.com';
    }

    async sendNotification(accountId, type, data) {
        console.log(`📧 Notification to ${accountId}: ${type}`, data);
    }
}

module.exports = new AccountClosureService();
