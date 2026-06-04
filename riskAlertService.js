// riskAlertService.js - Real-Time Risk Alert System
// Features: Real-time monitoring, Fraud detection, Suspicious activity alerts, Risk scoring, Instant notifications

const { v4: uuidv4 } = require('uuid');

class RiskAlertService {
    constructor() {
        this.alerts = [];
        this.riskRules = [];
        this.alertLogs = [];
        this.notificationQueue = [];
        
        // Initialize risk rules
        this.initializeRiskRules();
    }

    // ============= 1. INITIALIZE RISK RULES =============
    initializeRiskRules() {
        this.riskRules = [
            {
                id: 'R001',
                name: 'Large Transaction Alert',
                category: 'transaction',
                severity: 'high',
                condition: (data) => data.amount > 10000,
                action: 'immediate_review',
                message: 'Large transaction detected: ${amount} ${currency}'
            },
            {
                id: 'R002',
                name: 'Multiple Failed Login Attempts',
                category: 'security',
                severity: 'high',
                condition: (data) => data.failedAttempts > 5,
                action: 'block_account',
                message: 'Multiple failed login attempts detected'
            },
            {
                id: 'R003',
                name: 'Unusual Location Login',
                category: 'security',
                severity: 'medium',
                condition: (data) => data.isUnusualLocation === true,
                action: 'require_2fa',
                message: 'Login from unusual location detected'
            },
            {
                id: 'R004',
                name: 'Rapid Successive Transactions',
                category: 'transaction',
                severity: 'high',
                condition: (data) => data.transactionsPerMinute > 10,
                action: 'temporary_hold',
                message: 'Rapid successive transactions detected'
            },
            {
                id: 'R005',
                name: 'High Risk Country Transaction',
                category: 'compliance',
                severity: 'critical',
                condition: (data) => data.countryRisk === 'high',
                action: 'block_transaction',
                message: 'Transaction to/from high-risk country detected'
            },
            {
                id: 'R006',
                name: 'Account Takeover Attempt',
                category: 'security',
                severity: 'critical',
                condition: (data) => data.deviceChange === true && data.locationChange === true,
                action: 'freeze_account',
                message: 'Potential account takeover attempt detected'
            },
            {
                id: 'R007',
                name: 'Suspicious Pattern Detected',
                category: 'fraud',
                severity: 'high',
                condition: (data) => data.patternScore > 0.8,
                action: 'manual_review',
                message: 'Suspicious transaction pattern detected'
            },
            {
                id: 'R008',
                name: 'KYC Document Expiring',
                category: 'compliance',
                severity: 'medium',
                condition: (data) => data.daysUntilExpiry < 30,
                action: 'notify_user',
                message: 'KYC documents expiring in ${daysUntilExpiry} days'
            },
            {
                id: 'R009',
                name: 'Unusual Withdrawal Amount',
                category: 'transaction',
                severity: 'medium',
                condition: (data) => data.amount > data.averageWithdrawal * 3,
                action: 'review_hold',
                message: 'Unusual withdrawal amount detected'
            },
            {
                id: 'R010',
                name: 'New Device Login',
                category: 'security',
                severity: 'low',
                condition: (data) => data.isNewDevice === true,
                action: 'email_alert',
                message: 'New device used to access account'
            },
            {
                id: 'R011',
                name: 'Multiple Beneficiaries Alert',
                category: 'transaction',
                severity: 'medium',
                condition: (data) => data.newBeneficiariesPerDay > 5,
                action: 'temporary_hold',
                message: 'Multiple new beneficiaries added'
            },
            {
                id: 'R012',
                name: 'Circular Transaction Pattern',
                category: 'fraud',
                severity: 'high',
                condition: (data) => data.isCircular === true,
                action: 'investigation',
                message: 'Circular transaction pattern detected (layering)'
            },
            {
                id: 'R013',
                name: 'Structured Transactions (Smurfing)',
                category: 'fraud',
                severity: 'critical',
                condition: (data) => data.isStructured === true,
                action: 'report_to_compliance',
                message: 'Potential structuring/smurfing detected'
            },
            {
                id: 'R014',
                name: 'Cryptocurrency Mixer Usage',
                category: 'crypto',
                severity: 'high',
                condition: (data) => data.usesMixer === true,
                action: 'enhanced_monitoring',
                message: 'Cryptocurrency mixer/tumbler detected'
            },
            {
                id: 'R015',
                name: 'Dark Web Exposure',
                category: 'security',
                severity: 'critical',
                condition: (data) => data.darkWebMatch === true,
                action: 'immediate_notification',
                message: 'Credentials found on dark web'
            }
        ];
    }

