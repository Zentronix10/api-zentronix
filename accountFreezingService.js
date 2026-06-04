// accountFreezingService.js - Complete Account Freezing System
// Features: Instant freeze/unfreeze, Multiple freeze types, Partial freezing, Scheduled freezing, Emergency freeze

const { v4: uuidv4 } = require('uuid');

class AccountFreezingService {
    constructor() {
        this.frozenAccounts = new Map(); // accountId -> freeze details
        this.freezeHistory = new Map(); // accountId -> history
        this.freezeTemplates = new Map(); // templateId -> template
        this.emergencyFreezes = new Map(); // freezeId -> emergency details
        this.partialFreezes = new Map(); // accountId -> partial freeze rules
        
        // Initialize freeze templates
        this.initializeTemplates();
        
        // Initialize sample data
        this.initializeSampleData();
        
        // Start auto-expiration checker
        this.startExpirationChecker();
    }

    // ============= 1. INITIALIZE FREEZE TEMPLATES =============
    initializeTemplates() {
        this.freezeTemplates.set('full_security', {
            id: 'full_security',
            name: 'Full Security Freeze',
            type: 'full',
            duration: null,
            requiresApproval: true,
            restrictions: ['all_transactions', 'all_withdrawals', 'card_usage', 'login_access'],
            autoUnfreezeDays: null,
            notificationRequired: true,
            severity: 'high'
        });

        this.freezeTemplates.set('temporary_hold', {
            id: 'temporary_hold',
            name: 'Temporary Hold',
            type: 'partial',
            duration: 48, // hours
            requiresApproval: false,
            restrictions: ['withdrawals', 'external_transfers'],
            autoUnfreezeDays: 2,
            notificationRequired: true,
            severity: 'medium'
        });

        this.freezeTemplates.set('card_only', {
            id: 'card_only',
            name: 'Card Only Freeze',
            type: 'partial',
            duration: null,
            requiresApproval: false,
            restrictions: ['card_usage', 'atm_withdrawals'],
            autoUnfreezeDays: null,
            notificationRequired: false,
            severity: 'low'
        });

        this.freezeTemplates.set('fraud_investigation', {
            id: 'fraud_investigation',
            name: 'Fraud Investigation Freeze',
            type: 'full',
            duration: 72, // hours
            requiresApproval: true,
            restrictions: ['all_transactions', 'all_withdrawals', 'card_usage', 'login_access', 'beneficiary_add'],
            autoUnfreezeDays: 3,
            notificationRequired: true,
            severity: 'critical',
            requiresDocuments: true
        });

        this.freezeTemplates.set('compliance_review', {
            id: 'compliance_review',
            name: 'Compliance Review Freeze',
            type: 'full',
            duration: 168, // hours (7 days)
            requiresApproval: true,
            restrictions: ['all_transactions', 'all_withdrawals'],
            autoUnfreezeDays: 7,
            notificationRequired: true,
            severity: 'high',
            requiresKYC: true
        });

        this.freezeTemplates.set('inactivity', {
            id: 'inactivity',
            name: 'Inactivity Freeze',
            type: 'partial',
            duration: null,
            requiresApproval: false,
            restrictions: ['login_access'],
            autoUnfreezeDays: null,
            notificationRequired: true,
            severity: 'low',
            autoTriggerDays: 365
        });

        this.freezeTemplates.set('voluntary', {
            id: 'voluntary',
            name: 'Voluntary Freeze',
            type: 'full',
            duration: null,
            requiresApproval: false,
            restrictions: ['all_transactions', 'all_withdrawals', 'card_usage'],
            autoUnfreezeDays: null,
            notificationRequired: true,
            severity: 'medium',
            userTriggered: true
        });
    }

