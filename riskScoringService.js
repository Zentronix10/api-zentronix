// riskScoringService.js - Complete Risk Scoring System
// Features: Customer risk assessment, Transaction risk scoring, AML risk calculation, Behavioral analysis, Real-time scoring

const { v4: uuidv4 } = require('uuid');

class RiskScoringService {
    constructor() {
        this.riskProfiles = new Map(); // accountId -> risk profile
        this.riskHistory = new Map(); // accountId -> risk score history
        this.transactionRiskCache = new Map(); // transactionId -> risk score
        this.riskRules = this.initializeRiskRules();
        this.riskWeights = this.initializeRiskWeights();
        this.riskThresholds = this.initializeRiskThresholds();
        
        // Initialize sample data
        this.initializeSampleData();
        
        // Start real-time monitoring
        this.startRealTimeMonitoring();
    }

    // ============= 1. INITIALIZE RISK RULES =============
    initializeRiskRules() {
        return {
            // Customer-based risk rules
            customer: {
                high_risk_country: {
                    name: 'High Risk Country of Residence',
                    weight: 25,
                    condition: (customer) => this.isHighRiskCountry(customer.country),
                    riskLevel: 'high',
                    category: 'geographic',
                    action: 'enhanced_due_diligence'
                },
                pep_status: {
                    name: 'Politically Exposed Person',
                    weight: 35,
                    condition: (customer) => customer.isPEP === true,
                    riskLevel: 'critical',
                    category: 'political',
                    action: 'enhanced_monitoring'
                },
                negative_media: {
                    name: 'Negative Media Coverage',
                    weight: 30,
                    condition: (customer) => customer.hasNegativeMedia === true,
                    riskLevel: 'high',
                    category: 'reputation',
                    action: 'manual_review'
                },
                income_mismatch: {
                    name: 'Income vs Transaction Mismatch',
                    weight: 20,
                    condition: (customer) => this.calculateIncomeMismatch(customer) > 3,
                    riskLevel: 'medium',
                    category: 'financial',
                    action: 'review'
                },
                multiple_accounts: {
                    name: 'Multiple Accounts with Same ID',
                    weight: 15,
                    condition: (customer) => customer.duplicateAccounts > 1,
                    riskLevel: 'medium',
                    category: 'identity',
                    action: 'verify_identity'
                },
                expired_kyc: {
                    name: 'Expired KYC Documents',
                    weight: 10,
                    condition: (customer) => this.isKYCDocumentsExpired(customer),
                    riskLevel: 'medium',
                    category: 'compliance',
                    action: 'request_kyc_update'
                },
                unusual_occupation: {
                    name: 'High Risk Occupation',
                    weight: 20,
                    condition: (customer) => this.isHighRiskOccupation(customer.occupation),
                    riskLevel: 'high',
                    category: 'occupation',
                    action: 'source_of_funds_check'
                },
                age_risk: {
                    name: 'Age-Related Risk',
                    weight: 5,
                    condition: (customer) => this.isHighRiskAge(customer.age),
                    riskLevel: 'low',
                    category: 'demographic',
                    action: 'monitor'
                }
            },
            
            // Transaction-based risk rules
            transaction: {
                large_amount: {
                    name: 'Large Transaction Amount',
                    weight: 15,
                    condition: (tx) => tx.amount > 10000,
                    riskLevel: 'medium',
                    category: 'amount',
                    action: 'review'
                },
                very_large_amount: {
                    name: 'Very Large Transaction Amount',
                    weight: 30,
                    condition: (tx) => tx.amount > 50000,
                    riskLevel: 'high',
                    category: 'amount',
                    action: 'manual_review'
                },
                rapid_succession: {
                    name: 'Rapid Succession Transactions',
                    weight: 25,
                    condition: (tx) => tx.transactionsPerHour > 5,
                    riskLevel: 'high',
                    category: 'velocity',
                    action: 'temporary_hold'
                },
                unusual_hours: {
                    name: 'Transaction at Unusual Hours',
                    weight: 10,
                    condition: (tx) => this.isUnusualHour(tx.timestamp),
                    riskLevel: 'low',
                    category: 'timing',
                    action: 'monitor'
                },
                high_risk_country_transfer: {
                    name: 'Transfer to High Risk Country',
                    weight: 30,
                    condition: (tx) => this.isHighRiskCountry(tx.destinationCountry),
                    riskLevel: 'high',
                    category: 'geographic',
                    action: 'block_review'
                },
                structured_transaction: {
                    name: 'Structured Transaction (Smurfing)',
                    weight: 40,
                    condition: (tx) => this.isStructuredTransaction(tx),
                    riskLevel: 'critical',
                    category: 'fraud',
                    action: 'report_compliance'
                },
                unusual_pattern: {
                    name: 'Unusual Transaction Pattern',
                    weight: 25,
                    condition: (tx) => this.isUnusualPattern(tx),
                    riskLevel: 'high',
                    category: 'behavioral',
                    action: 'investigation'
                },
                new_beneficiary: {
                    name: 'Transaction to New Beneficiary',
                    weight: 10,
                    condition: (tx) => tx.isNewBeneficiary === true,
                    riskLevel: 'low',
                    category: 'relationship',
                    action: 'verify_beneficiary'
                },
                crypto_mixer: {
                    name: 'Crypto Mixer/Tumbler Usage',
                    weight: 50,
                    condition: (tx) => tx.usesMixer === true,
                    riskLevel: 'critical',
                    category: 'crypto',
                    action: 'immediate_block'
                },
                darkweb_connection: {
                    name: 'Dark Web Connected Wallet',
                    weight: 60,
                    condition: (tx) => tx.darkwebConnected === true,
                    riskLevel: 'critical',
                    category: 'crypto',
                    action: 'emergency_freeze'
                }
            },
            
            // Behavioral risk rules
            behavioral: {
                login_anomaly: {
                    name: 'Login from New Location',
                    weight: 15,
                    condition: (behavior) => behavior.isNewLocation === true,
                    riskLevel: 'medium',
                    category: 'security',
                    action: 'require_2fa'
                },
                multiple_devices: {
                    name: 'Multiple Devices in Short Time',
                    weight: 20,
                    condition: (behavior) => behavior.devicesPerDay > 3,
                    riskLevel: 'medium',
                    category: 'security',
                    action: 'alert'
                },
                failed_logins: {
                    name: 'Multiple Failed Login Attempts',
                    weight: 25,
                    condition: (behavior) => behavior.failedLogins > 5,
                    riskLevel: 'high',
                    category: 'security',
                    action: 'temporary_lock'
                },
                password_change: {
                    name: 'Recent Password Change',
                    weight: 5,
                    condition: (behavior) => behavior.recentPasswordChange === true,
                    riskLevel: 'low',
                    category: 'security',
                    action: 'monitor'
                },
                account_takeover: {
                    name: 'Potential Account Takeover',
                    weight: 50,
                    condition: (behavior) => this.isAccountTakeover(behavior),
                    riskLevel: 'critical',
                    category: 'security',
                    action: 'freeze_account'
                }
            }
        };
    }

