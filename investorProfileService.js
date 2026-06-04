// investorProfileService.js - Complete Investor Profile System
// Features: Risk profiling, Investment preferences, Portfolio management, Performance tracking, Goal setting

const { v4: uuidv4 } = require('uuid');

class InvestorProfileService {
    constructor() {
        this.investorProfiles = new Map(); // userId -> profile
        this.riskAssessments = new Map(); // userId -> assessment
        this.investmentGoals = new Map(); // userId -> goals
        self.portfolios = new Map(); // userId -> portfolio
        self.performanceHistory = new Map(); // userId -> history
        
        // Initialize with sample data
        this.initializeSampleData();
    }

    // ============= 1. INITIALIZE SAMPLE DATA =============
    initializeSampleData() {
        const sampleUsers = ['user_1', 'user_2', 'user_3', 'user_4'];
        
        sampleUsers.forEach(userId => {
            // Create investor profile
            const profile = this.createInitialProfile(userId);
            this.investorProfiles.set(userId, profile);
            
            // Create risk assessment
            const riskAssessment = this.createRiskAssessment(userId);
            this.riskAssessments.set(userId, riskAssessment);
            
            // Create investment goals
            const goals = this.createInvestmentGoals(userId);
            this.investmentGoals.set(userId, goals);
            
            // Create portfolio
            const portfolio = this.createPortfolio(userId);
            this.portfolios.set(userId, portfolio);
        });
    }