    // ============= 2. INITIALIZE SAMPLE DATA =============
    initializeSampleData() {
        const sampleFreezes = [
            {
                id: uuidv4(),
                accountId: 'user_8',
                userName: 'David Kim',
                email: 'david@example.com',
                freezeType: 'full_security',
                freezeReason: 'Suspicious login activity detected',
                frozenAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                frozenBy: 'system',
                status: 'active',
                restrictions: ['all_transactions', 'all_withdrawals', 'card_usage', 'login_access'],
                autoUnfreezeAt: null,
                severity: 'high',
                notificationsSent: true
            },
            {
                id: uuidv4(),
                accountId: 'user_9',
                userName: 'Lisa Wong',
                email: 'lisa@example.com',
                freezeType: 'temporary_hold',
                freezeReason: 'Large transaction verification',
                frozenAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                frozenBy: 'admin',
                status: 'active',
                restrictions: ['withdrawals', 'external_transfers'],
                autoUnfreezeAt: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
                severity: 'medium',
                notificationsSent: true
            }
        ];

        sampleFreezes.forEach(freeze => {
            this.frozenAccounts.set(freeze.accountId, freeze);
            this.addToHistory(freeze.accountId, 'FROZEN', freeze);
        });

        // Sample partial freeze
        const partialFreeze = {
            accountId: 'user_10',
            userName: 'Michael Chen',
            rules: [
                {
                    type: 'daily_limit',
                    restriction: 'max_withdrawal',
                    value: 1000,
                    originalLimit: 50000
                },
                {
                    type: 'currency_restriction',
                    restriction: 'blocked_currencies',
                    value: ['BTC', 'ETH'],
                    originalAccess: true
                },
                {
                    type: 'destination_restriction',
                    restriction: 'blocked_countries',
                    value: ['high_risk_countries'],
                    originalAccess: true
                }
            ],
            frozenAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            frozenBy: 'compliance',
            expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active'
        };
        
        this.partialFreezes.set('user_10', partialFreeze);
    }

    // ============= 3. INSTANT ACCOUNT FREEZE =============
    async instantFreeze(accountId, freezeData) {
        const {
            freezeType,
            reason,
            frozenBy,
            duration = null,
            customRestrictions = null
        } = freezeData;

        // Check if already frozen
        const existingFreeze = this.frozenAccounts.get(accountId);
        if (existingFreeze && existingFreeze.status === 'active') {
            return {
                success: false,
                error: 'Account is already frozen',
                existingFreeze: existingFreeze
            };
        }

        const template = this.freezeTemplates.get(freezeType);
        if (!template) {
            return {
                success: false,
                error: 'Invalid freeze type'
            };
        }

        const freezeId = uuidv4();
        const autoUnfreezeAt = duration || template.autoUnfreezeDays ? 
            new Date(Date.now() + (duration || template.autoUnfreezeDays) * 60 * 60 * 1000).toISOString() : null;

        const freezeDetails = {
            id: freezeId,
            accountId: accountId,
            userName: await this.getUserName(accountId),
            email: await this.getUserEmail(accountId),
            freezeType: freezeType,
            freezeReason: reason,
            frozenAt: new Date().toISOString(),
            frozenBy: frozenBy,
            status: 'active',
            restrictions: customRestrictions || template.restrictions,
            autoUnfreezeAt: autoUnfreezeAt,
            severity: template.severity,
            notificationsSent: false,
            requiresDocuments: template.requiresDocuments || false,
            requiresKYC: template.requiresKYC || false,
            documentsSubmitted: false,
            kycSubmitted: false,
            adminNotes: null
        };

        this.frozenAccounts.set(accountId, freezeDetails);
        
        // Add to history
        this.addToHistory(accountId, 'INSTANT_FREEZE', freezeDetails);
        
        // Send notifications
        await this.sendFreezeNotifications(accountId, freezeDetails);
        
        // Update account status in main system
        await this.updateAccountStatus(accountId, 'frozen', freezeDetails.restrictions);
        
        // Log freeze event
        await this.logFreezeEvent(freezeDetails);

        // Schedule auto-unfreeze if applicable
        if (autoUnfreezeAt) {
            this.scheduleAutoUnfreeze(accountId, autoUnfreezeAt);
        }

        return {
            success: true,
            message: `Account ${accountId} has been frozen`,
            freezeId: freezeId,
            freezeDetails: {
                type: freezeType,
                restrictions: freezeDetails.restrictions,
                frozenAt: freezeDetails.frozenAt,
                autoUnfreezeAt: autoUnfreezeAt
            },
            nextSteps: this.getFreezeNextSteps(freezeDetails)
        };
    }

    // ============= 4. PARTIAL ACCOUNT FREEZE =============
    async partialFreeze(accountId, freezeRules) {
        const {
            restrictions,
            duration,
            reason,
            frozenBy
        } = freezeRules;

        // Check for existing full freeze
        const existingFreeze = this.frozenAccounts.get(accountId);
        if (existingFreeze && existingFreeze.status === 'active' && existingFreeze.freezeType !== 'partial') {
            return {
                success: false,
                error: 'Account has a full freeze. Cannot apply partial freeze.',
                existingFreeze: existingFreeze
            };
        }

        const partialFreezeId = uuidv4();
        const expiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000).toISOString() : null;