    // ============= 2. INITIALIZE RISK WEIGHTS =============
    initializeRiskWeights() {
        return {
            customer: {
                geographic: 25,
                political: 35,
                reputation: 30,
                financial: 20,
                identity: 15,
                compliance: 10,
                occupation: 20,
                demographic: 5
            },
            transaction: {
                amount: 30,
                velocity: 25,
                timing: 10,
                geographic: 30,
                fraud: 40,
                behavioral: 25,
                relationship: 10,
                crypto: 50
            },
            behavioral: {
                security: 25,
                anomaly: 20
            }
        };
    }

    // ============= 3. INITIALIZE RISK THRESHOLDS =============
    initializeRiskThresholds() {
        return {
            riskLevels: {
                low: { min: 0, max: 25, color: '#00ff88', action: 'monitor' },
                medium: { min: 26, max: 50, color: '#ffd700', action: 'review' },
                high: { min: 51, max: 75, color: '#ff8800', action: 'manual_review' },
                critical: { min: 76, max: 100, color: '#ff4466', action: 'immediate_action' }
            },
            monitoring: {
                realTimeScore: true,
                alertThreshold: 60,
                autoBlockThreshold: 85,
                complianceReportThreshold: 70
            }
        };
    }

    // ============= 4. INITIALIZE SAMPLE DATA =============
    initializeSampleData() {
        const sampleCustomers = [
            {
                accountId: 'user_1',
                name: 'Alexander Vance',
                country: 'Switzerland',
                isPEP: false,
                hasNegativeMedia: false,
                annualIncome: 250000,
                occupation: 'Investment Banker',
                age: 42,
                accountAgeMonths: 24,
                transactionVolume6Months: 1250000,
                averageTransaction: 8500,
                kycDocumentsExpired: false,
                duplicateAccounts: 1,
                riskScore: 18
            },
            {
                accountId: 'user_2',
                name: 'Unknown High Risk',
                country: 'CountryX',
                isPEP: true,
                hasNegativeMedia: true,
                annualIncome: 50000,
                occupation: 'Cryptocurrency Trader',
                age: 23,
                accountAgeMonths: 2,
                transactionVolume6Months: 500000,
                averageTransaction: 25000,
                kycDocumentsExpired: true,
                duplicateAccounts: 3,
                riskScore: 78
            }
        ];

        sampleCustomers.forEach(customer => {
            const riskProfile = this.calculateCustomerRiskScore(customer);
            this.riskProfiles.set(customer.accountId, riskProfile);
        });
    }

