// debtRenegotiationService.js - Complete Debt Renegotiation System
// Features: Loan restructuring, Payment plan adjustment, Interest rate modification, Extension requests, Partial payments

const { v4: uuidv4 } = require('uuid');

class DebtRenegotiationService {
    constructor() {
        this.renegotiationRequests = new Map(); // requestId -> request details
        this.activePlans = new Map(); // accountId -> active renegotiation plan
        this.renegotiationHistory = new Map(); // accountId -> history
        this.paymentPlans = this.initializePaymentPlans();
        this.hardshipReasons = this.initializeHardshipReasons();
        
        // Initialize sample data
        this.initializeSampleData();
    }

    // ============= 1. INITIALIZE PAYMENT PLANS =============
    initializePaymentPlans() {
        return {
            extended_term: {
                name: 'Extended Term Plan',
                description: 'Extend loan term to reduce monthly payments',
                maxExtensionMonths: 24,
                interestRateAdjustment: 0.5, // +0.5%
                fees: 100,
                eligibility: ['active', 'payment_delayed'],
                requiresApproval: true
            },
            reduced_payment: {
                name: 'Reduced Payment Plan',
                description: 'Temporary reduction of monthly payments',
                reductionPercentage: 50,
                maxDurationMonths: 6,
                interestRateAdjustment: 1.0,
                fees: 50,
                eligibility: ['hardship', 'unemployment'],
                requiresApproval: true,
                maxReductions: 2
            },
            interest_only: {
                name: 'Interest Only Plan',
                description: 'Pay only interest for a specified period',
                durationMonths: 6,
                interestRateAdjustment: 0,
                fees: 25,
                eligibility: ['temporary_hardship'],
                requiresApproval: true,
                maxDuration: 12
            },
            payment_holiday: {
                name: 'Payment Holiday',
                description: 'Temporary pause on payments',
                durationMonths: 3,
                interestRateAdjustment: 1.5,
                fees: 75,
                eligibility: ['emergency', 'natural_disaster'],
                requiresApproval: true,
                maxHolidays: 2
            },
            lump_settlement: {
                name: 'Lump Sum Settlement',
                description: 'One-time reduced payment to settle debt',
                discountPercentage: 20,
                minimumPayment: 5000,
                fees: 0,
                eligibility: ['serious_delinquency'],
                requiresApproval: true,
                maxDiscount: 40
            },
            graduated_payment: {
                name: 'Graduated Payment Plan',
                description: 'Lower payments that increase over time',
                startPercentage: 50,
                increaseFrequency: 'quarterly',
                increaseAmount: 10,
                durationMonths: 24,
                interestRateAdjustment: 0,
                fees: 100,
                eligibility: ['active'],
                requiresApproval: true
            }
        };
    }

    // ============= 2. INITIALIZE HARDSHIP REASONS =============
    initializeHardshipReasons() {
        return {
            unemployment: {
                name: 'Job Loss / Unemployment',
                category: 'income',
                documentationRequired: ['termination_letter', 'unemployment_benefits'],
                maxPlanDuration: 12,
                planOptions: ['extended_term', 'reduced_payment', 'payment_holiday']
            },
            medical_emergency: {
                name: 'Medical Emergency',
                category: 'health',
                documentationRequired: ['medical_bills', 'hospital_discharge'],
                maxPlanDuration: 6,
                planOptions: ['payment_holiday', 'reduced_payment', 'interest_only']
            },
            business_downturn: {
                name: 'Business Downturn',
                category: 'business',
                documentationRequired: ['financial_statements', 'tax_returns'],
                maxPlanDuration: 18,
                planOptions: ['extended_term', 'reduced_payment', 'graduated_payment']
            },
            natural_disaster: {
                name: 'Natural Disaster',
                category: 'disaster',
                documentationRequired: ['disaster_declaration', 'insurance_claim'],
                maxPlanDuration: 12,
                planOptions: ['payment_holiday', 'reduced_payment', 'extended_term']
            },
            divorce: {
                name: 'Divorce / Separation',
                category: 'personal',
                documentationRequired: ['divorce_decree', 'support_agreement'],
                maxPlanDuration: 12,
                planOptions: ['extended_term', 'reduced_payment']
            },
            death_family: {
                name: 'Death in Family',
                category: 'personal',
                documentationRequired: ['death_certificate'],
                maxPlanDuration: 6,
                planOptions: ['payment_holiday', 'reduced_payment']
            },
            reduced_income: {
                name: 'Reduced Income',
                category: 'income',
                documentationRequired: ['pay_stubs', 'employment_letter'],
                maxPlanDuration: 24,
                planOptions: ['reduced_payment', 'extended_term', 'graduated_payment']
            }
        };
    }