        const partialFreezeDetails = {
            id: partialFreezeId,
            accountId: accountId,
            userName: await this.getUserName(accountId),
            rules: restrictions,
            reason: reason,
            frozenAt: new Date().toISOString(),
            frozenBy: frozenBy,
            expiresAt: expiresAt,
            status: 'active'
        };

        this.partialFreezes.set(accountId, partialFreezeDetails);
        
        // Add to history
        this.addToHistory(accountId, 'PARTIAL_FREEZE', partialFreezeDetails);
        
        // Send notification
        await this.sendNotification(accountId, 'PARTIAL_FREEZE_APPLIED', {
            restrictions: restrictions,
            expiresAt: expiresAt,
            reason: reason
        });
        
        // Update account with partial restrictions
        await this.updateAccountRestrictions(accountId, restrictions);

        if (expiresAt) {
            this.schedulePartialFreezeExpiry(accountId, expiresAt);
        }

        return {
            success: true,
            message: 'Partial freeze applied successfully',
            freezeId: partialFreezeId,
            restrictions: restrictions,
            expiresAt: expiresAt
        };
    }

    // ============= 5. EMERGENCY FREEZE (IMMEDIATE ACTION) =============
    async emergencyFreeze(accountId, reason, frozenBy, emergencyLevel = 'high') {
        // Highest priority freeze - bypasses all checks
        const emergencyId = uuidv4();
        
        const emergencyFreeze = {
            id: emergencyId,
            accountId: accountId,
            userName: await this.getUserName(accountId),
            reason: reason,
            frozenBy: frozenBy,
            frozenAt: new Date().toISOString(),
            emergencyLevel: emergencyLevel, // high, critical
            restrictions: ['all_transactions', 'all_withdrawals', 'card_usage', 'login_access', 'beneficiary_add', 'api_access'],
            status: 'active',
            requiresManualReview: true,
            notificationSent: false
        };

        this.emergencyFreezes.set(emergencyId, emergencyFreeze);
        
        // Also add to frozen accounts
        this.frozenAccounts.set(accountId, {
            ...emergencyFreeze,
            freezeType: 'emergency',
            severity: 'critical'
        });

        // Add to history
        this.addToHistory(accountId, 'EMERGENCY_FREEZE', emergencyFreeze);
        
        // Send emergency alerts
        await this.sendEmergencyAlerts(accountId, emergencyFreeze);
        
        // Immediately block all access
        await this.immediateBlockAccess(accountId);
        
        // Notify security team
        await this.notifySecurityTeam(emergencyFreeze);

        return {
            success: true,
            message: 'EMERGENCY FREEZE ACTIVATED',
            emergencyId: emergencyId,
            actionRequired: 'Manual review required',
            severity: emergencyLevel
        };
    }

    // ============= 6. INSTANT UNFREEZE =============
    async instantUnfreeze(accountId, unfrozenBy, reason, validateIdentity = true) {
        const freezeDetails = this.frozenAccounts.get(accountId);
        
        if (!freezeDetails) {
            return {
                success: false,
                error: 'Account is not frozen'
            };
        }

        // For emergency freezes, require additional verification
        if (freezeDetails.freezeType === 'emergency') {
            if (!validateIdentity) {
                return {
                    success: false,
                    error: 'Emergency freeze requires identity verification to unfreeze'
                };
            }
            
            const emergencyFreeze = Array.from(this.emergencyFreezes.values()).find(
                e => e.accountId === accountId && e.status === 'active'
            );
            if (emergencyFreeze) {
                emergencyFreeze.status = 'resolved';
                emergencyFreeze.resolvedAt = new Date().toISOString();
                emergencyFreeze.resolvedBy = unfrozenBy;
                emergencyFreeze.resolutionReason = reason;
            }
        }

        // Remove from frozen accounts
        this.frozenAccounts.delete(accountId);
        
        // Remove partial freezes if any
        this.partialFreezes.delete(accountId);
        
        // Add to history
        this.addToHistory(accountId, 'UNFROZEN', {
            unfrozenBy: unfrozenBy,
            reason: reason,
            frozenDuration: this.calculateFrozenDuration(freezeDetails.frozenAt)
        });
        
        // Send notification
        await this.sendNotification(accountId, 'ACCOUNT_UNFROZEN', {
            unfrozenBy: unfrozenBy,
            reason: reason,
            restrictionsRemoved: freezeDetails.restrictions
        });
        
        // Restore account access
        await this.restoreAccountAccess(accountId);
        
        // Log unfreeze event
        await this.logUnfreezeEvent(accountId, unfrozenBy, reason);

        return {
            success: true,
            message: `Account ${accountId} has been unfrozen`,
            frozenDuration: this.calculateFrozenDuration(freezeDetails.frozenAt),
            restrictionsRemoved: freezeDetails.restrictions
        };
    }

    // ============= 7. VOLUNTARY FREEZE (USER INITIATED) =============
    async voluntaryFreeze(accountId, duration, reason) {
        const validDurations = ['24h', '7d', '30d', '90d', 'indefinite'];
        if (!validDurations.includes(duration)) {
            return {
                success: false,
                error: 'Invalid duration. Choose: 24h, 7d, 30d, 90d, indefinite'
            };
        }

        // Check if already frozen
        const existingFreeze = this.frozenAccounts.get(accountId);
        if (existingFreeze) {
            return {
                success: false,
                error: 'Account is already frozen',
                existingFreeze: existingFreeze
            };
        }

        let autoUnfreezeAt = null;
        let durationHours = 0;
        
        switch (duration) {
            case '24h':
                durationHours = 24;
                autoUnfreezeAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                break;
            case '7d':
                durationHours = 168;
                autoUnfreezeAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case '30d':
                durationHours = 720;
                autoUnfreezeAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case '90d':
                durationHours = 2160;
                autoUnfreezeAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
                break;
        }

        const template = this.freezeTemplates.get('voluntary');
        
        const freezeDetails = {
            id: uuidv4(),
            accountId: accountId,
            userName: await this.getUserName(accountId),
            email: await this.getUserEmail(accountId),
            freezeType: 'voluntary',
            freezeReason: reason || 'User requested voluntary freeze',
            frozenAt: new Date().toISOString(),
            frozenBy: 'user',
            status: 'active',
            restrictions: template.restrictions,
            autoUnfreezeAt: autoUnfreezeAt,
            duration: duration,
            durationHours: durationHours,
            severity: template.severity,
            notificationsSent: false,
            userTriggered: true
        };

        this.frozenAccounts.set(accountId, freezeDetails);
        
        // Add to history
        this.addToHistory(accountId, 'VOLUNTARY_FREEZE', freezeDetails);
        
        // Send confirmation
        await this.sendNotification(accountId, 'VOLUNTARY_FREEZE_CONFIRMED', {
            duration: duration,
            autoUnfreezeAt: autoUnfreezeAt,
            restrictions: freezeDetails.restrictions
        });
        
        // Update account status
        await this.updateAccountStatus(accountId, 'voluntary_frozen', freezeDetails.restrictions);

        if (autoUnfreezeAt) {
            this.scheduleAutoUnfreeze(accountId, autoUnfreezeAt);
        }

        return {
            success: true,
            message: `Account voluntarily frozen for ${duration}`,
            freezeDetails: {
                freezeId: freezeDetails.id,
                duration: duration,
                autoUnfreezeAt: autoUnfreezeAt,
                restrictions: freezeDetails.restrictions
            }
        };
    }

    // ============= 8. GET FREEZE STATUS =============
    async getFreezeStatus(accountId) {
        // Check full freeze
        const fullFreeze = this.frozenAccounts.get(accountId);
        
        // Check partial freeze
        const partialFreeze = this.partialFreezes.get(accountId);
        
        // Check emergency freeze
        const emergencyFreeze = Array.from(this.emergencyFreezes.values()).find(
            e => e.accountId === accountId && e.status === 'active'
        );

        if (!fullFreeze && !partialFreeze && !emergencyFreeze) {
            return {
                success: true,
                isFrozen: false,
                message: 'Account is active with no restrictions'
            };
        }

        return {
            success: true,
            isFrozen: true,
            fullFreeze: fullFreeze ? {
                type: fullFreeze.freezeType,
                reason: fullFreeze.freezeReason,
                frozenAt: fullFreeze.frozenAt,
                frozenBy: fullFreeze.frozenBy,
                autoUnfreezeAt: fullFreeze.autoUnfreezeAt,
                restrictions: fullFreeze.restrictions,
                severity: fullFreeze.severity
            } : null,
            partialFreeze: partialFreeze ? {
                rules: partialFreeze.rules,
                expiresAt: partialFreeze.expiresAt,
                reason: partialFreeze.reason
            } : null,
            emergencyFreeze: emergencyFreeze ? {
                level: emergencyFreeze.emergencyLevel,
                frozenAt: emergencyFreeze.frozenAt,
                requiresManualReview: emergencyFreeze.requiresManualReview
            } : null
        };
    }

    // ============= 9. UPDATE FREEZE RESTRICTIONS =============
    async updateFreezeRestrictions(accountId, newRestrictions, updatedBy, reason) {
        const freezeDetails = this.frozenAccounts.get(accountId);
        
        if (!freezeDetails) {
            return {
                success: false,
                error: 'Account is not frozen'
            };
        }

        const oldRestrictions = [...freezeDetails.restrictions];
        freezeDetails.restrictions = newRestrictions;
        freezeDetails.updatedAt = new Date().toISOString();
        freezeDetails.updatedBy = updatedBy;
        freezeDetails.updateReason = reason;
        
        this.frozenAccounts.set(accountId, freezeDetails);
        
        // Add to history
        this.addToHistory(accountId, 'FREEZE_RESTRICTIONS_UPDATED', {
            oldRestrictions: oldRestrictions,
            newRestrictions: newRestrictions,
            updatedBy: updatedBy,
            reason: reason
        });
        
        // Update account restrictions
        await this.updateAccountRestrictions(accountId, newRestrictions);
        
        // Send notification
        await this.sendNotification(accountId, 'FREEZE_RESTRICTIONS_CHANGED', {
            oldRestrictions: oldRestrictions,
            newRestrictions: newRestrictions,
            reason: reason
        });

        return {
            success: true,
            message: 'Freeze restrictions updated',
            oldRestrictions: oldRestrictions,
            newRestrictions: newRestrictions
        };
    }

    // ============= 10. EXTEND FREEZE DURATION =============
    async extendFreeze(accountId, additionalHours, extendedBy, reason) {
        const freezeDetails = this.frozenAccounts.get(accountId);
        
        if (!freezeDetails) {
            return {
                success: false,
                error: 'Account is not frozen'
            };
        }

        const currentAutoUnfreeze = freezeDetails.autoUnfreezeAt ? new Date(freezeDetails.autoUnfreezeAt) : null;
        const newAutoUnfreeze = currentAutoUnfreeze ? 
            new Date(currentAutoUnfreeze.getTime() + additionalHours * 60 * 60 * 1000) :
            new Date(Date.now() + additionalHours * 60 * 60 * 1000);
        
        freezeDetails.autoUnfreezeAt = newAutoUnfreeze.toISOString();
        freezeDetails.extendedAt = new Date().toISOString();
        freezeDetails.extendedBy = extendedBy;
        freezeDetails.extensionReason = reason;
        freezeDetails.extensionHours = additionalHours;
        
        this.frozenAccounts.set(accountId, freezeDetails);
        
        // Reschedule auto-unfreeze
        this.scheduleAutoUnfreeze(accountId, freezeDetails.autoUnfreezeAt);
        
        // Add to history
        this.addToHistory(accountId, 'FREEZE_EXTENDED', {
            additionalHours: additionalHours,
            newAutoUnfreezeAt: freezeDetails.autoUnfreezeAt,
            extendedBy: extendedBy,
            reason: reason
        });
        
        // Send notification
        await this.sendNotification(accountId, 'FREEZE_EXTENDED', {
            additionalHours: additionalHours,
            newUnfreezeDate: freezeDetails.autoUnfreezeAt,
            reason: reason
        });

        return {
            success: true,
            message: `Freeze extended by ${additionalHours} hours`,
            newAutoUnfreezeAt: freezeDetails.autoUnfreezeAt
        };
    }

    // ============= 11. GET ALL FROZEN ACCOUNTS (ADMIN) =============
    async getAllFrozenAccounts(filters = {}) {
        let frozenAccounts = Array.from(this.frozenAccounts.values());
        
        if (filters.freezeType) {
            frozenAccounts = frozenAccounts.filter(f => f.freezeType === filters.freezeType);
        }
        
        if (filters.severity) {
            frozenAccounts = frozenAccounts.filter(f => f.severity === filters.severity);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            frozenAccounts = frozenAccounts.filter(f => 
                f.userName.toLowerCase().includes(search) ||
                f.email.toLowerCase().includes(search) ||
                f.accountId.toLowerCase().includes(search)
            );
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const startIndex = (page - 1) * limit;
        
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        frozenAccounts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return {
            success: true,
            total: frozenAccounts.length,
            page: page,
            limit: limit,
            accounts: frozenAccounts.slice(startIndex, startIndex + limit),
            summary: {
                byType: {
                    full_security: frozenAccounts.filter(f => f.freezeType === 'full_security').length,
                    fraud_investigation: frozenAccounts.filter(f => f.freezeType === 'fraud_investigation').length,
                    compliance_review: frozenAccounts.filter(f => f.freezeType === 'compliance_review').length,
                    voluntary: frozenAccounts.filter(f => f.freezeType === 'voluntary').length,
                    emergency: frozenAccounts.filter(f => f.freezeType === 'emergency').length,
                    temporary_hold: frozenAccounts.filter(f => f.freezeType === 'temporary_hold').length
                },
                bySeverity: {
                    critical: frozenAccounts.filter(f => f.severity === 'critical').length,
                    high: frozenAccounts.filter(f => f.severity === 'high').length,
                    medium: frozenAccounts.filter(f => f.severity === 'medium').length,
                    low: frozenAccounts.filter(f => f.severity === 'low').length
                },
                totalPartialFreezes: this.partialFreezes.size,
                totalEmergencyFreezes: this.emergencyFreezes.size
            }
        };
    }

    // ============= 12. GET FREEZE HISTORY =============
    async getFreezeHistory(accountId, limit = 50) {
        const history = this.freezeHistory.get(accountId) || [];
        
        return {
            success: true,
            accountId: accountId,
            total: history.length,
            history: history.slice(-limit).reverse()
        };
    }

    // ============= 13. BULK FREEZE OPERATIONS (ADMIN) =============
    async bulkFreeze(accountIds, freezeData) {
        const results = [];
        
        for (const accountId of accountIds) {
            const result = await this.instantFreeze(accountId, freezeData);
            results.push({
                accountId: accountId,
                success: result.success,
                message: result.message,
                freezeId: result.freezeId
            });
        }
        
        return {
            success: true,
            total: accountIds.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        };
    }

    // ============= 14. SCHEDULE FUTURE FREEZE =============
    async scheduleFutureFreeze(accountId, freezeData, scheduledDateTime) {
        const scheduledDate = new Date(scheduledDateTime);
        
        if (scheduledDate <= new Date()) {
            return {
                success: false,
                error: 'Scheduled date must be in the future'
            };
        }

        const scheduledFreezeId = uuidv4();
        const delay = scheduledDate - new Date();
        
        // Store scheduled freeze
        const scheduledFreeze = {
            id: scheduledFreezeId,
            accountId: accountId,
            freezeData: freezeData,
            scheduledAt: scheduledDate.toISOString(),
            status: 'scheduled'
        };
        
        // Schedule the freeze
        setTimeout(async () => {
            const result = await this.instantFreeze(accountId, freezeData);
            scheduledFreeze.status = 'executed';
            scheduledFreeze.executedAt = new Date().toISOString();
            scheduledFreeze.result = result;
            
            await this.sendNotification(accountId, 'SCHEDULED_FREEZE_EXECUTED', {
                scheduledDate: scheduledFreeze.scheduledAt,
                freezeType: freezeData.freezeType,
                reason: freezeData.reason
            });
        }, delay);

        return {
            success: true,
            message: `Freeze scheduled for ${scheduledDate.toLocaleString()}`,
            scheduledFreezeId: scheduledFreezeId,
            scheduledDateTime: scheduledDate.toISOString()
        };
    }

    // ============= 15. GET FREEZE STATISTICS (ADMIN DASHBOARD) =============
    async getFreezeStatistics(period = '30d') {
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
        
        // Collect all freeze events in period
        let freezeEvents = [];
        for (const [accountId, history] of this.freezeHistory.entries()) {
            freezeEvents.push(...history.filter(h => 
                (h.action === 'FROZEN' || h.action === 'INSTANT_FREEZE') &&
                new Date(h.timestamp) >= startDate
            ));
        }
        
        const activeFreezes = this.frozenAccounts.size;
        const partialFreezes = this.partialFreezes.size;
        const emergencyFreezes = this.emergencyFreezes.size;
        
        const averageDuration = this.calculateAverageFreezeDuration();
        
        return {
            success: true,
            period: period,
            statistics: {
                activeFreezes: activeFreezes,
                partialFreezes: partialFreezes,
                emergencyFreezes: emergencyFreezes,
                totalFreezesInPeriod: freezeEvents.length,
                averageDurationHours: averageDuration,
                byType: this.getFreezeTypeDistribution(),
                bySeverity: this.getFreezeSeverityDistribution(),
                resolutionRate: this.calculateResolutionRate()
            },
            trends: this.generateFreezeTrends(freezeEvents)
        };
    }

    // ============= HELPER FUNCTIONS =============
    
    startExpirationChecker() {
        setInterval(async () => {
            const now = new Date();
            
            // Check for expired auto-unfreezes
            for (const [accountId, freeze] of this.frozenAccounts.entries()) {
                if (freeze.autoUnfreezeAt && new Date(freeze.autoUnfreezeAt) <= now) {
                    await this.instantUnfreeze(accountId, 'system', 'Auto-unfreeze based on expiration');
                }
            }
            
            // Check for expired partial freezes
            for (const [accountId, partial] of this.partialFreezes.entries()) {
                if (partial.expiresAt && new Date(partial.expiresAt) <= now) {
                    this.partialFreezes.delete(accountId);
                    await this.restoreAccountRestrictions(accountId);
                    await this.sendNotification(accountId, 'PARTIAL_FREEZE_EXPIRED', {});
                }
            }
        }, 60000); // Check every minute
    }

    scheduleAutoUnfreeze(accountId, autoUnfreezeAt) {
        const delay = new Date(autoUnfreezeAt) - new Date();
        if (delay > 0) {
            setTimeout(async () => {
                const freeze = this.frozenAccounts.get(accountId);
                if (freeze && freeze.status === 'active') {
                    await this.instantUnfreeze(accountId, 'system', 'Auto-unfreeze scheduled');
                }
            }, delay);
        }
    }

    schedulePartialFreezeExpiry(accountId, expiresAt) {
        const delay = new Date(expiresAt) - new Date();
        if (delay > 0) {
            setTimeout(async () => {
                const partial = this.partialFreezes.get(accountId);
                if (partial && partial.status === 'active') {
                    this.partialFreezes.delete(accountId);
                    await this.restoreAccountRestrictions(accountId);
                }
            }, delay);
        }
    }

    addToHistory(accountId, action, details) {
        let history = this.freezeHistory.get(accountId) || [];
        history.push({
            id: uuidv4(),
            action: action,
            details: details,
            timestamp: new Date().toISOString()
        });
        this.freezeHistory.set(accountId, history);
    }

    calculateFrozenDuration(frozenAt) {
        const frozen = new Date(frozenAt);
        const now = new Date();
        const diffHours = Math.floor((now - frozen) / (1000 * 60 * 60));
        return diffHours;
    }

    calculateAverageFreezeDuration() {
        let totalDuration = 0;
        let count = 0;
        
        for (const [accountId, history] of this.freezeHistory.entries()) {
            const freezeEvents = history.filter(h => h.action === 'FROZEN' || h.action === 'INSTANT_FREEZE');
            const unfreezeEvents = history.filter(h => h.action === 'UNFROZEN');
            
            for (const freeze of freezeEvents) {
                const unfreeze = unfreezeEvents.find(u => new Date(u.timestamp) > new Date(freeze.timestamp));
                if (unfreeze) {
                    const duration = (new Date(unfreeze.timestamp) - new Date(freeze.timestamp)) / (1000 * 60 * 60);
                    totalDuration += duration;
                    count++;
                }
            }
        }
        
        return count > 0 ? (totalDuration / count).toFixed(1) : 0;
    }

    getFreezeTypeDistribution() {
        const distribution = {};
        for (const freeze of this.frozenAccounts.values()) {
            distribution[freeze.freezeType] = (distribution[freeze.freezeType] || 0) + 1;
        }
        return distribution;
    }

    getFreezeSeverityDistribution() {
        const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
        for (const freeze of this.frozenAccounts.values()) {
            distribution[freeze.severity]++;
        }
        return distribution;
    }

    calculateResolutionRate() {
        let total = 0;
        let resolved = 0;
        
        for (const history of this.freezeHistory.values()) {
            const freezeEvents = history.filter(h => h.action === 'FROZEN' || h.action === 'INSTANT_FREEZE');
            const unfreezeEvents = history.filter(h => h.action === 'UNFROZEN');
            total += freezeEvents.length;
            resolved += unfreezeEvents.length;
        }
        
        return total > 0 ? ((resolved / total) * 100).toFixed(1) : 100;
    }

    generateFreezeTrends(freezeEvents) {
        const dailyCount = {};
        
        freezeEvents.forEach(event => {
            const day = new Date(event.timestamp).toISOString().split('T')[0];
            dailyCount[day] = (dailyCount[day] || 0) + 1;
        });
        
        return Object.entries(dailyCount).map(([date, count]) => ({
            date: date,
            count: count
        })).slice(-30);
    }

    getFreezeNextSteps(freezeDetails) {
        const steps = [];
        
        if (freezeDetails.autoUnfreezeAt) {
            steps.push(`Auto-unfreeze scheduled for ${new Date(freezeDetails.autoUnfreezeAt).toLocaleString()}`);
        }
        
        if (freezeDetails.requiresDocuments && !freezeDetails.documentsSubmitted) {
            steps.push('Submit required documentation for review');
        }
        
        if (freezeDetails.requiresKYC && !freezeDetails.kycSubmitted) {
            steps.push('Complete KYC verification');
        }
        
        steps.push('Contact support for additional information');
        
        return steps;
    }

    async sendFreezeNotifications(accountId, freezeDetails) {
        await this.sendNotification(accountId, 'ACCOUNT_FROZEN', {
            freezeType: freezeDetails.freezeType,
            reason: freezeDetails.freezeReason,
            restrictions: freezeDetails.restrictions,
            autoUnfreezeAt: freezeDetails.autoUnfreezeAt,
            severity: freezeDetails.severity
        });
        
        // Send alert to admin dashboard
        await this.sendAdminAlert('ACCOUNT_FROZEN', freezeDetails);
    }

    async sendEmergencyAlerts(accountId, freezeDetails) {
        await this.sendNotification(accountId, 'EMERGENCY_FREEZE_ACTIVATED', {
            severity: freezeDetails.emergencyLevel,
            reason: freezeDetails.reason,
            actionRequired: 'Immediate attention required'
        });
        
        // Send SMS alert for emergency
        await this.sendSmsAlert(accountId, freezeDetails);
        
        // Send to security team
        await this.sendSecurityAlert(freezeDetails);
    }

    async updateAccountStatus(accountId, status, restrictions) {
        // In production, update main database
        console.log(`Account ${accountId} status: ${status}, Restrictions:`, restrictions);
    }

    async updateAccountRestrictions(accountId, restrictions) {
        // In production, apply restrictions in main system
        console.log(`Restrictions applied to ${accountId}:`, restrictions);
    }

    async restoreAccountAccess(accountId) {
        // In production, restore full access
        console.log(`Account ${accountId} access restored`);
    }

    async restoreAccountRestrictions(accountId) {
        // In production, restore original restrictions
        console.log(`Restrictions removed for ${accountId}`);
    }

    async immediateBlockAccess(accountId) {
        // In production, immediately block all access
        console.log(`IMMEDIATE ACCESS BLOCKED for ${accountId}`);
    }

    async getUserName(accountId) {
        const names = {
            'user_8': 'David Kim',
            'user_9': 'Lisa Wong',
            'user_10': 'Michael Chen'
        };
        return names[accountId] || 'User';
    }

    async getUserEmail(accountId) {
        const emails = {
            'user_8': 'david@example.com',
            'user_9': 'lisa@example.com',
            'user_10': 'michael@example.com'
        };
        return emails[accountId] || 'user@example.com';
    }

    async sendNotification(accountId, type, data) {
        console.log(`📧 Notification to ${accountId}: ${type}`, data);
    }

    async sendAdminAlert(type, data) {
        console.log(`🔔 ADMIN ALERT: ${type}`, data);
    }

    async sendSmsAlert(accountId, data) {
        console.log(`📱 SMS ALERT to ${accountId}:`, data);
    }

    async sendSecurityAlert(data) {
        console.log(`🚨 SECURITY TEAM ALERT:`, data);
    }

    async notifySecurityTeam(freezeDetails) {
        console.log(`👮 SECURITY TEAM NOTIFIED: Emergency freeze on ${freezeDetails.accountId}`);
    }

    async logFreezeEvent(freezeDetails) {
        console.log(`📝 FREEZE LOG: ${freezeDetails.accountId} frozen by ${freezeDetails.frozenBy}`);
    }

    async logUnfreezeEvent(accountId, unfrozenBy, reason) {
        console.log(`📝 UNFREEZE LOG: ${accountId} unfrozen by ${unfrozenBy}, Reason: ${reason}`);
    }
}

module.exports = new AccountFreezingService();