    // ============= 5. CALCULATE CUSTOMER RISK SCORE =============
    async calculateCustomerRiskScore(customerData) {
        const {
            accountId,
            name,
            country,
            isPEP,
            hasNegativeMedia,
            annualIncome,
            occupation,
            age,
            accountAgeMonths,
            transactionVolume6Months,
            averageTransaction,
            kycDocumentsExpired,
            duplicateAccounts
        } = customerData;

        let totalScore = 0;
        const riskFactors = [];
        const triggeredRules = [];

        // Evaluate each risk rule
        for (const [ruleId, rule] of Object.entries(this.riskRules.customer)) {
            const conditionMet = await this.evaluateCustomerRule(ruleId, customerData);
            
            if (conditionMet) {
                totalScore += rule.weight;
                triggeredRules.push({
                    ruleId: ruleId,
                    name: rule.name,
                    weight: rule.weight,
                    riskLevel: rule.riskLevel,
                    category: rule.category
                });
                
                riskFactors.push({
                    factor: rule.name,
                    impact: rule.weight,
                    level: rule.riskLevel,
                    recommendation: rule.action
                });
            }
        }

        // Apply score normalization (cap at 100)
        totalScore = Math.min(100, totalScore);
        
        // Determine risk level
        const riskLevel = this.getRiskLevel(totalScore);
        
        const riskProfile = {
            id: uuidv4(),
            accountId: accountId,
            name: name,
            calculatedAt: new Date().toISOString(),
            totalScore: totalScore,
            riskLevel: riskLevel.level,
            riskColor: riskLevel.color,
            recommendedAction: riskLevel.action,
            riskFactors: riskFactors,
            triggeredRules: triggeredRules,
            categoryBreakdown: this.calculateCategoryBreakdown(triggeredRules),
            trend: await this.calculateRiskTrend(accountId, totalScore),
            nextReviewDate: this.calculateNextReviewDate(riskLevel.level),
            requiresEnhancedDueDiligence: totalScore > 60,
            requiresManualReview: totalScore > 50,
            requiresComplianceReport: totalScore > 70
        };

        // Store in history
        this.addToHistory(accountId, riskProfile);
        
        return riskProfile;
    }

    // ============= 6. CALCULATE TRANSACTION RISK SCORE =============
    async calculateTransactionRiskScore(transactionData) {
        const {
            transactionId,
            accountId,
            amount,
            currency,
            destinationCountry,
            timestamp,
            isNewBeneficiary,
            transactionsPerHour,
            usesMixer,
            darkwebConnected,
            transactionType,
            previousTransactions
        } = transactionData;

        let totalScore = 0;
        const triggeredRules = [];
        const riskFactors = [];

        // Evaluate transaction risk rules
        for (const [ruleId, rule] of Object.entries(this.riskRules.transaction)) {
            const conditionMet = await this.evaluateTransactionRule(ruleId, transactionData);
            
            if (conditionMet) {
                totalScore += rule.weight;
                triggeredRules.push({
                    ruleId: ruleId,
                    name: rule.name,
                    weight: rule.weight,
                    riskLevel: rule.riskLevel,
                    category: rule.category
                });
                
                riskFactors.push({
                    factor: rule.name,
                    impact: rule.weight,
                    level: rule.riskLevel,
                    recommendation: rule.action
                });
            }
        }

        // Add customer risk factor (multiplier)
        const customerRiskProfile = this.riskProfiles.get(accountId);
        if (customerRiskProfile) {
            const customerRiskMultiplier = customerRiskProfile.totalScore / 100;
            totalScore = totalScore * (1 + customerRiskMultiplier);
        }

        // Normalize score
        totalScore = Math.min(100, Math.round(totalScore));
        
        const riskLevel = this.getRiskLevel(totalScore);
        
        const transactionRisk = {
            id: uuidv4(),
            transactionId: transactionId,
            accountId: accountId,
            calculatedAt: new Date().toISOString(),
            amount: amount,
            currency: currency,
            totalScore: totalScore,
            riskLevel: riskLevel.level,
            riskColor: riskLevel.color,
            recommendedAction: riskLevel.action,
            riskFactors: riskFactors,
            triggeredRules: triggeredRules,
            requiresHold: totalScore > 70,
            requiresBlock: totalScore > 85,
            requiresReport: totalScore > 75,
            customerRiskContribution: customerRiskProfile?.totalScore || 0
        };

        // Cache transaction risk score
        this.transactionRiskCache.set(transactionId, transactionRisk);
        
        // Update customer risk profile based on transaction
        await this.updateCustomerRiskFromTransaction(accountId, transactionRisk);
        
        // Trigger alerts if needed
        if (totalScore >= this.riskThresholds.monitoring.alertThreshold) {
            await this.triggerRiskAlert(accountId, transactionRisk);
        }
        
        if (totalScore >= this.riskThresholds.monitoring.autoBlockThreshold) {
            await this.autoBlockTransaction(transactionId, transactionRisk);
        }

        return transactionRisk;
    }