    // ============= 3. INITIALIZE SAMPLE DATA =============
    initializeSampleData() {
        const sampleRequests = [
            {
                id: uuidv4(),
                loanId: 'L-001',
                accountId: 'user_11',
                userName: 'Robert Johnson',
                email: 'robert@example.com',
                outstandingBalance: 25000,
                originalPayment: 850,
                requestedPlan: 'extended_term',
                hardshipReason: 'unemployment',
                hardshipDetails: 'Company downsizing, lost job 2 months ago',
                status: 'pending_review',
                submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                documentsSubmitted: ['termination_letter.pdf'],
                documentsRequired: ['termination_letter', 'unemployment_benefits'],
                proposedTerms: {
                    newMonthlyPayment: 520,
                    newTermMonths: 48,
                    originalTermMonths: 36,
                    interestRate: 6.4,
                    originalRate: 5.9,
                    totalAdditionalInterest: 1250
                }
            },
            {
                id: uuidv4(),
                loanId: 'L-002',
                accountId: 'user_12',
                userName: 'Maria Santos',
                email: 'maria@example.com',
                outstandingBalance: 15000,
                originalPayment: 620,
                requestedPlan: 'payment_holiday',
                hardshipReason: 'medical_emergency',
                hardshipDetails: 'Unexpected surgery, high medical bills',
                status: 'pending_review',
                submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                documentsSubmitted: ['medical_bills.pdf'],
                documentsRequired: ['medical_bills', 'hospital_discharge'],
                proposedTerms: {
                    holidayMonths: 3,
                    resumePayment: 670,
                    extendedTerm: 3
                }
            }
        ];

        sampleRequests.forEach(request => {
            this.renegotiationRequests.set(request.id, request);
        });

        // Sample active plan
        const activePlan = {
            id: uuidv4(),
            loanId: 'L-003',
            accountId: 'user_13',
            userName: 'James Wilson',
            planType: 'reduced_payment',
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
            originalPayment: 950,
            currentPayment: 475,
            paymentsMade: 4,
            totalPayments: 12,
            status: 'active',
            nextPaymentDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            missedPayments: 0
        };
        
        this.activePlans.set('user_13', activePlan);
    }