    // ============= 2. EVALUATE TRANSACTION RISK =============
    async evaluateTransaction(transactionData) {
        const {
            userId,
            transactionId,
            amount,
            currency,
            fromCountry,
            toCountry,
            timestamp,
            deviceInfo,
            ipAddress,
            transactionType
        } = transactionData;

        const triggeredAlerts = [];
        
        for (const rule of this.riskRules) {
            try {
                let conditionMet = false;
                
                switch (rule.id) {
                    case 'R001':
                        conditionMet = amount > 10000;
                        break;
                    case 'R004':
                        conditionMet = await this.checkTransactionRate(userId);
                        break;
                    case 'R005':
                        conditionMet = await this.isHighRiskCountry(toCountry);
                        break;
                    case 'R009':
                        const avgWithdrawal = await this.getAverageWithdrawal(userId);
                        conditionMet = amount > avgWithdrawal * 3;
                        break;
                    case 'R011':
                        const newBeneficiaries = await this.getNewBeneficiariesCount(userId);
                        conditionMet = newBeneficiaries > 5;
                        break;
                    default:
                        conditionMet = false;
                }
                
                if (conditionMet) {
                    const alert = await this.createAlert({
                        userId,
                        ruleId: rule.id,
                        ruleName: rule.name,
                        severity: rule.severity,
                        transactionId,
                        details: {
                            amount,
                            currency,
                            fromCountry,
                            toCountry,
                            timestamp
                        },
                        message: this.interpolateMessage(rule.message, { amount, currency })
                    });
                    
                    triggeredAlerts.push(alert);
                    await this.executeAction(rule.action, alert);
                }
            } catch (error) {
                console.error(`Error evaluating rule ${rule.id}:`, error);
            }
        }
        
        return {
            riskScore: this.calculateRiskScore(triggeredAlerts),
            alerts: triggeredAlerts,
            requiresReview: triggeredAlerts.some(a => a.severity === 'high' || a.severity === 'critical'),
            requiresBlock: triggeredAlerts.some(a => a.action === 'block_transaction')
        };
    }

    // ============= 3. CREATE ALERT =============
    async createAlert(alertData) {
        const alert = {
            id: uuidv4(),
            userId: alertData.userId,
            ruleId: alertData.ruleId,
            ruleName: alertData.ruleName,
            severity: alertData.severity,
            status: 'active', // active, investigated, resolved, false_positive
            createdAt: new Date().toISOString(),
            resolvedAt: null,
            resolvedBy: null,
            resolutionNotes: null,
            transactionId: alertData.transactionId,
            details: alertData.details,
            message: alertData.message,
            assignedTo: null,
            investigationNotes: []
        };
        
        this.alerts.push(alert);
        
        // Add to notification queue
        this.notificationQueue.push({
            alertId: alert.id,
            userId: alert.userId,
            severity: alert.severity,
            message: alert.message,
            createdAt: alert.createdAt
        });
        
        // Log alert
        this.logAlert(alert);
        
        return alert;
    }