    // ============= 7. CALCULATE BEHAVIORAL RISK SCORE =============
    async calculateBehavioralRiskScore(accountId, behaviorData) {
        const {
            loginLocation,
            deviceId,
            failedLogins,
            recentPasswordChange,
            devicesPerDay,
            isNewLocation,
            timeSinceLastLogin
        } = behaviorData;

        let totalScore = 0;
        const triggeredRules = [];

        for (const [ruleId, rule] of Object.entries(this.riskRules.behavioral)) {
            const conditionMet = await this.evaluateBehavioralRule(ruleId, behaviorData);
            
            if (conditionMet) {
                totalScore += rule.weight;
                triggeredRules.push({
                    ruleId: ruleId,
                    name: rule.name,
                    weight: rule.weight,
                    riskLevel: rule.riskLevel
                });
            }
        }

        totalScore = Math.min(100, totalScore);
        const riskLevel = this.getRiskLevel(totalScore);
        
        const behavioralRisk = {
            id: uuidv4(),
            accountId: accountId,
            calculatedAt: new Date().toISOString(),
            totalScore: totalScore,
            riskLevel: riskLevel.level,
            triggeredRules: triggeredRules,
            recommendedAction: riskLevel.action,
            requiresVerification: totalScore > 50,
            requiresLockout: totalScore > 80
        };

        return behavioralRisk;
    }

    // ============= 8. GET CUSTOMER RISK PROFILE =============
    async getCustomerRiskProfile(accountId) {
        const profile = this.riskProfiles.get(accountId);
        
        if (!profile) {
            return {
                success: false,
                error: 'Risk profile not found'
            };
        }

        // Get risk history
        const history = this.riskHistory.get(accountId) || [];
        
        return {
            success: true,
            profile: profile,
            history: history.slice(-12), // Last 12 scores
            trend: this.calculateTrendDirection(history),
            recommendations: this.generateRiskRecommendations(profile)
        };
    }

    // ============= 9. UPDATE CUSTOMER RISK FROM TRANSACTION =============
    async updateCustomerRiskFromTransaction(accountId, transactionRisk) {
        const currentProfile = this.riskProfiles.get(accountId);
        
        if (!currentProfile) return;
        
        // Update risk profile based on transaction patterns
        const transactionImpact = transactionRisk.totalScore * 0.1; // 10% impact
        
        let newScore = currentProfile.totalScore;
        
        if (transactionRisk.riskLevel === 'critical') {
            newScore = Math.min(100, newScore + transactionImpact);
        } else if (transactionRisk.riskLevel === 'high') {
            newScore = Math.min(100, newScore + transactionImpact * 0.7);
        } else if (transactionRisk.riskLevel === 'medium') {
            newScore = Math.min(100, newScore + transactionImpact * 0.3);
        }
        
        // Decay old scores over time
        const timeSinceLastUpdate = new Date() - new Date(currentProfile.calculatedAt);
        const daysSinceUpdate = timeSinceLastUpdate / (1000 * 60 * 60 * 24);
        const decayRate = 0.5; // 0.5% decay per day
        newScore = Math.max(0, newScore - (daysSinceUpdate * decayRate));
        
        if (Math.abs(newScore - currentProfile.totalScore) > 5) {
            currentProfile.totalScore = Math.round(newScore);
            currentProfile.riskLevel = this.getRiskLevel(newScore).level;
            currentProfile.calculatedAt = new Date().toISOString();
            currentProfile.lastUpdateReason = 'Transaction risk impact';
            
            this.riskProfiles.set(accountId, currentProfile);
            this.addToHistory(accountId, currentProfile);
        }
    }