    // ============= 4. SUBMIT RENEGOTIATION REQUEST =============
    async submitRenegotiationRequest(accountId, requestData) {
        const {
            loanId,
            requestedPlan,
            hardshipReason,
            hardshipDetails,
            proposedTerms,
            documents
        } = requestData;

        // Validate loan exists
        const loan = await this.getLoanDetails(accountId, loanId);
        if (!loan) {
            return {
                success: false,
                error: 'Loan not found'
            };
        }

        // Check if already in renegotiation
        const existingRequest = Array.from(this.renegotiationRequests.values()).find(
            r => r.accountId === accountId && r.loanId === loanId && 
            ['pending_review', 'under_review', 'negotiation'].includes(r.status)
        );
        
        if (existingRequest) {
            return {
                success: false,
                error: 'You already have a pending renegotiation request',
                requestId: existingRequest.id,
                status: existingRequest.status
            };
        }

        // Check if already in active plan
        const activePlan = this.activePlans.get(accountId);
        if (activePlan && activePlan.status === 'active') {
            return {
                success: false,
                error: 'You already have an active renegotiation plan',
                activePlan: activePlan
            };
        }

        const planConfig = this.paymentPlans[requestedPlan];
        if (!planConfig) {
            return {
                success: false,
                error: 'Invalid payment plan requested'
            };
        }

        const hardshipConfig = this.hardshipReasons[hardshipReason];
        if (!hardshipConfig) {
            return {
                success: false,
                error: 'Invalid hardship reason'
            };
        }

        // Verify hardship reason is eligible for requested plan
        if (!hardshipConfig.planOptions.includes(requestedPlan)) {
            return {
                success: false,
                error: `${hardshipConfig.name} is not eligible for ${planConfig.name}`,
                eligiblePlans: hardshipConfig.planOptions
            };
        }

        const requestId = uuidv4();
        
        const renegotiationRequest = {
            id: requestId,
            loanId: loanId,
            accountId: accountId,
            userName: await this.getUserName(accountId),
            email: await this.getUserEmail(accountId),
            outstandingBalance: loan.outstandingBalance,
            originalPayment: loan.monthlyPayment,
            originalRate: loan.interestRate,
            originalTerm: loan.termMonths,
            requestedPlan: requestedPlan,
            hardshipReason: hardshipReason,
            hardshipDetails: hardshipDetails,
            proposedTerms: proposedTerms,
            status: 'pending_review',
            submittedAt: new Date().toISOString(),
            documentsSubmitted: documents || [],
            documentsRequired: hardshipConfig.documentationRequired,
            reviewedBy: null,
            reviewedAt: null,
            approvalNotes: null,
            rejectionReason: null,
            counterOffer: null,
            negotiationHistory: [],
            requiresLegalReview: loan.outstandingBalance > 50000,
            estimatedProcessingDays: this.calculateProcessingDays(loan.outstandingBalance),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        this.renegotiationRequests.set(requestId, renegotiationRequest);
        
        // Add to history
        this.addToHistory(accountId, 'RENEGOTIATION_REQUESTED', renegotiationRequest);
        
        // Send confirmation
        await this.sendNotification(accountId, 'RENEGOTIATION_REQUEST_SUBMITTED', {
            requestId: requestId,
            planType: planConfig.name,
            estimatedProcessingDays: renegotiationRequest.estimatedProcessingDays
        });

        return {
            success: true,
            message: 'Debt renegotiation request submitted',
            requestId: requestId,
            status: renegotiationRequest.status,
            nextSteps: this.getNextSteps(renegotiationRequest),
            estimatedProcessingDays: renegotiationRequest.estimatedProcessingDays
        };
    }

    // ============= 5. UPLOAD DOCUMENTS =============
    async uploadDocuments(requestId, accountId, documents) {
        const request = this.renegotiationRequests.get(requestId);
        
        if (!request || request.accountId !== accountId) {
            return {
                success: false,
                error: 'Request not found'
            };
        }

        request.documentsSubmitted.push(...documents);
        request.updatedAt = new Date().toISOString();
        
        // Check if all required documents are submitted
        const allDocumentsSubmitted = request.documentsRequired.every(
            doc => request.documentsSubmitted.some(submitted => submitted.includes(doc))
        );
        
        if (allDocumentsSubmitted && request.status === 'pending_review') {
            request.status = 'under_review';
            request.reviewStartedAt = new Date().toISOString();
        }
        
        this.renegotiationRequests.set(requestId, request);
        
        this.addToHistory(accountId, 'DOCUMENTS_UPLOADED', {
            requestId: requestId,
            documents: documents
        });

        return {
            success: true,
            message: 'Documents uploaded successfully',
            allDocumentsSubmitted: allDocumentsSubmitted,
            missingDocuments: request.documentsRequired.filter(
                doc => !request.documentsSubmitted.some(submitted => submitted.includes(doc))
            )
        };
    }

    // ============= 6. APPROVE RENEGOTIATION REQUEST (ADMIN) =============
    async approveRequest(requestId, adminId, approvalData) {
        const request = this.renegotiationRequests.get(requestId);
        
        if (!request) {
            return {
                success: false,
                error: 'Request not found'
            };
        }

        const {
            approvedPlan,
            customTerms,
            notes
        } = approvalData;

        // Calculate new payment terms
        const newTerms = await this.calculateNewTerms(request, approvedPlan || request.requestedPlan, customTerms);
        
        // Create active plan
        const activePlan = {
            id: uuidv4(),
            requestId: requestId,
            loanId: request.loanId,
            accountId: request.accountId,
            userName: request.userName,
            planType: approvedPlan || request.requestedPlan,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + newTerms.termMonths * 30 * 24 * 60 * 60 * 1000).toISOString(),
            originalPayment: request.originalPayment,
            currentPayment: newTerms.monthlyPayment,
            originalRate: request.originalRate,
            currentRate: newTerms.interestRate,
            originalTerm: request.originalTerm,
            currentTerm: newTerms.termMonths,
            paymentsMade: 0,
            totalPayments: newTerms.termMonths,
            status: 'active',
            nextPaymentDate: this.calculateNextPaymentDate(),
            missedPayments: 0,
            concessions: this.calculateConcessions(request, newTerms),
            customTerms: customTerms || null,
            approvedBy: adminId,
            approvedAt: new Date().toISOString(),
            approvalNotes: notes
        };

        // Update request status
        request.status = 'approved';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date().toISOString();
        request.approvalNotes = notes;
        request.approvedTerms = newTerms;
        
        this.renegotiationRequests.set(requestId, request);
        this.activePlans.set(request.accountId, activePlan);
        
        // Update loan in main system
        await this.updateLoanTerms(request.loanId, newTerms);
        
        // Add to history
        this.addToHistory(request.accountId, 'RENEGOTIATION_APPROVED', {
            requestId: requestId,
            newTerms: newTerms,
            approvedBy: adminId
        });
        
        // Send approval notification
        await this.sendNotification(request.accountId, 'RENEGOTIATION_APPROVED', {
            requestId: requestId,
            newPayment: newTerms.monthlyPayment,
            newTerm: newTerms.termMonths,
            nextPaymentDate: activePlan.nextPaymentDate,
            totalSavings: this.calculateTotalSavings(request, newTerms)
        });

        return {
            success: true,
            message: 'Renegotiation request approved',
            activePlan: activePlan,
            newTerms: newTerms,
            nextPaymentDate: activePlan.nextPaymentDate
        };
    }

