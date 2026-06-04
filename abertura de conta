// accountOpeningService.js - Complete Account Opening System
// Supports: Personal Account, Corporate Account, Escrow Account, Segregated Account, Multi-currency Account

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class AccountOpeningService {
    constructor() {
        this.accounts = [];
        this.pendingApplications = [];
        this.approvedAccounts = [];
        this.rejectedApplications = [];
    }

    // ============= 1. OPEN PERSONAL ACCOUNT =============
    async openPersonalAccount(userData) {
        const {
            fullName,
            email,
            password,
            documentType, // passport, nationalId, driverLicense
            documentNumber,
            countryOfResidence,
            nationality,
            dateOfBirth,
            phoneNumber,
            address,
            city,
            postalCode,
            taxId,
            occupation,
            sourceOfFunds,
            initialDeposit
        } = userData;

        // Validate required fields
        const missingFields = this.validatePersonalAccount(userData);
        if (missingFields.length > 0) {
            return {
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            };
        }

        // Check if email already exists
        const existingAccount = this.accounts.find(a => a.email === email);
        if (existingAccount) {
            return {
                success: false,
                error: 'Email already registered'
            };
        }

        // Generate account details
        const accountId = uuidv4();
        const accountNumber = this.generateAccountNumber();
        const iban = this.generateIBAN('ZNTX', accountNumber);
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new account
        const newAccount = {
            id: accountId,
            accountNumber: accountNumber,
            iban: iban,
            accountType: 'personal',
            status: 'pending_kyc', // pending_kyc, active, blocked, frozen, closed
            
            // Personal information
            personalInfo: {
                fullName: fullName,
                email: email,
                documentType: documentType,
                documentNumber: documentNumber,
                countryOfResidence: countryOfResidence,
                nationality: nationality,
                dateOfBirth: dateOfBirth,
                phoneNumber: phoneNumber,
                address: address,
                city: city,
                postalCode: postalCode,
                taxId: taxId,
                occupation: occupation,
                sourceOfFunds: sourceOfFunds
            },
            
            // Security
            password: hashedPassword,
            twoFactorEnabled: false,
            loginAttempts: 0,
            
            // Balances (Multi-currency)
            balances: {
                USD: initialDeposit || 0,
                EUR: 0,
                GBP: 0,
                CHF: 0,
                JPY: 0,
                BTC: 0,
                ETH: 0,
                BRADICOIN: 0,
                SOL: 0,
                USDT: 0,
                BNB: 0,
                LTC: 0
            },
            
            // Account limits
            limits: {
                dailyWithdrawal: 50000,
                monthlyTransfer: 250000,
                cardLimit: 10000,
                internationalTransfer: 25000
            },
            
            // KYC Status
            kycStatus: 'pending', // pending, in_review, approved, rejected
            kycSubmittedAt: new Date().toISOString(),
            kycLevel: 1, // 1=Basic, 2=Verified, 3=Premium
            
            // Account metadata
            createdAt: new Date().toISOString(),
            lastLogin: null,
            lastActivity: null,
            
            // Flags
            isCorporate: false,
            isEscrow: false,
            isSegregated: false,
            multiCurrencyEnabled: true
        };

        this.accounts.push(newAccount);
        this.pendingApplications.push(newAccount);

        // Log account creation
        console.log(`✅ New personal account created: ${accountNumber} for ${fullName}`);

        return {
            success: true,
            message: 'Account created successfully. Please complete KYC verification.',
            account: {
                accountNumber: accountNumber,
                iban: iban,
                accountType: 'personal',
                status: newAccount.status,
                kycStatus: newAccount.kycStatus
            }
        };
    }

    // ============= 2. OPEN CORPORATE ACCOUNT (Offshore Company) =============
    async openCorporateAccount(corporateData) {
        const {
            companyName,
            registrationNumber,
            countryOfIncorporation,
            legalStructure, // LLC, LTD, Corp, Foundation
            incorporationDate,
            registeredAddress,
            businessActivity,
            estimatedAnnualVolume,
            sourceOfWealth,
            
            // Directors/Beneficiaries
            directors,
            shareholders,
            ultimateBeneficialOwners,
            
            // Contact
            contactEmail,
            contactPhone,
            website,
            
            // Signatory
            authorizedSignatories,
            
            // Banking needs
            expectedTransactions,
            averageBalance,
            purposeOfAccount,
            
            // Documents
            incorporationCertificate,
            memorandumArticles,
            proofOfAddress,
            directorIds,
            shareholderIds
        } = corporateData;

        // Validate required fields
        const missingFields = this.validateCorporateAccount(corporateData);
        if (missingFields.length > 0) {
            return {
                success: false,
                error: `Missing required fields: ${missingFields.join(', ')}`
            };
        }

        // Check if company already registered
        const existingCompany = this.accounts.find(a => 
            a.corporateInfo && a.corporateInfo.registrationNumber === registrationNumber
        );
        if (existingCompany) {
            return {
                success: false,
                error: 'Company already registered'
            };
        }

        // Generate account details
        const accountId = uuidv4();
        const accountNumber = this.generateAccountNumber();
        const iban = this.generateIBAN('ZNTX', accountNumber);

        // Create corporate account
        const newCorporateAccount = {
            id: accountId,
            accountNumber: accountNumber,
            iban: iban,
            accountType: 'corporate',
            status: 'pending_kyb', // pending_kyb, active, blocked, frozen
            
            // Corporate information
            corporateInfo: {
                companyName: companyName,
                registrationNumber: registrationNumber,
                countryOfIncorporation: countryOfIncorporation,
                legalStructure: legalStructure,
                incorporationDate: incorporationDate,
                registeredAddress: registeredAddress,
                businessActivity: businessActivity,
                estimatedAnnualVolume: estimatedAnnualVolume,
                sourceOfWealth: sourceOfWealth,
                website: website,
                contactEmail: contactEmail,
                contactPhone: contactPhone
            },
            
            // Directors and Beneficiaries
            directors: directors || [],
            shareholders: shareholders || [],
            ultimateBeneficialOwners: ultimateBeneficialOwners || [],
            authorizedSignatories: authorizedSignatories || [],
            
            // Financial profile
            expectedTransactions: expectedTransactions,
            averageBalance: averageBalance,
            purposeOfAccount: purposeOfAccount,
            
            // Balances (Multi-currency)
            balances: {
                USD: 0,
                EUR: 0,
                GBP: 0,
                CHF: 0,
                BTC: 0,
                ETH: 0,
                BRADICOIN: 0,
                USDT: 0
            },
            
            // Corporate limits (higher than personal)
            limits: {
                dailyWithdrawal: 250000,
                monthlyTransfer: 1000000,
                cardLimit: 50000,
                internationalTransfer: 100000
            },
            
            // KYB Status (Know Your Business)
            kybStatus: 'pending', // pending, in_review, approved, rejected
            kybSubmittedAt: new Date().toISOString(),
            complianceLevel: 'standard', // standard, enhanced, high_risk
            
            // Documents submitted
            documents: {
                incorporationCertificate: incorporationCertificate,
                memorandumArticles: memorandumArticles,
                proofOfAddress: proofOfAddress,
                directorIds: directorIds,
                shareholderIds: shareholderIds
            },
            
            // Metadata
            createdAt: new Date().toISOString(),
            lastActivity: null,
            
            // Flags
            isCorporate: true,
            isEscrow: false,
            isSegregated: false,
            multiCurrencyEnabled: true
        };

        this.accounts.push(newCorporateAccount);
        this.pendingApplications.push(newCorporateAccount);

        console.log(`🏢 New corporate account created: ${companyName} - ${accountNumber}`);

        return {
            success: true,
            message: 'Corporate account application submitted. Compliance review in progress.',
            account: {
                accountNumber: accountNumber,
                iban: iban,
                companyName: companyName,
                accountType: 'corporate',
                status: newCorporateAccount.status,
                kybStatus: newCorporateAccount.kybStatus
            }
        };
    }

    // ============= 3. OPEN ESCROW ACCOUNT =============
    async openEscrowAccount(escrowData) {
        const {
            initiatorId, // Account that will fund the escrow
            beneficiaryId, // Account that will receive funds
            amount,
            currency,
            releaseConditions,
            expectedCompletionDate,
            thirdPartyVerification,
            legalAgreement,
            purpose
        } = escrowData;

        // Validate parties exist
        const initiator = this.accounts.find(a => a.id === initiatorId);
        const beneficiary = this.accounts.find(a => a.id === beneficiaryId);

        if (!initiator || !beneficiary) {
            return {
                success: false,
                error: 'Initiator or beneficiary account not found'
            };
        }

        // Check if initiator has sufficient funds
        if (initiator.balances[currency] < amount) {
            return {
                success: false,
                error: 'Insufficient funds for escrow'
            };
        }

        const escrowId = uuidv4();
        const escrowAccountNumber = this.generateAccountNumber();

        // Create escrow account
        const escrowAccount = {
            id: escrowId,
            accountNumber: escrowAccountNumber,
            iban: this.generateIBAN('ESC', escrowAccountNumber),
            accountType: 'escrow',
            status: 'active',
            
            // Escrow details
            escrowInfo: {
                initiatorId: initiatorId,
                initiatorName: initiator.personalInfo?.fullName || initiator.corporateInfo?.companyName,
                beneficiaryId: beneficiaryId,
                beneficiaryName: beneficiary.personalInfo?.fullName || beneficiary.corporateInfo?.companyName,
                amount: amount,
                currency: currency,
                releaseConditions: releaseConditions,
                expectedCompletionDate: expectedCompletionDate,
                thirdPartyVerification: thirdPartyVerification || false,
                legalAgreement: legalAgreement,
                purpose: purpose,
                currentStatus: 'funded' // funded, pending_release, completed, disputed, cancelled
            },
            
            // Balances
            balances: {
                [currency]: amount
            },
            
            // Transaction history
            escrowTransactions: [],
            
            // Metadata
            createdAt: new Date().toISOString(),
            completedAt: null,
            cancelledAt: null,
            
            // Flags
            isCorporate: false,
            isEscrow: true,
            isSegregated: false
        };

        // Deduct funds from initiator
        initiator.balances[currency] -= amount;

        this.accounts.push(escrowAccount);

        console.log(`🔒 Escrow account created: ${escrowAccountNumber} - Amount: ${amount} ${currency}`);

        return {
            success: true,
            message: 'Escrow account created successfully',
            escrowAccount: {
                accountNumber: escrowAccountNumber,
                amount: amount,
                currency: currency,
                releaseConditions: releaseConditions
            }
        };
    }

    // ============= 4. OPEN SEGREGATED ACCOUNT =============
    async openSegregatedAccount(segregatedData) {
        const {
            parentAccountId,
            clientName,
            clientReference,
            purpose,
            initialDeposit,
            currency,
            managementFee,
            withdrawalRestrictions
        } = segregatedData;

        // Find parent account
        const parentAccount = this.accounts.find(a => a.id === parentAccountId);
        if (!parentAccount) {
            return {
                success: false,
                error: 'Parent account not found'
            };
        }

        const segregatedId = uuidv4();
        const segregatedAccountNumber = this.generateAccountNumber();

        // Create segregated sub-account
        const segregatedAccount = {
            id: segregatedId,
            accountNumber: segregatedAccountNumber,
            iban: this.generateIBAN('SEG', segregatedAccountNumber),
            accountType: 'segregated',
            parentAccountId: parentAccountId,
            status: 'active',
            
            // Client information
            clientInfo: {
                clientName: clientName,
                clientReference: clientReference,
                purpose: purpose
            },
            
            // Balances
            balances: {
                [currency]: initialDeposit || 0
            },
            
            // Restrictions
            restrictions: {
                managementFee: managementFee || 0,
                withdrawalRestrictions: withdrawalRestrictions || [],
                canWithdraw: true,
                canDeposit: true
            },
            
            // Transaction history
            transactions: [],
            
            // Metadata
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            
            // Flags
            isCorporate: false,
            isEscrow: false,
            isSegregated: true
        };

        // Transfer initial deposit from parent account
        if (initialDeposit > 0) {
            if (parentAccount.balances[currency] >= initialDeposit) {
                parentAccount.balances[currency] -= initialDeposit;
                segregatedAccount.balances[currency] += initialDeposit;
            } else {
                return {
                    success: false,
                    error: 'Insufficient funds in parent account for initial deposit'
                };
            }
        }

        this.accounts.push(segregatedAccount);

        console.log(`📁 Segregated account created: ${segregatedAccountNumber} for ${clientName}`);

        return {
            success: true,
            message: 'Segregated account created successfully',
            segregatedAccount: {
                accountNumber: segregatedAccountNumber,
                clientName: clientName,
                balance: initialDeposit,
                currency: currency
            }
        };
    }

    // ============= 5. OPEN MULTI-CURRENCY ACCOUNT =============
    async openMultiCurrencyAccount(userId, baseCurrency = 'USD') {
        const user = this.accounts.find(a => a.id === userId);
        if (!user) {
            return {
                success: false,
                error: 'User not found'
            };
        }

        // Enable multi-currency if not already enabled
        if (!user.multiCurrencyEnabled) {
            user.multiCurrencyEnabled = true;
            
            // Initialize all currency balances to 0 if not exist
            const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'BRL'];
            currencies.forEach(currency => {
                if (user.balances[currency] === undefined) {
                    user.balances[currency] = 0;
                }
            });
        }

        // Get current exchange rates (simulated)
        const exchangeRates = await this.getExchangeRates();

        return {
            success: true,
            message: 'Multi-currency account activated',
            currencies: Object.keys(user.balances),
            exchangeRates: exchangeRates,
            balances: user.balances
        };
    }

    // ============= HELPER FUNCTIONS =============

    validatePersonalAccount(data) {
        const required = ['fullName', 'email', 'password', 'documentNumber', 'countryOfResidence'];
        return required.filter(field => !data[field]);
    }

    validateCorporateAccount(data) {
        const required = ['companyName', 'registrationNumber', 'countryOfIncorporation', 'contactEmail'];
        return required.filter(field => !data[field]);
    }

    generateAccountNumber() {
        const prefix = 'ZNTX';
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        return `${prefix}${timestamp}${random}`;
    }

    generateIBAN(bankCode, accountNumber) {
        const countryCode = 'XX';
        const checksum = this.calculateChecksum(accountNumber);
        return `${bankCode}${countryCode}${checksum}${accountNumber.slice(-20)}`;
    }

    calculateChecksum(accountNumber) {
        let sum = 0;
        for (let i = 0; i < accountNumber.length; i++) {
            sum += accountNumber.charCodeAt(i);
        }
        return (sum % 99).toString().padStart(2, '0');
    }

    async getExchangeRates() {
        // In production, call a real API like OpenExchangeRates, Fixer.io, etc.
        return {
            USD_EUR: 0.92,
            USD_GBP: 0.79,
            USD_CHF: 0.85,
            USD_JPY: 148.50,
            USD_CAD: 1.35,
            USD_AUD: 1.52,
            USD_BRL: 5.05,
            EUR_USD: 1.09,
            GBP_USD: 1.27
        };
    }

    // ============= ACCOUNT MANAGEMENT =============

    async getAccountByNumber(accountNumber) {
        return this.accounts.find(a => a.accountNumber === accountNumber);
    }

    async getAccountByEmail(email) {
        return this.accounts.find(a => a.email === email);
    }

    async getAllPendingApplications() {
        return this.pendingApplications.filter(a => a.status === 'pending_kyc' || a.status === 'pending_kyb');
    }

    async approveAccount(accountId, approvedBy, notes) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) {
            return { success: false, error: 'Account not found' };
        }

        account.status = 'active';
        account.approvedBy = approvedBy;
        account.approvedAt = new Date().toISOString();
        account.approvalNotes = notes;
        
        if (account.accountType === 'personal') {
            account.kycStatus = 'approved';
        } else if (account.accountType === 'corporate') {
            account.kybStatus = 'approved';
        }

        // Remove from pending
        this.pendingApplications = this.pendingApplications.filter(a => a.id !== accountId);
        this.approvedAccounts.push(account);

        console.log(`✅ Account approved: ${account.accountNumber} by ${approvedBy}`);

        return {
            success: true,
            message: 'Account approved successfully',
            account: {
                accountNumber: account.accountNumber,
                status: account.status
            }
        };
    }

    async rejectAccount(accountId, rejectedBy, reason) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) {
            return { success: false, error: 'Account not found' };
        }

        account.status = 'rejected';
        account.rejectedBy = rejectedBy;
        account.rejectedAt = new Date().toISOString();
        account.rejectionReason = reason;

        // Remove from pending
        this.pendingApplications = this.pendingApplications.filter(a => a.id !== accountId);
        this.rejectedApplications.push(account);

        console.log(`❌ Account rejected: ${account.accountNumber} - Reason: ${reason}`);

        return {
            success: true,
            message: 'Account rejected',
            reason: reason
        };
    }

    async freezeAccount(accountId, frozenBy, reason) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) {
            return { success: false, error: 'Account not found' };
        }

        account.status = 'frozen';
        account.frozenBy = frozenBy;
        account.frozenAt = new Date().toISOString();
        account.freezeReason = reason;

        return {
            success: true,
            message: 'Account frozen successfully'
        };
    }

    async closeAccount(accountId, closedBy, reason) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) {
            return { success: false, error: 'Account not found' };
        }

        account.status = 'closed';
        account.closedBy = closedBy;
        account.closedAt = new Date().toISOString();
        account.closureReason = reason;

        // Transfer remaining balance if any
        if (account.balances.USD > 0) {
            console.log(`💰 Processing final balance transfer for ${account.accountNumber}: $${account.balances.USD}`);
        }

        return {
            success: true,
            message: 'Account closed successfully',
            finalBalance: account.balances.USD
        };
    }
}

module.exports = new AccountOpeningService();