    // ============= 10. GET HIGH RISK CUSTOMERS (ADMIN) =============
    async getHighRiskCustomers(filters = {}) {
        let customers = Array.from(this.riskProfiles.values());
        
        if (filters.minScore) {
            customers = customers.filter(c => c.totalScore >= parseInt(filters.minScore));
        }
        
        if (filters.riskLevel) {
            customers = customers.filter(c => c.riskLevel === filters.riskLevel);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            customers = customers.filter(c => 
                c.name.toLowerCase().includes(search) ||
                c.accountId.toLowerCase().includes(search)
            );
        }
        
        customers.sort((a, b) => b.totalScore - a.totalScore);
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const startIndex = (page - 1) * limit;
        
        return {
            success: true,
            total: customers.length,
            page: page,
            limit: limit,
            customers: customers.slice(startIndex, startIndex + limit),
            summary: {
                low: customers.filter(c => c.riskLevel === 'low').length,
                medium: customers.filter(c => c.riskLevel === 'medium').length,
                high: customers.filter(c => c.riskLevel === 'high').length,
                critical: customers.filter(c => c.riskLevel === 'critical').length,
                averageScore: customers.reduce((sum, c) => sum + c.totalScore, 0) / customers.length || 0
            }
        };
    }

    // ============= 11. GET TRANSACTION RISK ANALYSIS =============
    async getTransactionRiskAnalysis(filters = {}) {
        let transactions = Array.from(this.transactionRiskCache.values());
        
        if (filters.minScore) {
            transactions = transactions.filter(t => t.totalScore >= parseInt(filters.minScore));
        }
        
        if (filters.riskLevel) {
            transactions = transactions.filter(t => t.riskLevel === filters.riskLevel);
        }
        
        if (filters.accountId) {
            transactions = transactions.filter(t => t.accountId === filters.accountId);
        }
        
        transactions.sort((a, b) => b.totalScore - a.totalScore);
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 50;
        const startIndex = (page - 1) * limit;
        
        return {
            success: true,
            total: transactions.length,
            page: page,
            limit: limit,
            transactions: transactions.slice(startIndex, startIndex + limit),
            summary: {
                totalHighRisk: transactions.filter(t => t.riskLevel === 'high' || t.riskLevel === 'critical').length,
                totalBlocked: transactions.filter(t => t.requiresBlock).length,
                totalReported: transactions.filter(t => t.requiresReport).length,
                averageScore: transactions.reduce((sum, t) => sum + t.totalScore, 0) / transactions.length || 0
            }
        };
    }

    // ============= 12. GET RISK STATISTICS (ADMIN DASHBOARD) =============
    async getRiskStatistics(period = '30d') {
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
        
        const customers = Array.from(this.riskProfiles.values());
        const recentTransactions = Array.from(this.transactionRiskCache.values()).filter(
            t => new Date(t.calculatedAt) >= startDate
        );
        
        const riskDistribution = {
            low: customers.filter(c => c.riskLevel === 'low').length,
            medium: customers.filter(c => c.riskLevel === 'medium').length,
            high: customers.filter(c => c.riskLevel === 'high').length,
            critical: customers.filter(c => c.riskLevel === 'critical').length
        };
        
        const topRiskFactors = this.calculateTopRiskFactors(recentTransactions);
        const riskTrends = this.calculateRiskTrends(customers, recentTransactions);
        
        return {
            success: true,
            period: period,
            statistics: {
                totalCustomers: customers.length,
                averageRiskScore: customers.reduce((sum, c) => sum + c.totalScore, 0) / customers.length || 0,
                highRiskCustomers: riskDistribution.high + riskDistribution.critical,
                riskDistribution: riskDistribution,
                totalHighRiskTransactions: recentTransactions.filter(t => t.riskLevel === 'high' || t.riskLevel === 'critical').length,
                totalBlockedTransactions: recentTransactions.filter(t => t.requiresBlock).length,
                topRiskFactors: topRiskFactors,
                riskTrends: riskTrends,
                alertsGenerated: await this.getAlertCount(period)
            }
        };
    }