    // ============= 7. REJECT RENEGOTIATION REQUEST (ADMIN) =============
    async rejectRequest(requestId, adminId, reason, offerAlternative = null) {
        const request = this.renegotiationRequests.get(requestId);
        
        if (!request) {
            return {
                success: false,
                error: 'Request not found'
            };
        }

        if (offerAlternative) {
            request.status = 'negotiation';
            request.counterOffer = offerAlternative;
            request.negotiationHistory.push({
                type: 'counter_offer',
                from: adminId,
                offer: offerAlternative,
                timestamp: new Date().toISOString()
            });
            
            this.renegotiationRequests.set(requestId, request);
            
            await this.sendNotification(request.accountId, 'COUNTER_OFFER_RECEIVED', {
                requestId: requestId,
                counterOffer: offerAlternative,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            });
            
            return {
                success: true,
                message: 'Counter offer sent to customer',
                counterOffer: offerAlternative,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            };
        }

        request.status = 'rejected';
        request.reviewedBy = adminId;
        request.reviewedAt = new Date().toISOString();
        request.rejectionReason = reason;
        
        this.renegotiationRequests.set(requestId, request);
        
        this.addToHistory(request.accountId, 'RENEGOTIATION_REJECTED', {
            requestId: requestId,
            reason: reason,
            rejectedBy: adminId
        });
        
        await this.sendNotification(request.accountId, 'RENEGOTIATION_REJECTED', {
            requestId: requestId,
            reason: reason,
            appealProcess: 'You may submit a new request with additional documentation'
        });

        return {
            success: true,
            message: 'Renegotiation request rejected',
            reason: reason
        };
    }

    // ============= 8. ACCEPT COUNTER OFFER (USER) =============
    async acceptCounterOffer(requestId, accountId) {
        const request = this.renegotiationRequests.get(requestId);
        
        if (!request || request.accountId !== accountId) {
            return {
                success: false,
                error: 'Request not found'
            };
        }

        if (request.status !== 'negotiation' || !request.counterOffer) {
            return {
                success: false,
                error: 'No counter offer available'
            };
        }

        // Approve with counter offer terms
        return await this.approveRequest(requestId, request.counterOffer.approvedBy || 'system', {
            approvedPlan: request.counterOffer.planType,
            customTerms: request.counterOffer.terms,
            notes: 'Counter offer accepted by customer'
        });
    }