    // ============= 4. EXECUTE ACTION BASED ON ALERT =============
    async executeAction(action, alert) {
        switch (action) {
            case 'immediate_review':
                await this.assignForReview(alert.id);
                break;
            case 'block_account':
                await this.blockAccount(alert.userId, alert.message);
                break;
            case 'freeze_account':
                await this.freezeAccount(alert.userId, alert.message);
                break;
            case 'require_2fa':
                await this.requireTwoFactorAuth(alert.userId);
                break;
            case 'temporary_hold':
                await this.placeTemporaryHold(alert.userId, alert.transactionId);
                break;
            case 'block_transaction':
                await this.blockTransaction(alert.transactionId, alert.message);
                break;
            case 'manual_review':
                await this.flagForManualReview(alert.id);
                break;
            case 'notify_user':
                await this.sendUserNotification(alert.userId, alert.message);
                break;
            case 'review_hold':
                await this.placeReviewHold(alert.userId, alert.transactionId);
                break;
            case 'email_alert':
                await this.sendEmailAlert(alert.userId, alert.message);
                break;
            case 'investigation':
                await this.startInvestigation(alert.id);
                break;
            case 'report_to_compliance':
                await this.reportToCompliance(alert);
                break;
            case 'enhanced_monitoring':
                await this.enableEnhancedMonitoring(alert.userId);
                break;
            case 'immediate_notification':
                await this.sendImmediateNotification(alert.userId, alert.message);
                break;
        }
    }

    // ============= 5. MONITOR USER ACTIVITY =============
    async monitorUserActivity(userId, activity) {
        const {
            action,
            ipAddress,
            deviceId,
            location,
            timestamp,
            success
        } = activity;
        
        const userAlerts = [];
        
        // Check for unusual login patterns
        if (action === 'login') {
            const recentLogins = await this.getRecentLogins(userId, 24);
            const failedAttempts = recentLogins.filter(l => !l.success).length;
            
            if (failedAttempts >= 5) {
                const alert = await this.createAlert({
                    userId,
                    ruleId: 'R002',
                    ruleName: 'Multiple Failed Login Attempts',
                    severity: 'high',
                    details: { failedAttempts, timeWindow: '24 hours' },
                    message: `${failedAttempts} failed login attempts in 24 hours`
                });
                userAlerts.push(alert);
            }
            
            const isUnusualLocation = await this.checkUnusualLocation(userId, location);
            if (isUnusualLocation) {
                const alert = await this.createAlert({
                    userId,
                    ruleId: 'R003',
                    ruleName: 'Unusual Location Login',
                    severity: 'medium',
                    details: { location, ipAddress },
                    message: `Login from unusual location: ${location}`
                });
                userAlerts.push(alert);
            }
            
            const isNewDevice = await this.checkNewDevice(userId, deviceId);
            if (isNewDevice) {
                const alert = await this.createAlert({
                    userId,
                    ruleId: 'R010',
                    ruleName: 'New Device Login',
                    severity: 'low',
                    details: { deviceId, ipAddress },
                    message: 'New device used to access account'
                });
                userAlerts.push(alert);
            }
        }
        
        return userAlerts;
    }

    // ============= 6. GET ALL ACTIVE ALERTS (ADMIN) =============
    async getActiveAlerts(filters = {}) {
        let filteredAlerts = this.alerts.filter(a => a.status === 'active');
        
        if (filters.severity) {
            filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity);
        }
        
        if (filters.userId) {
            filteredAlerts = filteredAlerts.filter(a => a.userId === filters.userId);
        }
        
        if (filters.ruleId) {
            filteredAlerts = filteredAlerts.filter(a => a.ruleId === filters.ruleId);
        }
        