    createInitialProfile(userId) {
        return {
            userId: userId,
            investorType: 'moderate', // conservative, moderate, aggressive
            riskTolerance: 5, // 1-10 scale
            investmentHorizon: 'long', // short(1-3y), medium(3-7y), long(7+y)
            liquidityNeeds: 'medium', // low, medium, high
            incomeLevel: 'high',
            netWorth: 500000,
            annualIncome: 150000,
            investmentExperience: 'intermediate', // beginner, intermediate, advanced, expert
            preferredMarkets: ['stocks', 'etfs', 'crypto'],
            excludedSectors: [],
            esgPreference: 'neutral', // esg_focused, neutral, no_preference
            taxConsiderations: 'growth_oriented',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    createRiskAssessment(userId) {
        return {
            id: uuidv4(),
            userId: userId,
            assessmentDate: new Date().toISOString(),
            riskScore: 65, // 0-100
            riskLevel: 'moderate', // conservative, moderate, aggressive
            riskFactors: {
                timeHorizon: 70,
                financialSituation: 80,
                investmentKnowledge: 60,
                riskAttitude: 65,
                lossTolerance: 55,
                goalClarity: 75
            },
            recommendations: [
                'Diversify across multiple asset classes',
                'Consider increasing exposure to growth stocks',
                'Maintain emergency fund of 6 months expenses'
            ],
            suggestedAllocation: {
                cash: 10,
                bonds: 20,
                stocks: 50,
                crypto: 10,
                alternatives: 10
            },
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        };
    }

    createInvestmentGoals(userId) {
        return [
            {
                id: uuidv4(),
                userId: userId,
                name: 'Retirement Fund',
                targetAmount: 1000000,
                currentAmount: 250000,
                targetDate: new Date(Date.now() + 20 * 365 * 24 * 60 * 60 * 1000).toISOString(),
                priority: 'high',
                status: 'in_progress',
                monthlyContribution: 2000,
                expectedReturn: 7,
                createdAt: new Date().toISOString()
            },
            {
                id: uuidv4(),
                userId: userId,
                name: 'House Down Payment',
                targetAmount: 200000,
                currentAmount: 50000,
                targetDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
                priority: 'medium',
                status: 'in_progress',
                monthlyContribution: 1500,
                expectedReturn: 5,
                createdAt: new Date().toISOString()
            }
        ];
    }

    createPortfolio(userId) {
        return {
            userId: userId,
            totalValue: 125000,
            cashBalance: 25000,
            investedValue: 100000,
            returns: {
                daily: 1.2,
                weekly: 3.5,
                monthly: 8.2,
                yearly: 24.5,
                total: 45.8
            },
            allocations: {
                stocks: {
                    percentage: 45,
                    value: 56250,
                    holdings: [
                        { symbol: 'AAPL', name: 'Apple Inc.', value: 15000, percentage: 12 },
                        { symbol: 'GOOGL', name: 'Google', value: 12500, percentage: 10 },
                        { symbol: 'MSFT', name: 'Microsoft', value: 13750, percentage: 11 },
                        { symbol: 'AMZN', name: 'Amazon', value: 10000, percentage: 8 },
                        { symbol: 'TSLA', name: 'Tesla', value: 5000, percentage: 4 }
                    ]
                },
                crypto: {
                    percentage: 15,
                    value: 18750,
                    holdings: [
                        { symbol: 'BTC', name: 'Bitcoin', value: 10000, percentage: 8 },
                        { symbol: 'ETH', name: 'Ethereum', value: 5000, percentage: 4 },
                        { symbol: 'BRC', name: 'BRADICOIN', value: 3750, percentage: 3 }
                    ]
                },
                bonds: {
                    percentage: 20,
                    value: 25000,
                    holdings: [
                        { name: 'US Treasury Bonds', value: 15000, percentage: 12 },
                        { name: 'Corporate Bonds', value: 10000, percentage: 8 }
                    ]
                },
                alternatives: {
                    percentage: 10,
                    value: 12500,
                    holdings: [
                        { name: 'Real Estate Fund', value: 7500, percentage: 6 },
                        { name: 'Private Equity', value: 5000, percentage: 4 }
                    ]
                },
                cash: {
                    percentage: 10,
                    value: 12500
                }
            },
            lastUpdated: new Date().toISOString()
        };
    }

    // ============= 2. CREATE INVESTOR PROFILE =============
    async createInvestorProfile(userId, profileData) {
        const existingProfile = this.investorProfiles.get(userId);
        if (existingProfile) {
            return {
                success: false,
                error: 'Investor profile already exists'
            };
        }

        const profile = {
            userId: userId,
            investorType: profileData.investorType || 'moderate',
            riskTolerance: profileData.riskTolerance || 5,
            investmentHorizon: profileData.investmentHorizon || 'long',
            liquidityNeeds: profileData.liquidityNeeds || 'medium',
            incomeLevel: profileData.incomeLevel || 'medium',
            netWorth: profileData.netWorth || 0,
            annualIncome: profileData.annualIncome || 0,
            investmentExperience: profileData.investmentExperience || 'beginner',
            preferredMarkets: profileData.preferredMarkets || ['stocks', 'etfs'],
            excludedSectors: profileData.excludedSectors || [],
            esgPreference: profileData.esgPreference || 'neutral',
            taxConsiderations: profileData.taxConsiderations || 'balanced',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.investorProfiles.set(userId, profile);

        return {
            success: true,
            message: 'Investor profile created successfully',
            profile: profile
        };
    }

    // ============= 3. GET INVESTOR PROFILE =============
    async getInvestorProfile(userId) {
        const profile = this.investorProfiles.get(userId);
        
        if (!profile) {
            return {
                success: false,
                error: 'Investor profile not found'
            };
        }

        return {
            success: true,
            profile: profile
        };
    }

    // ============= 4. UPDATE INVESTOR PROFILE =============
    async updateInvestorProfile(userId, updateData) {
        const profile = this.investorProfiles.get(userId);
        
        if (!profile) {
            return {
                success: false,
                error: 'Investor profile not found'
            };
        }

        const allowedUpdates = [
            'investorType', 'riskTolerance', 'investmentHorizon', 'liquidityNeeds',
            'incomeLevel', 'netWorth', 'annualIncome', 'investmentExperience',
            'preferredMarkets', 'excludedSectors', 'esgPreference', 'taxConsiderations'
        ];

        for (const key of allowedUpdates) {
            if (updateData[key] !== undefined) {
                profile[key] = updateData[key];
            }
        }

        profile.updatedAt = new Date().toISOString();
        this.investorProfiles.set(userId, profile);

        return {
            success: true,
            message: 'Investor profile updated successfully',
            profile: profile
        };
    }

    // ============= 5. TAKE RISK ASSESSMENT QUESTIONNAIRE =============
    async takeRiskAssessment(userId, answers) => {
        // Risk assessment questions (10 questions)
        const questions = [
            { id: 'q1', text: 'What is your age?', weights: { '18-30': 8, '31-45': 7, '46-60': 5, '60+': 3 } },
            { id: 'q2', text: 'What is your investment time horizon?', weights: { '<1 year': 2, '1-3 years': 4, '3-7 years': 7, '7+ years': 10 } },
            { id: 'q3', text: 'How would you react to a 20% market drop?', weights: { 'Sell everything': 1, 'Sell some': 3, 'Do nothing': 6, 'Buy more': 10 } },
            { id: 'q4', text: 'What is your primary investment goal?', weights: { 'Capital preservation': 3, 'Income generation': 5, 'Growth': 8, 'Aggressive growth': 10 } },
            { id: 'q5', text: 'How would you describe your investment knowledge?', weights: { 'None': 2, 'Limited': 4, 'Good': 7, 'Expert': 10 } },
            { id: 'q6', text: 'What percentage of your net worth is invested?', weights: { '<10%': 3, '10-30%': 5, '30-50%': 7, '>50%': 9 } },
            { id: 'q7', text: 'How important is liquidity to you?', weights: { 'Very important': 3, 'Somewhat important': 5, 'Not important': 8, 'Not at all': 10 } },
            { id: 'q8', text: 'What level of volatility are you comfortable with?', weights: { 'Very low': 2, 'Low': 4, 'Moderate': 7, 'High': 10 } },
            { id: 'q9', text: 'Do you have other sources of income?', weights: { 'No': 4, 'Yes, limited': 6, 'Yes, substantial': 8, 'Yes, very substantial': 10 } },
            { id: 'q10', text: 'How would you describe your risk tolerance?', weights: { 'Very conservative': 2, 'Conservative': 4, 'Moderate': 7, 'Aggressive': 10 } }
        ];

        // Calculate risk score
        let totalScore = 0;
        let maxPossibleScore = 0;

        for (const question of questions) {
            const answer = answers[question.id];
            const weight = question.weights[answer] || 5;
            totalScore += weight;
            maxPossibleScore += 10;
        }

        const riskScore = Math.round((totalScore / maxPossibleScore) * 100);
        
        // Determine risk level
        let riskLevel = 'conservative';
        let investorType = 'conservative';
        
        if (riskScore >= 75) {
            riskLevel = 'aggressive';
            investorType = 'aggressive';
        } else if (riskScore >= 50) {
            riskLevel = 'moderate';
            investorType = 'moderate';
        } else if (riskScore >= 25) {
            riskLevel = 'conservative';
            investorType = 'conservative';
        }

        // Calculate factor scores
        const factorScores = {
            timeHorizon: this.calculateFactorScore(answers, ['q2']),
            financialSituation: this.calculateFactorScore(answers, ['q6', 'q9']),
            investmentKnowledge: this.calculateFactorScore(answers, ['q5']),
            riskAttitude: this.calculateFactorScore(answers, ['q3', 'q8', 'q10']),
            lossTolerance: this.calculateFactorScore(answers, ['q3']),
            goalClarity: this.calculateFactorScore(answers, ['q4'])
        };

        // Generate suggested allocation
        const suggestedAllocation = this.generateSuggestedAllocation(riskLevel);
        
        // Generate recommendations
        const recommendations = this.generateRecommendations(riskLevel, factorScores);

        const riskAssessment = {
            id: uuidv4(),
            userId: userId,
            assessmentDate: new Date().toISOString(),
            riskScore: riskScore,
            riskLevel: riskLevel,
            investorType: investorType,
            factorScores: factorScores,
            answers: answers,
            recommendations: recommendations,
            suggestedAllocation: suggestedAllocation,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        };

        this.riskAssessments.set(userId, riskAssessment);
        
        // Update investor profile with new risk tolerance
        const profile = this.investorProfiles.get(userId);
        if (profile) {
            profile.riskTolerance = riskScore / 10;
            profile.investorType = investorType;
            profile.updatedAt = new Date().toISOString();
            this.investorProfiles.set(userId, profile);
        }

        return {
            success: true,
            assessment: riskAssessment
        };
    }

    calculateFactorScore(answers, questionIds) {
        let score = 0;
        for (const id of questionIds) {
            if (answers[id]) {
                const weights = {
                    'q2': { '<1 year': 2, '1-3 years': 4, '3-7 years': 7, '7+ years': 10 },
                    'q3': { 'Sell everything': 1, 'Sell some': 3, 'Do nothing': 6, 'Buy more': 10 },
                    'q4': { 'Capital preservation': 3, 'Income generation': 5, 'Growth': 8, 'Aggressive growth': 10 },
                    'q5': { 'None': 2, 'Limited': 4, 'Good': 7, 'Expert': 10 },
                    'q6': { '<10%': 3, '10-30%': 5, '30-50%': 7, '>50%': 9 },
                    'q8': { 'Very low': 2, 'Low': 4, 'Moderate': 7, 'High': 10 },
                    'q9': { 'No': 4, 'Yes, limited': 6, 'Yes, substantial': 8, 'Yes, very substantial': 10 },
                    'q10': { 'Very conservative': 2, 'Conservative': 4, 'Moderate': 7, 'Aggressive': 10 }
                };
                score += weights[id][answers[id]] || 5;
            }
        }
        return Math.round((score / (questionIds.length * 10)) * 100);
    }

    generateSuggestedAllocation(riskLevel) {
        const allocations = {
            conservative: {
                cash: 20,
                bonds: 40,
                stocks: 30,
                crypto: 5,
                alternatives: 5
            },
            moderate: {
                cash: 10,
                bonds: 20,
                stocks: 50,
                crypto: 10,
                alternatives: 10
            },
            aggressive: {
                cash: 5,
                bonds: 10,
                stocks: 55,
                crypto: 20,
                alternatives: 10
            }
        };
        
        return allocations[riskLevel];
    }

    generateRecommendations(riskLevel, factorScores) {
        const recommendations = {
            conservative: [
                'Focus on capital preservation and income generation',
                'Consider high-quality bonds and dividend-paying stocks',
                'Maintain adequate cash reserves for emergencies',
                'Avoid high-volatility investments',
                'Diversify across different bond maturities'
            ],
            moderate: [
                'Balance growth with risk management',
                'Diversify across multiple asset classes',
                'Consider dollar-cost averaging for regular investments',
                'Maintain 6-12 months of emergency fund',
                'Rebalance portfolio semi-annually'
            ],
            aggressive: [
                'Focus on long-term growth opportunities',
                'Consider higher allocation to growth stocks and crypto',
                'Take advantage of market downturns to add positions',
                'Consider alternative investments for diversification',
                'Review portfolio quarterly for rebalancing'
            ]
        };
        
        const baseRecommendations = recommendations[riskLevel];
        const personalizedRecommendations = [...baseRecommendations];
        
        if (factorScores.investmentKnowledge < 40) {
            personalizedRecommendations.push('Consider working with a financial advisor');
            personalizedRecommendations.push('Start with ETF investments for diversification');
        }
        
        if (factorScores.financialSituation < 50) {
            personalizedRecommendations.push('Build emergency fund before aggressive investing');
            personalizedRecommendations.push('Consider starting with smaller investment amounts');
        }
        
        return personalizedRecommendations;
    }

    // ============= 6. GET RISK ASSESSMENT =============
    async getRiskAssessment(userId) {
        const assessment = this.riskAssessments.get(userId);
        
        if (!assessment) {
            return {
                success: false,
                error: 'Risk assessment not found. Please complete the questionnaire.'
            };
        }

        return {
            success: true,
            assessment: assessment
        };
    }

    // ============= 7. CREATE INVESTMENT GOAL =============
    async createInvestmentGoal(userId, goalData) {
        const { name, targetAmount, targetDate, priority, monthlyContribution, expectedReturn } = goalData;

        const goal = {
            id: uuidv4(),
            userId: userId,
            name: name,
            targetAmount: targetAmount,
            currentAmount: 0,
            targetDate: targetDate,
            priority: priority || 'medium',
            status: 'in_progress',
            monthlyContribution: monthlyContribution || 0,
            expectedReturn: expectedReturn || 7,
            contributions: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        let goals = this.investmentGoals.get(userId) || [];
        goals.push(goal);
        this.investmentGoals.set(userId, goals);

        return {
            success: true,
            message: 'Investment goal created successfully',
            goal: goal
        };
    }

    // ============= 8. GET INVESTMENT GOALS =============
    async getInvestmentGoals(userId) {
        const goals = this.investmentGoals.get(userId) || [];
        
        // Calculate progress for each goal
        const goalsWithProgress = goals.map(goal => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const monthsRemaining = this.getMonthsRemaining(goal.targetDate);
            const monthlyNeeded = (goal.targetAmount - goal.currentAmount) / monthsRemaining;
            
            return {
                ...goal,
                progress: Math.min(100, Math.round(progress)),
                monthsRemaining: monthsRemaining,
                monthlyNeeded: monthlyNeeded,
                onTrack: monthlyNeeded <= goal.monthlyContribution
            };
        });

        return {
            success: true,
            goals: goalsWithProgress
        };
    }

    // ============= 9. UPDATE INVESTMENT GOAL =============
    async updateInvestmentGoal(userId, goalId, updateData) {
        let goals = this.investmentGoals.get(userId) || [];
        const goalIndex = goals.findIndex(g => g.id === goalId);
        
        if (goalIndex === -1) {
            return {
                success: false,
                error: 'Investment goal not found'
            };
        }

        const allowedUpdates = ['name', 'targetAmount', 'targetDate', 'priority', 'monthlyContribution', 'expectedReturn'];
        
        for (const key of allowedUpdates) {
            if (updateData[key] !== undefined) {
                goals[goalIndex][key] = updateData[key];
            }
        }
        
        goals[goalIndex].updatedAt = new Date().toISOString();
        this.investmentGoals.set(userId, goals);

        return {
            success: true,
            message: 'Investment goal updated successfully',
            goal: goals[goalIndex]
        };
    }

    // ============= 10. DELETE INVESTMENT GOAL =============
    async deleteInvestmentGoal(userId, goalId) {
        let goals = this.investmentGoals.get(userId) || [];
        const initialLength = goals.length;
        goals = goals.filter(g => g.id !== goalId);
        
        if (goals.length === initialLength) {
            return {
                success: false,
                error: 'Investment goal not found'
            };
        }
        
        this.investmentGoals.set(userId, goals);

        return {
            success: true,
            message: 'Investment goal deleted successfully'
        };
    }

    // ============= 11. ADD CONTRIBUTION TO GOAL =============
    async addContribution(userId, goalId, amount) {
        let goals = this.investmentGoals.get(userId) || [];
        const goal = goals.find(g => g.id === goalId);
        
        if (!goal) {
            return {
                success: false,
                error: 'Investment goal not found'
            };
        }

        goal.currentAmount += amount;
        goal.contributions.push({
            amount: amount,
            date: new Date().toISOString()
        });
        goal.updatedAt = new Date().toISOString();
        
        this.investmentGoals.set(userId, goals);

        return {
            success: true,
            message: 'Contribution added successfully',
            currentAmount: goal.currentAmount,
            progress: (goal.currentAmount / goal.targetAmount) * 100
        };
    }

    // ============= 12. GET PORTFOLIO =============
    async getPortfolio(userId) {
        const portfolio = this.portfolios.get(userId);
        
        if (!portfolio) {
            return {
                success: false,
                error: 'Portfolio not found'
            };
        }

        // Calculate portfolio metrics
        const metrics = this.calculatePortfolioMetrics(portfolio);
        
        return {
            success: true,
            portfolio: {
                ...portfolio,
                metrics: metrics
            }
        };
    }

    calculatePortfolioMetrics(portfolio) {
        const totalValue = portfolio.totalValue;
        const cashPercentage = (portfolio.cashBalance / totalValue) * 100;
        
        // Calculate diversification score (0-100)
        const allocationCount = Object.keys(portfolio.allocations).length;
        const diversificationScore = Math.min(100, allocationCount * 20);
        
        // Calculate risk score based on allocation
        let riskScore = 0;
        riskScore += portfolio.allocations.cash.percentage * 0.5;
        riskScore += portfolio.allocations.bonds.percentage * 2;
        riskScore += portfolio.allocations.stocks.percentage * 6;
        riskScore += portfolio.allocations.crypto.percentage * 9;
        riskScore += portfolio.allocations.alternatives.percentage * 7;
        
        return {
            totalValue: totalValue,
            cashPercentage: cashPercentage,
            diversificationScore: diversificationScore,
            riskScore: Math.round(riskScore / 10),
            monthlyReturn: portfolio.returns.monthly,
            yearlyReturn: portfolio.returns.yearly,
            topHoldings: this.getTopHoldings(portfolio)
        };
    }

    getTopHoldings(portfolio) {
        const allHoldings = [];
        
        if (portfolio.allocations.stocks.holdings) {
            allHoldings.push(...portfolio.allocations.stocks.holdings);
        }
        if (portfolio.allocations.crypto.holdings) {
            allHoldings.push(...portfolio.allocations.crypto.holdings);
        }
        
        return allHoldings.sort((a, b) => b.value - a.value).slice(0, 5);
    }

    // ============= 13. UPDATE PORTFOLIO ALLOCATION =============
    async updatePortfolioAllocation(userId, newAllocation) {
        const portfolio = this.portfolios.get(userId);
        
        if (!portfolio) {
            return {
                success: false,
                error: 'Portfolio not found'
            };
        }

        // Validate allocation sums to 100%
        const total = Object.values(newAllocation).reduce((sum, val) => sum + val, 0);
        if (Math.abs(total - 100) > 0.01) {
            return {
                success: false,
                error: 'Allocation percentages must sum to 100%'
            };
        }

        portfolio.allocations = {
            ...portfolio.allocations,
            ...newAllocation
        };
        portfolio.lastUpdated = new Date().toISOString();
        
        this.portfolios.set(userId, portfolio);

        return {
            success: true,
            message: 'Portfolio allocation updated successfully',
            portfolio: portfolio
        };
    }

    // ============= 14. GET PERFORMANCE HISTORY =============
    async getPerformanceHistory(userId, period = '1y') {
        // Generate performance data based on period
        const history = this.generatePerformanceData(userId, period);
        
        return {
            success: true,
            period: period,
            history: history,
            summary: this.calculatePerformanceSummary(history)
        };
    }

    generatePerformanceData(userId, period) {
        const data = [];
        const now = new Date();
        let startDate;
        let interval;
        
        switch (period) {
            case '1m':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                interval = 'day';
                break;
            case '3m':
                startDate = new Date(now.setMonth(now.getMonth() - 3));
                interval = 'week';
                break;
            case '6m':
                startDate = new Date(now.setMonth(now.getMonth() - 6));
                interval = 'week';
                break;
            case '1y':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                interval = 'month';
                break;
            default:
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                interval = 'month';
        }
        
        let currentValue = 100000;
        let currentDate = startDate;
        
        while (currentDate <= new Date()) {
            const change = (Math.random() - 0.5) * 0.1;
            currentValue = currentValue * (1 + change);
            
            data.push({
                date: currentDate.toISOString(),
                value: Math.round(currentValue),
                change: change * 100
            });
            
            if (interval === 'day') currentDate.setDate(currentDate.getDate() + 1);
            else if (interval === 'week') currentDate.setDate(currentDate.getDate() + 7);
            else currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        return data;
    }

    calculatePerformanceSummary(history) {
        const startValue = history[0]?.value || 0;
        const endValue = history[history.length - 1]?.value || 0;
        const totalReturn = ((endValue - startValue) / startValue) * 100;
        
        const positiveDays = history.filter(h => h.change > 0).length;
        const negativeDays = history.filter(h => h.change < 0).length;
        
        return {
            totalReturn: totalReturn.toFixed(2),
            startValue: startValue,
            endValue: endValue,
            absoluteReturn: endValue - startValue,
            positivePeriods: positiveDays,
            negativePeriods: negativeDays,
            winRate: ((positiveDays / history.length) * 100).toFixed(1)
        };
    }

    // ============= 15. GET INVESTMENT RECOMMENDATIONS =============
    async getInvestmentRecommendations(userId) {
        const profile = this.investorProfiles.get(userId);
        const assessment = this.riskAssessments.get(userId);
        const portfolio = this.portfolios.get(userId);
        
        if (!profile || !assessment) {
            return {
                success: false,
                error: 'Complete your investor profile and risk assessment first'
            };
        }

        const recommendations = {
            assetAllocation: this.generateAssetAllocationRecommendation(profile, assessment),
            specificInvestments: this.generateSpecificInvestments(profile),
            rebalancingAdvice: this.generateRebalancingAdvice(portfolio, assessment),
            riskManagement: this.generateRiskManagementAdvice(profile),
            taxOptimization: this.generateTaxOptimizationAdvice(profile)
        };

        return {
            success: true,
            recommendations: recommendations
        };
    }

    generateAssetAllocationRecommendation(profile, assessment) {
        const baseAllocation = assessment.suggestedAllocation;
        
        // Adjust based on investor preferences
        let adjustedAllocation = { ...baseAllocation };
        
        if (profile.esgPreference === 'esg_focused') {
            adjustedAllocation.stocks = Math.max(0, adjustedAllocation.stocks - 5);
            adjustedAllocation.alternatives = adjustedAllocation.alternatives + 5;
        }
        
        if (profile.liquidityNeeds === 'high') {
            adjustedAllocation.cash = adjustedAllocation.cash + 10;
            adjustedAllocation.stocks = Math.max(0, adjustedAllocation.stocks - 10);
        }
        
        return adjustedAllocation;
    }

    generateSpecificInvestments(profile) {
        const investments = [];
        
        if (profile.preferredMarkets.includes('stocks')) {
            investments.push({
                category: 'Stocks',
                recommendations: [
                    { name: 'S&P 500 ETF', ticker: 'SPY', reason: 'Broad market exposure' },
                    { name: 'Growth ETF', ticker: 'VUG', reason: 'Focus on growth companies' },
                    { name: 'Dividend ETF', ticker: 'SCHD', reason: 'Regular income' }
                ]
            });
        }
        
        if (profile.preferredMarkets.includes('crypto')) {
            investments.push({
                category: 'Cryptocurrency',
                recommendations: [
                    { name: 'Bitcoin', ticker: 'BTC', reason: 'Store of value' },
                    { name: 'Ethereum', ticker: 'ETH', reason: 'Smart contract platform' },
                    { name: 'BRADICOIN', ticker: 'BRC', reason: 'Native Zentronix token' }
                ]
            });
        }
        
        return investments;
    }

    generateRebalancingAdvice(portfolio, assessment) {
        if (!portfolio) return ['Complete portfolio setup to receive rebalancing advice'];
        
        const advice = [];
        const targetAllocation = assessment.suggestedAllocation;
        
        for (const [asset, target] of Object.entries(targetAllocation)) {
            const current = portfolio.allocations[asset]?.percentage || 0;
            const difference = current - target;
            
            if (Math.abs(difference) > 5) {
                if (difference > 0) {
                    advice.push(`Reduce ${asset} allocation by ${Math.abs(difference).toFixed(1)}%`);
                } else {
                    advice.push(`Increase ${asset} allocation by ${Math.abs(difference).toFixed(1)}%`);
                }
            }
        }
        
        if (advice.length === 0) {
            advice.push('Your portfolio is well-balanced. Continue with regular contributions.');
        }
        
        return advice;
    }

    generateRiskManagementAdvice(profile) {
        const advice = [];
        
        if (profile.riskTolerance > 7) {
            advice.push('Consider stop-loss orders for volatile positions');
            advice.push('Diversify across uncorrelated assets');
        }
        
        if (profile.investmentHorizon === 'short') {
            advice.push('Maintain higher cash allocation for capital preservation');
            advice.push('Avoid highly volatile investments');
        }
        
        advice.push('Review portfolio quarterly and rebalance as needed');
        advice.push('Maintain emergency fund of 6-12 months expenses');
        
        return advice;
    }

    generateTaxOptimizationAdvice(profile) {
        const advice = [];
        
        if (profile.taxConsiderations === 'growth_oriented') {
            advice.push('Consider holding growth investments in tax-advantaged accounts');
            advice.push('Tax-loss harvesting opportunities available');
        }
        
        advice.push('Review tax implications before rebalancing');
        advice.push('Consider municipal bonds for tax-free income');
        
        return advice;
    }

    // ============= HELPER FUNCTIONS =============
    getMonthsRemaining(targetDate) {
        const target = new Date(targetDate);
        const now = new Date();
        const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
        return Math.max(1, months);
    }
}

module.exports = new InvestorProfileService();