    // ============= 9. GET RENEGOTIATION STATUS =============
    async getRenegotiationStatus(accountId) {
        // Check for active plan
        const activePlan = this.activePlans.get(accountId);
        if (activePlan && activePlan.status === 'active') {
            return {
                success: true,
                hasActivePlan: true,
                activePlan: {
                    id: activePlan.id,
                    planType: activePlan.planType,
                    startDate: activePlan.startDate,
                    endDate: activePlan.endDate,
                    originalPayment: activePlan.originalPayment,
                    currentPayment: activePlan.currentPayment,
                    paymentsMade: activePlan.paymentsMade,
                    totalPayments: activePlan.totalPayments,
                    nextPaymentDate: activePlan.nextPaymentDate,
                    missedPayments: activePlan.missedPayments,
                    remainingBalance: await this.calculateRemainingBalance(activePlan)
                }
            };
        }

        // Check for pending request
        const pendingRequest = Array.from(this.renegotiationRequests.values()).find(
            r => r.accountId === accountId && ['pending_review', 'under_review', 'negotiation'].includes(r.status)
        );

        if (pendingRequest) {
            return {
                success: true,
                hasPendingRequest: true,
                request: {
                    id: pendingRequest.id,
                    status: pendingRequest.status,
                    planType: pendingRequest.requestedPlan,
                    submittedAt: pendingRequest.submittedAt,
                    estimatedProcessingDays: pendingRequest.estimatedProcessingDays,
                    missingDocuments: pendingRequest.documentsRequired.filter(
                        doc => !pendingRequest.documentsSubmitted.some(submitted => submitted.includes(doc))
                    ),
                    counterOffer: pendingRequest.counterOffer
                }
            };
        }

        // Check for previous requests
        const history = this.renegotiationHistory.get(accountId) || [];
        const previousRequests = history.filter(h => h.action === 'RENEGOTIATION_APPROVED' || h.action === 'RENEGOTIATION_REJECTED');

        return {
            success: true,
            hasActivePlan: false,
            hasPendingRequest: false,
            previousRequests: previousRequests.slice(-5).map(h => ({
                action: h.action,
                timestamp: h.timestamp,
                details: h.details
            }))
        };
    }

    // ============= 10. MAKE PAYMENT UNDER RENEGOTIATION PLAN =============
    async makePlanPayment(accountId, amount) {
        const activePlan = this.activePlans.get(accountId);
        
        if (!activePlan || activePlan.status !== 'active') {
            return {
                success: false,
                error: 'No active renegotiation plan found'
            };
        }

        if (amount < activePlan.currentPayment) {
            return {
                success: false,
                error: `Minimum payment required: $${activePlan.currentPayment}`,
                partialPaymentAllowed: false,
                minimumPayment: activePlan.currentPayment
            };
        }

        // Process payment
        const paymentResult = await this.processPayment(accountId, amount, activePlan);
        
        if (paymentResult.success) {
            activePlan.paymentsMade++;
            activePlan.lastPaymentDate = new Date().toISOString();
            activePlan.lastPaymentAmount = amount;
            
            // Calculate next payment date
            activePlan.nextPaymentDate = this.calculateNextPaymentDate(activePlan.nextPaymentDate);
            
            // Check if plan is completed
            if (activePlan.paymentsMade >= activePlan.totalPayments) {
                activePlan.status = 'completed';
                activePlan.completedAt = new Date().toISOString();
                
                // Update loan status in main system
                await this.updateLoanStatus(activePlan.loanId, 'paid_in_full');
                
                await this.sendNotification(accountId, 'RENEGOTIATION_PLAN_COMPLETED', {
                    planId: activePlan.id,
                    finalPayment: amount,
                    completionDate: activePlan.completedAt
                });
            }
            
            this.activePlans.set(accountId, activePlan);
            
            this.addToHistory(accountId, 'PLAN_PAYMENT_MADE', {
                amount: amount,
                paymentsMade: activePlan.paymentsMade,
                remainingPayments: activePlan.totalPayments - activePlan.paymentsMade
            });
        }

        return {
            success: paymentResult.success,
            message: paymentResult.message,
            paymentsMade: activePlan.paymentsMade,
            remainingPayments: activePlan.totalPayments - activePlan.paymentsMade,
            nextPaymentDate: activePlan.nextPaymentDate,
            remainingBalance: await this.calculateRemainingBalance(activePlan)
        };
    }

    // ============= 11. REQUEST MODIFICATION TO ACTIVE PLAN =============
    async requestPlanModification(accountId, modificationData) {
        const activePlan = this.activePlans.get(accountId);
        
        if (!activePlan) {
            return {
                success: false,
                error: 'No active renegotiation plan found'
            };
        }

        const { modificationType, reason, proposedChanges } = modificationData;
        
        const modificationRequest = {
            id: uuidv4(),
            planId: activePlan.id,
            accountId: accountId,
            modificationType: modificationType, // payment_reduction, term_extension, temporary_pause
            reason: reason,
            proposedChanges: proposedChanges,
            status: 'pending_review',
            submittedAt: new Date().toISOString()
        };

        // Store modification request
        this.modificationRequests = this.modificationRequests || new Map();
        this.modificationRequests.set(modificationRequest.id, modificationRequest);
        
        await this.sendNotification(accountId, 'PLAN_MODIFICATION_REQUESTED', {
            requestId: modificationRequest.id,
            modificationType: modificationType,
            estimatedProcessingDays: 3
        });

        return {
            success: true,
            message: 'Modification request submitted',
            requestId: modificationRequest.id,
            status: 'pending_review'
        };
    }