        // Sort by severity and date
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        filteredAlerts.sort((a, b) => {
            if (severityOrder[b.severity] !== severityOrder[a.severity]) {
                return severityOrder[b.severity] - severityOrder[a.severity];
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        return {
            total: filteredAlerts.length,
            alerts: filteredAlerts,
            summary: {
                critical: filteredAlerts.filter(a => a.severity === 'critical').length,
                high: filteredAlerts.filter(a => a.severity === 'high').length,
                medium: filteredAlerts.filter(a => a.severity === 'medium').length,
                low: filteredAlerts.filter(a => a.severity === 'low').length
            }
        };
    }

    // ============= 7. RESOLVE ALERT =============
    async resolveAlert(alertId, resolvedBy, resolution, notes) {
        const alert = this.alerts.find(a => a.id === alertId);
        
        if (!alert) {
            return { success: false, error: 'Alert not found' };
        }
        
        alert.status = resolution; // resolved, false_positive
        alert.resolvedAt = new Date().toISOString();
        alert.resolvedBy = resolvedBy;
        alert.resolutionNotes = notes;
        
        this.logAlertResolution(alert);
        
        return {
            success: true,
            message: `Alert ${resolution} successfully`,
            alert: alert
        };
    }

    // ============= 8. ASSIGN ALERT TO INVESTIGATOR =============
    async assignAlert(alertId, assignTo) {
        const alert = this.alerts.find(a => a.id === alertId);
        
        if (!alert) {
            return { success: false, error: 'Alert not found' };
        }
        
        alert.assignedTo = assignTo;
        alert.assignedAt = new Date().toISOString();
        
        return {
            success: true,
            message: `Alert assigned to ${assignTo}`,
            alert: alert
        };
    }

    // ============= 9. ADD INVESTIGATION NOTE =============
    async addInvestigationNote(alertId, note, addedBy) {
        const alert = this.alerts.find(a => a.id === alertId);
        
        if (!alert) {
            return { success: false, error: 'Alert not found' };
        }
        
        alert.investigationNotes.push({
            note: note,
            addedBy: addedBy,
            addedAt: new Date().toISOString()
        });
        
        return {
            success: true,
            notes: alert.investigationNotes
        };
    }

    // ============= 10. GET ALERT STATISTICS (DASHBOARD) =============
    async getAlertStatistics(timeRange = '24h') {
        const now = new Date();
        let startDate;
        
        switch (timeRange) {
            case '24h':
                startDate = new Date(now - 24 * 60 * 60 * 1000);
                break;
            case '7d':
                startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now - 24 * 60 * 60 * 1000);
        }
        
        const alertsInRange = this.alerts.filter(a => new Date(a.createdAt) >= startDate);
        
        const bySeverity = {
            critical: alertsInRange.filter(a => a.severity === 'critical').length,
            high: alertsInRange.filter(a => a.severity === 'high').length,
            medium: alertsInRange.filter(a => a.severity === 'medium').length,
            low: alertsInRange.filter(a => a.severity === 'low').length
        };
        
        const byRule = {};
        alertsInRange.forEach(alert => {
            if (!byRule[alert.ruleName]) {
                byRule[alert.ruleName] = 0;
            }
            byRule[alert.ruleName]++;
        });
        
        const resolutionStats = {
            resolved: alertsInRange.filter(a => a.status === 'resolved').length,
            falsePositive: alertsInRange.filter(a => a.status === 'false_positive').length,
            active: alertsInRange.filter(a => a.status === 'active').length
        };
        
        return {
            timeRange,
            totalAlerts: alertsInRange.length,
            bySeverity,
            byRule: Object.entries(byRule).map(([rule, count]) => ({ rule, count })),
            resolutionStats,
            averageResponseTime: await this.calculateAverageResponseTime(alertsInRange)
        };
    }

    // ============= 11. REAL-TIME DASHBOARD STREAM =============
    async getRealTimeDashboard() {
        const activeAlerts = await this.getActiveAlerts();
        const recentAlerts = this.alerts.slice(-20).reverse();
        
        return {
            timestamp: new Date().toISOString(),
            activeAlerts: activeAlerts.total,
            criticalAlerts: activeAlerts.summary.critical,
            highAlerts: activeAlerts.summary.high,
            recentAlerts: recentAlerts.map(alert => ({
                id: alert.id,
                ruleName: alert.ruleName,
                severity: alert.severity,
                message: alert.message,
                createdAt: alert.createdAt
            })),
            notificationQueue: this.notificationQueue.length
        };
    }

    // ============= HELPER FUNCTIONS =============
    
    async checkTransactionRate(userId) {
        // Check number of transactions in last minute
        return Math.random() > 0.95; // Simulated: 5% chance
    }
    
    async isHighRiskCountry(country) {
        const highRiskCountries = ['CountryA', 'CountryB', 'CountryC'];
        return highRiskCountries.includes(country);
    }
    
    async getAverageWithdrawal(userId) {
        // Get user's average withdrawal amount
        return 5000; // Simulated
    }
    
    async getNewBeneficiariesCount(userId) {
        // Count new beneficiaries added today
        return Math.floor(Math.random() * 10); // Simulated
    }
    
    async getRecentLogins(userId, hours) {
        // Get recent login attempts
        return []; // Simulated
    }
    
    async checkUnusualLocation(userId, location) {
        // Check if location is unusual for this user
        return Math.random() > 0.85; // Simulated: 15% chance
    }
    
    async checkNewDevice(userId, deviceId) {
        // Check if device is new for this user
        return Math.random() > 0.8; // Simulated: 20% chance
    }
    
    calculateRiskScore(alerts) {
        const weights = { critical: 40, high: 20, medium: 10, low: 5 };
        let totalScore = 0;
        
        for (const alert of alerts) {
            totalScore += weights[alert.severity] || 0;
        }
        
        return Math.min(100, totalScore);
    }
    
    interpolateMessage(message, data) {
        return message.replace(/\${(\w+)}/g, (_, key) => data[key] || key);
    }
    
    logAlert(alert) {
        this.alertLogs.push({
            alertId: alert.id,
            action: 'created',
            timestamp: alert.createdAt,
            details: alert
        });
    }
    
    logAlertResolution(alert) {
        this.alertLogs.push({
            alertId: alert.id,
            action: 'resolved',
            timestamp: alert.resolvedAt,
            resolution: alert.status,
            notes: alert.resolutionNotes
        });
    }
    
    async calculateAverageResponseTime(alerts) {
        const resolvedAlerts = alerts.filter(a => a.resolvedAt);
        if (resolvedAlerts.length === 0) return 0;
        
        const totalTime = resolvedAlerts.reduce((sum, alert) => {
            const responseTime = new Date(alert.resolvedAt) - new Date(alert.createdAt);
            return sum + responseTime;
        }, 0);
        
        return totalTime / resolvedAlerts.length / 1000 / 60; // Return in minutes
    }
    
    // Action implementations
    async assignForReview(alertId) {
        console.log(`Alert ${alertId} assigned for review`);
    }
    
    async blockAccount(userId, reason) {
        console.log(`Account ${userId} blocked: ${reason}`);
    }
    
    async freezeAccount(userId, reason) {
        console.log(`Account ${userId} frozen: ${reason}`);
    }
    
    async requireTwoFactorAuth(userId) {
        console.log(`2FA required for user ${userId}`);
    }
    
    async placeTemporaryHold(userId, transactionId) {
        console.log(`Temporary hold on transaction ${transactionId} for user ${userId}`);
    }
    
    async blockTransaction(transactionId, reason) {
        console.log(`Transaction ${transactionId} blocked: ${reason}`);
    }
    
    async flagForManualReview(alertId) {
        console.log(`Alert ${alertId} flagged for manual review`);
    }
    
    async sendUserNotification(userId, message) {
        console.log(`Notification sent to user ${userId}: ${message}`);
    }
    
    async placeReviewHold(userId, transactionId) {
        console.log(`Review hold placed on transaction ${transactionId}`);
    }
    
    async sendEmailAlert(userId, message) {
        console.log(`Email alert sent to user ${userId}: ${message}`);
    }
    
    async startInvestigation(alertId) {
        console.log(`Investigation started for alert ${alertId}`);
    }
    
    async reportToCompliance(alert) {
        console.log(`Compliance report generated for alert ${alert.id}`);
    }
    
    async enableEnhancedMonitoring(userId) {
        console.log(`Enhanced monitoring enabled for user ${userId}`);
    }
    
    async sendImmediateNotification(userId, message) {
        console.log(`IMMEDIATE notification to user ${userId}: ${message}`);
    }
}

module.exports = new RiskAlertService();