    // ============= 13. BULK RISK ASSESSMENT =============
    async bulkRiskAssessment(accountIds) {
        const results = [];
        
        for (const accountId of accountIds) {
            const customerData = await this.getCustomerData(accountId);
            if (customerData) {
                const riskProfile = await this.calculateCustomerRiskScore(customerData);
                results.push({
                    accountId: accountId,
                    success: true,
                    riskScore: riskProfile.totalScore,
                    riskLevel: riskProfile.riskLevel
                });
            } else {
                results.push({
                    accountId: accountId,
                    success: false,
                    error: 'Customer data not found'
                });
            }
        }
        
        return {
            success: true,
            total: accountIds.length,
            completed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results,
            summary: {
                averageScore: results.filter(r => r.success).reduce((sum, r) => sum + r.riskScore, 0) / results.filter(r => r.success).length || 0,
                highRiskCount: results.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length
            }
        };
    }

    // ============= 14. GENERATE RISK REPORT =============
    async generateRiskReport(reportType, dateRange) {
        const { startDate, endDate } = dateRange;
        
        const customersInRange = Array.from(this.riskProfiles.values()).filter(c => 
            new Date(c.calculatedAt) >= new Date(startDate) &&
            new Date(c.calculatedAt) <= new Date(endDate)
        );
        
        const transactionsInRange = Array.from(this.transactionRiskCache.values()).filter(t =>
            new Date(t.calculatedAt) >= new Date(startDate) &&
            new Date(t.calculatedAt) <= new Date(endDate)
        );
        
        const report = {
            reportId: uuidv4(),
            reportType: reportType,
            generatedAt: new Date().toISOString(),
            dateRange: { startDate, endDate },
            customerRiskSummary: {
                totalCustomers: customersInRange.length,
                averageScore: customersInRange.reduce((sum, c) => sum + c.totalScore, 0) / customersInRange.length || 0,
                distribution: {
                    low: customersInRange.filter(c => c.riskLevel === 'low').length,
                    medium: customersInRange.filter(c => c.riskLevel === 'medium').length,
                    high: customersInRange.filter(c => c.riskLevel === 'high').length,
                    critical: customersInRange.filter(c => c.riskLevel === 'critical').length
                },
                highRiskCustomers: customersInRange.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').map(c => ({
                    accountId: c.accountId,
                    name: c.name,
                    score: c.totalScore,
                    topFactors: c.riskFactors.slice(0, 3)
                }))
            },
            transactionRiskSummary: {
                totalTransactions: transactionsInRange.length,
                highRiskTransactions: transactionsInRange.filter(t => t.riskLevel === 'high' || t.riskLevel === 'critical').length,
                blockedTransactions: transactionsInRange.filter(t => t.requiresBlock).length,
                reportedTransactions: transactionsInRange.filter(t => t.requiresReport).length,
                topRiskFactors: this.calculateTopRiskFactors(transactionsInRange)
            },
            recommendations: this.generateRiskRecommendationsBatch(customersInRange)
        };
        
        return {
            success: true,
            report: report
        };
    }

    // ============= HELPER FUNCTIONS =============
    
    getRiskLevel(score) {
        if (score <= 25) return this.riskThresholds.riskLevels.low;
        if (score <= 50) return this.riskThresholds.riskLevels.medium;
        if (score <= 75) return this.riskThresholds.riskLevels.high;
        return this.riskThresholds.riskLevels.critical;
    }

    calculateCategoryBreakdown(triggeredRules) {
        const breakdown = {};
        for (const rule of triggeredRules) {
            breakdown[rule.category] = (breakdown[rule.category] || 0) + rule.weight;
        }
        return breakdown;
    }

    calculateNextReviewDate(riskLevel) {
        const date = new Date();
        switch (riskLevel) {
            case 'critical':
                date.setDate(date.getDate() + 7);
                break;
            case 'high':
                date.setDate(date.getDate() + 30);
                break;
            case 'medium':
                date.setDate(date.getDate() + 90);
                break;
            default:
                date.setDate(date.getDate() + 180);
        }
        return date.toISOString();
    }

    async calculateRiskTrend(accountId, currentScore) {
        const history = this.riskHistory.get(accountId) || [];
        if (history.length < 3) return 'stable';
        
        const previousScores = history.slice(-3).map(h => h.totalScore);
        const averagePrevious = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
        
        if (currentScore > averagePrevious * 1.2) return 'increasing';
        if (currentScore < averagePrevious * 0.8) return 'decreasing';
        return 'stable';
    }

    calculateTrendDirection(history) {
        if (history.length < 2) return 'stable';
        const recent = history.slice(-5);
        const firstScore = recent[0]?.totalScore || 0;
        const lastScore = recent[recent.length - 1]?.totalScore || 0;
        
        if (lastScore > firstScore * 1.1) return 'up';
        if (lastScore < firstScore * 0.9) return 'down';
        return 'stable';
    }

    calculateTopRiskFactors(transactions) {
        const factorCount = {};
        for (const tx of transactions) {
            for (const factor of tx.riskFactors || []) {
                factorCount[factor.factor] = (factorCount[factor.factor] || 0) + 1;
            }
        }
        
        return Object.entries(factorCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([factor, count]) => ({ factor, count }));
    }

    calculateRiskTrends(customers, transactions) {
        const weeklyData = {};
        
        for (const customer of customers) {
            const week = new Date(customer.calculatedAt).toISOString().split('T')[0];
            if (!weeklyData[week]) weeklyData[week] = { scores: [], count: 0 };
            weeklyData[week].scores.push(customer.totalScore);
            weeklyData[week].count++;
        }
        
        return Object.entries(weeklyData).slice(-12).map(([week, data]) => ({
            week: week,
            averageScore: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
            transactionCount: data.count
        }));
    }

    generateRiskRecommendations(profile) {
        const recommendations = [];
        
        if (profile.totalScore > 70) {
            recommendations.push('Immediate enhanced due diligence required');
            recommendations.push('File suspicious activity report');
            recommendations.push('Consider account restrictions');
        } else if (profile.totalScore > 50) {
            recommendations.push('Schedule compliance review within 30 days');
            recommendations.push('Request updated KYC documentation');
            recommendations.push('Increase monitoring frequency');
        } else if (profile.totalScore > 25) {
            recommendations.push('Regular monitoring recommended');
            recommendations.push('Review annually');
        }
        
        for (const factor of profile.riskFactors.slice(0, 3)) {
            recommendations.push(`${factor.factor}: ${factor.recommendation}`);
        }
        
        return recommendations;
    }

    generateRiskRecommendationsBatch(customers) {
        const highRiskCustomers = customers.filter(c => c.totalScore > 70);
        const mediumRiskCustomers = customers.filter(c => c.totalScore > 50 && c.totalScore <= 70);
        
        return {
            immediateActionRequired: highRiskCustomers.length,
            reviewRequired: mediumRiskCustomers.length,
            actions: [
                highRiskCustomers.length > 0 ? `Review ${highRiskCustomers.length} high-risk customers immediately` : null,
                mediumRiskCustomers.length > 0 ? `Schedule reviews for ${mediumRiskCustomers.length} medium-risk customers` : null,
                'Ensure all KYC documents are up to date',
                'Review transaction patterns for unusual activity'
            ].filter(Boolean)
        };
    }

    async getAlertCount(period) {
        // In production, count from alert system
        return Math.floor(Math.random() * 50);
    }

    async evaluateCustomerRule(ruleId, customerData) {
        // Evaluate specific rules
        switch (ruleId) {
            case 'high_risk_country':
                return this.isHighRiskCountry(customerData.country);
            case 'pep_status':
                return customerData.isPEP === true;
            case 'negative_media':
                return customerData.hasNegativeMedia === true;
            case 'income_mismatch':
                return this.calculateIncomeMismatch(customerData) > 3;
            case 'multiple_accounts':
                return customerData.duplicateAccounts > 1;
            case 'expired_kyc':
                return customerData.kycDocumentsExpired === true;
            case 'unusual_occupation':
                return this.isHighRiskOccupation(customerData.occupation);
            case 'age_risk':
                return this.isHighRiskAge(customerData.age);
            default:
                return false;
        }
    }

    async evaluateTransactionRule(ruleId, transactionData) {
        switch (ruleId) {
            case 'large_amount':
                return transactionData.amount > 10000;
            case 'very_large_amount':
                return transactionData.amount > 50000;
            case 'rapid_succession':
                return transactionData.transactionsPerHour > 5;
            case 'unusual_hours':
                return this.isUnusualHour(transactionData.timestamp);
            case 'high_risk_country_transfer':
                return this.isHighRiskCountry(transactionData.destinationCountry);
            case 'structured_transaction':
                return this.isStructuredTransaction(transactionData);
            case 'unusual_pattern':
                return this.isUnusualPattern(transactionData);
            case 'new_beneficiary':
                return transactionData.isNewBeneficiary === true;
            case 'crypto_mixer':
                return transactionData.usesMixer === true;
            case 'darkweb_connection':
                return transactionData.darkwebConnected === true;
            default:
                return false;
        }
    }

    async evaluateBehavioralRule(ruleId, behaviorData) {
        switch (ruleId) {
            case 'login_anomaly':
                return behaviorData.isNewLocation === true;
            case 'multiple_devices':
                return behaviorData.devicesPerDay > 3;
            case 'failed_logins':
                return behaviorData.failedLogins > 5;
            case 'password_change':
                return behaviorData.recentPasswordChange === true;
            case 'account_takeover':
                return this.isAccountTakeover(behaviorData);
            default:
                return false;
        }
    }

    // Risk evaluation helper methods
    isHighRiskCountry(country) {
        const highRiskCountries = ['CountryX', 'CountryY', 'CountryZ', 'North Korea', 'Iran', 'Syria'];
        return highRiskCountries.includes(country);
    }

    isHighRiskOccupation(occupation) {
        const highRiskOccupations = ['Cryptocurrency Trader', 'Cash Business', 'Politician', 'Military Officer'];
        return highRiskOccupations.includes(occupation);
    }

    isHighRiskAge(age) {
        return age < 18 || age > 85;
    }

    calculateIncomeMismatch(customer) {
        const expectedVolume = customer.annualIncome * 0.3;
        const actualVolume = customer.transactionVolume6Months;
        return actualVolume / expectedVolume;
    }

    isKYCDocumentsExpired(customer) {
        return customer.kycDocumentsExpired === true;
    }

    isUnusualHour(timestamp) {
        const hour = new Date(timestamp).getHours();
        return hour < 6 || hour > 22;
    }

    isStructuredTransaction(transaction) {
        // Check for amounts just below reporting thresholds
        const isJustBelowThreshold = transaction.amount > 9500 && transaction.amount < 10000;
        const hasMultipleSimilar = transaction.previousTransactions?.filter(t => 
            Math.abs(t.amount - transaction.amount) < 100
        ).length > 3;
        return isJustBelowThreshold && hasMultipleSimilar;
    }

    isUnusualPattern(transaction) {
        // Check for unusual patterns compared to historical behavior
        const averageAmount = transaction.previousTransactions?.reduce((a, b) => a + b.amount, 0) / 
            (transaction.previousTransactions?.length || 1) || transaction.amount;
        const deviation = transaction.amount / averageAmount;
        return deviation > 5 || deviation < 0.2;
    }

    isAccountTakeover(behavior) {
        return behavior.isNewLocation === true && 
               behavior.devicesPerDay > 2 && 
               behavior.failedLogins > 3 &&
               behavior.recentPasswordChange === true;
    }

    addToHistory(accountId, riskProfile) {
        let history = this.riskHistory.get(accountId) || [];
        history.push({
            score: riskProfile.totalScore,
            level: riskProfile.riskLevel,
            timestamp: riskProfile.calculatedAt
        });
        
        // Keep only last 50 records
        if (history.length > 50) {
            history = history.slice(-50);
        }
        
        this.riskHistory.set(accountId, history);
    }

    async triggerRiskAlert(accountId, transactionRisk) {
        console.log(`🚨 RISK ALERT: Account ${accountId} - Score: ${transactionRisk.totalScore}`);
        // In production, send to alert system
    }

    async autoBlockTransaction(transactionId, transactionRisk) {
        console.log(`🔒 TRANSACTION BLOCKED: ${transactionId} - Risk Score: ${transactionRisk.totalScore}`);
        // In production, block transaction
    }

    startRealTimeMonitoring() {
        setInterval(() => {
            // Real-time risk monitoring logic
            console.log('Real-time risk monitoring active');
        }, 60000);
    }

    async getCustomerData(accountId) {
        // In production, fetch from database
        return {
            accountId: accountId,
            name: 'Test Customer',
            country: 'USA',
            isPEP: false,
            hasNegativeMedia: false,
            annualIncome: 100000,
            occupation: 'Engineer',
            age: 35,
            accountAgeMonths: 12,
            transactionVolume6Months: 50000,
            averageTransaction: 1000,
            kycDocumentsExpired: false,
            duplicateAccounts: 1
        };
    }
}

module.exports = new RiskScoringService();