    // ============= 12. GET ALL RENEGOTIATION REQUESTS (ADMIN) =============
    async getAllRequests(filters = {}) {
        let requests = Array.from(this.renegotiationRequests.values());
        
        if (filters.status) {
            requests = requests.filter(r => r.status === filters.status);
        }
        
        if (filters.planType) {
            requests = requests.filter(r => r.requestedPlan === filters.planType);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            requests = requests.filter(r => 
                r.userName.toLowerCase().includes(search) ||
                r.email.toLowerCase().includes(search) ||
                r.loanId.toLowerCase().includes(search)
            );
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const startIndex = (page - 1) * limit;
        
        const statusOrder = { pending_review: 0, under_review: 1, negotiation: 2, approved: 3, rejected: 4 };
        requests.sort((a, b) => {
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }
            return new Date(a.submittedAt) - new Date(b.submittedAt);
        });

        return {
            success: true,
            total: requests.length,
            page: page,
            limit: limit,
            requests: requests.slice(startIndex, startIndex + limit),
            summary: {
                pending: requests.filter(r => r.status === 'pending_review').length,
                underReview: requests.filter(r => r.status === 'under_review').length,
                negotiation: requests.filter(r => r.status === 'negotiation').length,
                approved: requests.filter(r => r.status === 'approved').length,
                rejected: requests.filter(r => r.status === 'rejected').length,
                totalOutstandingBalance: requests.reduce((sum, r) => sum + (r.outstandingBalance || 0), 0)
            }
        };
    }

    // ============= 13. GET ACTIVE PLANS (ADMIN) =============
    async getActivePlans(filters = {}) {
        let plans = Array.from(this.activePlans.values());
        
        if (filters.status) {
            plans = plans.filter(p => p.status === filters.status);
        }
        
        if (filters.planType) {
            plans = plans.filter(p => p.planType === filters.planType);
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 20;
        const startIndex = (page - 1) * limit;

        return {
            success: true,
            total: plans.length,
            page: page,
            limit: limit,
            plans: plans.slice(startIndex, startIndex + limit),
            summary: {
                totalActivePlans: plans.filter(p => p.status === 'active').length,
                totalCompletedPlans: plans.filter(p => p.status === 'completed').length,
                totalDefaultedPlans: plans.filter(p => p.status === 'defaulted').length,
                averagePaymentReduction: this.calculateAveragePaymentReduction(plans)
            }
        };
    }

    // ============= 14. GET RENEGOTIATION STATISTICS (ADMIN) =============
    async getRenegotiationStatistics(period = '30d') {
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
        
        const requestsInPeriod = Array.from(this.renegotiationRequests.values()).filter(
            r => new Date(r.submittedAt) >= startDate
        );
        
        const approvedInPeriod = requestsInPeriod.filter(r => r.status === 'approved');
        const rejectedInPeriod = requestsInPeriod.filter(r => r.status === 'rejected');
        
        const totalOutstandingBalance = approvedInPeriod.reduce((sum, r) => sum + (r.outstandingBalance || 0), 0);
        const totalSavings = approvedInPeriod.reduce((sum, r) => {
            const originalTotal = r.originalPayment * r.originalTerm;
            const newTotal = r.approvedTerms?.monthlyPayment * r.approvedTerms?.termMonths || 0;
            return sum + (originalTotal - newTotal);
        }, 0);
        
        const byPlanType = {};
        approvedInPeriod.forEach(r => {
            byPlanType[r.requestedPlan] = (byPlanType[r.requestedPlan] || 0) + 1;
        });
        
        const byHardshipReason = {};
        requestsInPeriod.forEach(r => {
            byHardshipReason[r.hardshipReason] = (byHardshipReason[r.hardshipReason] || 0) + 1;
        });

        return {
            success: true,
            period: period,
            statistics: {
                totalRequests: requestsInPeriod.length,
                approvedCount: approvedInPeriod.length,
                rejectedCount: rejectedInPeriod.length,
                approvalRate: requestsInPeriod.length > 0 ? 
                    (approvedInPeriod.length / requestsInPeriod.length * 100).toFixed(1) : 0,
                averageProcessingDays: this.calculateAverageProcessingDays(approvedInPeriod),
                totalOutstandingBalance: totalOutstandingBalance,
                totalSavings: totalSavings,
                averageSavings: approvedInPeriod.length > 0 ? totalSavings / approvedInPeriod.length : 0,
                byPlanType: byPlanType,
                byHardshipReason: byHardshipReason
            }
        };
    }

    // ============= HELPER FUNCTIONS =============
    
    async calculateNewTerms(request, planType, customTerms) {
        const planConfig = this.paymentPlans[planType];
        const loan = await this.getLoanDetails(request.accountId, request.loanId);
        
        let newTerms = {
            monthlyPayment: request.originalPayment,
            termMonths: request.originalTerm,
            interestRate: request.originalRate
        };
        
        switch (planType) {
            case 'extended_term':
                const extensionMonths = customTerms?.extensionMonths || Math.min(24, Math.floor(request.outstandingBalance / 100));
                newTerms.termMonths = request.originalTerm + extensionMonths;
                newTerms.interestRate = request.originalRate + planConfig.interestRateAdjustment;
                newTerms.monthlyPayment = this.calculateMonthlyPayment(
                    request.outstandingBalance,
                    newTerms.interestRate,
                    newTerms.termMonths
                );
                break;
                
            case 'reduced_payment':
                const reductionPercent = customTerms?.reductionPercent || planConfig.reductionPercentage;
                newTerms.monthlyPayment = request.originalPayment * (1 - reductionPercent / 100);
                newTerms.interestRate = request.originalRate + planConfig.interestRateAdjustment;
                newTerms.termMonths = Math.ceil(
                    this.calculateTermFromPayment(request.outstandingBalance, newTerms.monthlyPayment, newTerms.interestRate)
                );
                break;
                
            case 'payment_holiday':
                const holidayMonths = customTerms?.holidayMonths || planConfig.durationMonths;
                newTerms.holidayMonths = holidayMonths;
                newTerms.monthlyPayment = this.calculatePaymentAfterHoliday(
                    request.outstandingBalance,
                    request.originalRate + planConfig.interestRateAdjustment,
                    request.originalTerm,
                    holidayMonths
                );
                newTerms.termMonths = request.originalTerm + holidayMonths;
                break;
                
            case 'interest_only':
                const interestOnlyMonths = customTerms?.durationMonths || planConfig.durationMonths;
                newTerms.interestOnlyMonths = interestOnlyMonths;
                newTerms.interestOnlyPayment = (request.outstandingBalance * (request.originalRate / 100)) / 12;
                newTerms.monthlyPayment = newTerms.interestOnlyPayment;
                newTerms.termMonths = request.originalTerm;
                break;
                
            case 'lump_settlement':
                const discountPercent = customTerms?.discountPercent || planConfig.discountPercentage;
                newTerms.settlementAmount = request.outstandingBalance * (1 - discountPercent / 100);
                newTerms.discountAmount = request.outstandingBalance - newTerms.settlementAmount;
                newTerms.isSettlement = true;
                break;
                
            case 'graduated_payment':
                newTerms.startPayment = request.originalPayment * (planConfig.startPercentage / 100);
                newTerms.increaseAmount = planConfig.increaseAmount;
                newTerms.increaseFrequency = planConfig.increaseFrequency;
                newTerms.termMonths = planConfig.durationMonths;
                break;
        }
        
        return newTerms;
    }

    calculateMonthlyPayment(principal, annualRate, months) {
        const monthlyRate = annualRate / 100 / 12;
        if (monthlyRate === 0) return principal / months;
        const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
        return Math.round(payment * 100) / 100;
    }

    calculateTermFromPayment(principal, payment, annualRate) {
        const monthlyRate = annualRate / 100 / 12;
        const term = Math.log(payment / (payment - principal * monthlyRate)) / Math.log(1 + monthlyRate);
        return Math.ceil(term);
    }

    calculatePaymentAfterHoliday(principal, rate, originalTerm, holidayMonths) {
        const accruedInterest = principal * (rate / 100) * (holidayMonths / 12);
        const newPrincipal = principal + accruedInterest;
        const remainingTerm = originalTerm;
        return this.calculateMonthlyPayment(newPrincipal, rate, remainingTerm);
    }

    calculateConcessions(request, newTerms) {
        const originalTotal = request.originalPayment * request.originalTerm;
        const newTotal = newTerms.monthlyPayment * (newTerms.termMonths || request.originalTerm);
        
        return {
            monthlyReduction: request.originalPayment - (newTerms.monthlyPayment || request.originalPayment),
            totalSavings: originalTotal - newTotal,
            termExtension: (newTerms.termMonths || request.originalTerm) - request.originalTerm,
            interestRateChange: (newTerms.interestRate || request.originalRate) - request.originalRate
        };
    }

    calculateTotalSavings(request, newTerms) {
        const originalTotal = request.originalPayment * request.originalTerm;
        const newTotal = newTerms.monthlyPayment * (newTerms.termMonths || request.originalTerm);
        return originalTotal - newTotal;
    }

    calculateProcessingDays(outstandingBalance) {
        if (outstandingBalance > 100000) return 10;
        if (outstandingBalance > 50000) return 7;
        return 5;
    }

    calculateNextPaymentDate(currentDate = null) {
        const nextDate = currentDate ? new Date(currentDate) : new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        return nextDate.toISOString();
    }

    calculateAveragePaymentReduction(plans) {
        const reductions = plans.map(p => p.originalPayment - p.currentPayment);
        return reductions.reduce((a, b) => a + b, 0) / reductions.length || 0;
    }

    calculateAverageProcessingDays(approvedRequests) {
        const processingDays = approvedRequests.map(r => {
            const submitted = new Date(r.submittedAt);
            const approved = new Date(r.reviewedAt);
            return (approved - submitted) / (1000 * 60 * 60 * 24);
        });
        return processingDays.reduce((a, b) => a + b, 0) / processingDays.length || 0;
    }

    async calculateRemainingBalance(activePlan) {
        // In production, calculate actual remaining balance
        const paidAmount = activePlan.paymentsMade * activePlan.currentPayment;
        const originalTotal = activePlan.originalPayment * activePlan.originalTerm;
        return Math.max(0, originalTotal - paidAmount);
    }

    getNextSteps(request) {
        const steps = [];
        
        if (request.documentsRequired.length > 0) {
            const missingDocs = request.documentsRequired.filter(
                doc => !request.documentsSubmitted.some(submitted => submitted.includes(doc))
            );
            if (missingDocs.length > 0) {
                steps.push(`Submit required documents: ${missingDocs.join(', ')}`);
            }
        }
        
        steps.push(`Your request is ${request.status.replace('_', ' ')}`);
        steps.push(`Estimated processing time: ${request.estimatedProcessingDays} business days`);
        
        return steps;
    }

    addToHistory(accountId, action, details) {
        let history = this.renegotiationHistory.get(accountId) || [];
        history.push({
            id: uuidv4(),
            action: action,
            details: details,
            timestamp: new Date().toISOString()
        });
        this.renegotiationHistory.set(accountId, history);
    }

    async getLoanDetails(accountId, loanId) {
        // In production, fetch from database
        return {
            loanId: loanId,
            outstandingBalance: 25000,
            monthlyPayment: 850,
            interestRate: 5.9,
            termMonths: 36,
            status: 'active',
            nextPaymentDate: new Date().toISOString()
        };
    }

    async updateLoanTerms(loanId, newTerms) {
        console.log(`Loan ${loanId} terms updated:`, newTerms);
    }

    async updateLoanStatus(loanId, status) {
        console.log(`Loan ${loanId} status updated to: ${status}`);
    }

    async processPayment(accountId, amount, activePlan) {
        // In production, process actual payment
        console.log(`Payment of $${amount} processed for ${accountId}`);
        return { success: true, message: 'Payment processed successfully' };
    }

    async getUserName(accountId) {
        const names = {
            'user_11': 'Robert Johnson',
            'user_12': 'Maria Santos',
            'user_13': 'James Wilson'
        };
        return names[accountId] || 'User';
    }

    async getUserEmail(accountId) {
        const emails = {
            'user_11': 'robert@example.com',
            'user_12': 'maria@example.com',
            'user_13': 'james@example.com'
        };
        return emails[accountId] || 'user@example.com';
    }

    async sendNotification(accountId, type, data) {
        console.log(`📧 Notification to ${accountId}: ${type}`, data);
    }
}

module.exports = new DebtRenegotiationService();
