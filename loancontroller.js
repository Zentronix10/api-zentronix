// loanController.js - Zentronix Bank Loan System
// Real-world loan management with Pix integration and Multi-Currency Support

const db = require('./database');
const logger = require('./logger');
const { criarCobrancaPix, consultarStatusPix } = require('./pix-integration');
const { v4: uuidv4 } = require('uuid');

// ============ LOAN CONFIGURATIONS ============
const LOAN_CONFIG = {
    BRL: {
        name: 'Brazilian Real',
        symbol: 'R$',
        maxAmount: 900000000000000, // 900 Trillion Reais
        minAmount: 100,
        interestRate: 0.0199, // 1.99% per month
        annualRate: 0.2388,   // 23.88% per year (Brazilian SELIC + spread)
        minTerm: 3,
        maxTerm: 240,
        earlyPaymentDiscount: 0.03, // 3% discount for early payment
        lateFee: 0.02, // 2% late fee
        insuranceFee: 0.0005, // 0.05% insurance fee
        openingFee: 0.005, // 0.5% opening fee
        currency: 'BRL',
        country: 'Brazil'
    },
    USD: {
        name: 'US Dollar',
        symbol: '$',
        maxAmount: 900000000000000, // 900 Trillion Dollars
        minAmount: 1000,
        interestRate: 0.015, // 1.5% per month
        annualRate: 0.18,    // 18% per year
        minTerm: 6,
        maxTerm: 360,
        earlyPaymentDiscount: 0.02,
        lateFee: 0.05,
        insuranceFee: 0.001,
        openingFee: 0.01,
        currency: 'USD',
        country: 'United States'
    },
    EUR: {
        name: 'Euro',
        symbol: '€',
        maxAmount: 900000000000000,
        minAmount: 1000,
        interestRate: 0.012, // 1.2% per month
        annualRate: 0.144,   // 14.4% per year
        minTerm: 6,
        maxTerm: 360,
        earlyPaymentDiscount: 0.02,
        lateFee: 0.05,
        insuranceFee: 0.001,
        openingFee: 0.01,
        currency: 'EUR',
        country: 'European Union'
    },
    GBP: {
        name: 'British Pound',
        symbol: '£',
        maxAmount: 900000000000000,
        minAmount: 1000,
        interestRate: 0.013, // 1.3% per month
        annualRate: 0.156,   // 15.6% per year
        minTerm: 6,
        maxTerm: 360,
        earlyPaymentDiscount: 0.02,
        lateFee: 0.05,
        insuranceFee: 0.001,
        openingFee: 0.01,
        currency: 'GBP',
        country: 'United Kingdom'
    }
};

// In-memory loan storage (replace with database in production)
let loans = [];
let nextLoanId = 1;
let nextPaymentId = 1;

// ============ REAL BANKING CALCULATION FUNCTIONS ============

/**
 * Calculate CET (Total Effective Cost)
 */
const calculateCET = (amount, rate, months, openingFee, insuranceFee) => {
    const totalInterest = amount * rate * months;
    const totalOpeningFee = amount * openingFee;
    const totalInsurance = amount * insuranceFee * months;
    const cet = (totalInterest + totalOpeningFee + totalInsurance) / amount * 100;
    return parseFloat(cet.toFixed(2));
};

/**
 * Calculate monthly payment using Price amortization system
 */
const calculateMonthlyPayment = (amount, monthlyRate, months) => {
    if (monthlyRate === 0) return amount / months;
    const payment = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return payment;
};

/**
 * Generate complete amortization table
 */
const generateAmortizationTable = (amount, monthlyRate, months) => {
    const monthlyPayment = calculateMonthlyPayment(amount, monthlyRate, months);
    let balance = amount;
    let table = [];
    let totalInterest = 0;
    
    for (let i = 1; i <= months; i++) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance -= principal;
        totalInterest += interest;
        
        table.push({
            month: i,
            payment: monthlyPayment,
            interest: interest,
            principal: principal,
            balance: Math.max(0, balance)
        });
    }
    
    return {
        table,
        totalPayment: monthlyPayment * months,
        totalInterest: totalInterest,
        monthlyPayment: monthlyPayment
    };
};

/**
 * Calculate late payment fees
 */
const calculateLateFee = (paymentAmount, daysLate, lateFeeRate) => {
    const lateFee = paymentAmount * lateFeeRate;
    const dailyInterest = paymentAmount * 0.00033; // 0.033% per day
    const dailyLateFee = dailyInterest * daysLate;
    return {
        lateFee: lateFee,
        dailyFee: dailyLateFee,
        total: lateFee + dailyLateFee
    };
};

/**
 * Calculate early payment discount
 */
const calculateEarlyPaymentDiscount = (remainingBalance, earlyPaymentDiscountRate) => {
    const discount = remainingBalance * earlyPaymentDiscountRate;
    return {
        discount: discount,
        finalAmount: remainingBalance - discount
    };
};

/**
 * Calculate credit score based on user history
 */
const calculateCreditScore = (user) => {
    let score = 700; // Base score
    
    // Adjust based on account age
    const accountAgeMonths = user.accountAge || 0;
    score += Math.min(accountAgeMonths * 2, 100);
    
    // Adjust based on payment history
    if (user.paymentHistory) {
        const onTimePayments = user.paymentHistory.filter(p => p.onTime).length;
        score += Math.min(onTimePayments * 5, 150);
        
        const latePayments = user.paymentHistory.filter(p => !p.onTime).length;
        score -= latePayments * 25;
    }
    
    // Adjust based on account balance
    const accountBalance = user.balance || 0;
    score += Math.min(accountBalance / 10000, 100);
    
    // Adjust based on income
    if (user.monthlyIncome) {
        score += Math.min(user.monthlyIncome / 5000, 50);
    }
    
    return Math.max(300, Math.min(score, 850));
};

/**
 * Calculate maximum loan amount based on credit score and currency
 */
const calculateMaxLoanByCreditScore = (creditScore, requestedCurrency, monthlyIncome) => {
    const baseMax = LOAN_CONFIG[requestedCurrency].maxAmount;
    let multiplier = 1;
    
    if (creditScore >= 800) multiplier = 1;
    else if (creditScore >= 750) multiplier = 0.8;
    else if (creditScore >= 700) multiplier = 0.6;
    else if (creditScore >= 650) multiplier = 0.4;
    else if (creditScore >= 600) multiplier = 0.2;
    else multiplier = 0.1;
    
    // Income-based limit (max 30x monthly income)
    const incomeLimit = monthlyIncome * 30;
    
    return Math.min(baseMax * multiplier, incomeLimit);
};

// ============ MAIN LOAN FUNCTIONS ============

/**
 * Request a new loan
 * POST /api/loans/request
 */
const requestLoan = async (req, res) => {
    try {
        const { 
            amount, 
            currency = 'USD', 
            termMonths = 12,
            purpose = 'Investment'
        } = req.body;
        
        const accountId = req.accountId;
        
        // Validate account exists
        const account = await db.findAccountById(accountId);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }
        
        // Validate currency
        if (!LOAN_CONFIG[currency]) {
            return res.status(400).json({ 
                error: 'Invalid currency', 
                availableCurrencies: ['BRL', 'USD', 'EUR', 'GBP']
            });
        }
        
        const config = LOAN_CONFIG[currency];
        
        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid loan amount' });
        }
        
        if (amount < config.minAmount) {
            return res.status(400).json({ 
                error: `Minimum amount for ${currency} is ${config.symbol}${config.minAmount.toLocaleString()}`
            });
        }
        
        // Calculate credit score and max allowed
        const creditScore = calculateCreditScore(account);
        const monthlyIncome = account.monthlyIncome || 10000;
        const maxAllowed = calculateMaxLoanByCreditScore(creditScore, currency, monthlyIncome);
        
        if (amount > maxAllowed) {
            return res.status(400).json({ 
                error: `Maximum allowed based on your credit score (${creditScore}) is ${config.symbol}${maxAllowed.toLocaleString()}`,
                creditScore: creditScore,
                maxAllowed: maxAllowed,
                monthlyIncome: monthlyIncome
            });
        }
        
        if (amount > config.maxAmount) {
            return res.status(400).json({ 
                error: `Maximum amount for ${currency} is ${config.symbol}${config.maxAmount.toLocaleString()}`
            });
        }
        
        // Validate term
        if (termMonths < config.minTerm || termMonths > config.maxTerm) {
            return res.status(400).json({ 
                error: `Term must be between ${config.minTerm} and ${config.maxTerm} months for ${currency}`
            });
        }
        
        // Check existing loans
        const activeLoans = loans.filter(l => l.accountId === accountId && l.status === 'ACTIVE');
        if (activeLoans.length >= 3) {
            return res.status(400).json({ 
                error: 'Maximum 3 active loans allowed per customer'
            });
        }
        
        // Calculate loan values
        const monthlyRate = config.interestRate;
        const amortization = generateAmortizationTable(amount, monthlyRate, termMonths);
        const totalInterest = amortization.totalInterest;
        const monthlyPayment = amortization.monthlyPayment;
        const totalAmount = amount + totalInterest;
        const openingFeeValue = amount * config.openingFee;
        const insuranceTotal = amount * config.insuranceFee * termMonths;
        const cet = calculateCET(amount, config.interestRate, termMonths, config.openingFee, config.insuranceFee);
        
        // Check payment affordability (monthly payment should be <= 30% of monthly income)
        const maxAffordablePayment = monthlyIncome * 0.3;
        if (monthlyPayment > maxAffordablePayment) {
            return res.status(400).json({
                error: `Monthly payment (${config.symbol}${monthlyPayment.toFixed(2)}) exceeds 30% of your monthly income (${config.symbol}${monthlyIncome.toFixed(2)})`,
                maxAllowedPayment: maxAffordablePayment,
                requestedPayment: monthlyPayment
            });
        }
        
        // Create loan record
        const newLoan = {
            id: nextLoanId++,
            loanId: `LOAN-${Date.now()}-${nextLoanId}`,
            accountId: accountId,
            accountNumber: account.accountNumber,
            customerName: account.name,
            amount: amount,
            currency: currency,
            termMonths: termMonths,
            interestRate: config.interestRate,
            monthlyPayment: monthlyPayment,
            totalInterest: totalInterest,
            totalAmount: totalAmount,
            openingFee: openingFeeValue,
            insuranceFee: insuranceTotal,
            cet: cet,
            purpose: purpose,
            status: 'PENDING',
            creditScore: creditScore,
            monthlyIncome: monthlyIncome,
            requestedAt: new Date(),
            approvedAt: null,
            nextPaymentDate: null,
            paidMonths: 0,
            remainingBalance: totalAmount,
            paidAmount: 0,
            latePayments: 0,
            paymentHistory: []
        };
        
        loans.push(newLoan);
        
        // Save to database
        if (db.saveLoan) {
            await db.saveLoan(newLoan);
        }
        
        logger.info(`Loan requested: ${currency} ${amount.toLocaleString()}`, {
            account: account.accountNumber,
            amount: amount,
            currency: currency,
            creditScore: creditScore
        });
        
        res.status(201).json({
            success: true,
            message: `Loan request of ${config.symbol}${amount.toLocaleString()} ${currency} received`,
            loan: {
                id: newLoan.loanId,
                requestedAmount: newLoan.amount,
                currency: newLoan.currency,
                termMonths: newLoan.termMonths,
                monthlyInterestRate: `${(newLoan.interestRate * 100).toFixed(2)}%`,
                monthlyPayment: newLoan.monthlyPayment,
                totalInterest: newLoan.totalInterest,
                totalAmount: newLoan.totalAmount,
                openingFee: newLoan.openingFee,
                insurance: newLoan.insuranceFee,
                cet: `${newLoan.cet.toFixed(2)}%`,
                status: newLoan.status,
                creditScore: newLoan.creditScore,
                requestedAt: newLoan.requestedAt
            }
        });
        
    } catch (error) {
        logger.error('Error requesting loan', error);
        res.status(500).json({ error: 'Error processing loan request' });
    }
};

/**
 * Approve a loan and disburse funds
 * POST /api/loans/:loanId/approve
 */
const approveLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const accountId = req.accountId;
        
        const loan = loans.find(l => l.loanId === loanId);
        
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        
        if (loan.accountId !== accountId) {
            return res.status(403).json({ error: 'This loan does not belong to your account' });
        }
        
        if (loan.status !== 'PENDING') {
            return res.status(400).json({ error: `Loan is already ${loan.status}` });
        }
        
        // Approve loan
        loan.status = 'ACTIVE';
        loan.approvedAt = new Date();
        loan.nextPaymentDate = new Date();
        loan.nextPaymentDate.setMonth(loan.nextPaymentDate.getMonth() + 1);
        
        // Calculate net amount after fees
        const netAmount = loan.amount - loan.openingFee;
        
        // Credit to account
        const account = await db.findAccountById(accountId);
        const previousBalance = account.balance;
        account.balance += netAmount;
        
        if (db.updateAccount) {
            await db.updateAccount(accountId, { balance: account.balance });
        }
        
        // Record transaction
        const transaction = {
            transactionId: `TXN-${Date.now()}`,
            accountId: accountId,
            type: 'LOAN_DISBURSEMENT',
            amount: netAmount,
            description: `Loan of ${loan.currency} ${loan.amount.toLocaleString()} approved and disbursed`,
            previousBalance: previousBalance,
            newBalance: account.balance,
            loanId: loan.loanId,
            timestamp: new Date()
        };
        
        if (db.saveTransaction) {
            await db.saveTransaction(transaction);
        }
        
        const config = LOAN_CONFIG[loan.currency];
        
        res.json({
            success: true,
            message: `✅ LOAN APPROVED AND DISBURSED!`,
            details: {
                grossAmount: `${config.symbol}${loan.amount.toLocaleString()}`,
                openingFee: `${config.symbol}${loan.openingFee.toLocaleString()}`,
                netAmount: `${config.symbol}${netAmount.toLocaleString()}`,
                monthlyPayment: `${config.symbol}${loan.monthlyPayment.toFixed(2)}`,
                firstPaymentDue: loan.nextPaymentDate.toLocaleDateString(),
                totalInstallments: loan.termMonths,
                newBalance: account.balance
            }
        });
        
    } catch (error) {
        logger.error('Error approving loan', error);
        res.status(500).json({ error: 'Error approving loan' });
    }
};

/**
 * Pay loan installment via Pix (for BRL loans)
 * POST /api/loans/:loanId/pay-with-pix
 */
const payInstallmentWithPix = async (req, res) => {
    try {
        const { loanId } = req.params;
        const accountId = req.accountId;
        
        const loan = loans.find(l => l.loanId === loanId);
        
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        
        if (loan.accountId !== accountId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (loan.status !== 'ACTIVE') {
            return res.status(400).json({ error: `Loan is ${loan.status}` });
        }
        
        // Check if payment method is available for this currency
        if (loan.currency !== 'BRL') {
            return res.status(400).json({ 
                error: 'Pix payment is only available for BRL loans',
                alternative: 'Use /pay endpoint for balance payment'
            });
        }
        
        let paymentAmount = loan.monthlyPayment;
        let lateFee = 0;
        
        // Check for late payment
        const today = new Date();
        const dueDate = new Date(loan.nextPaymentDate);
        
        if (today > dueDate) {
            const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            const config = LOAN_CONFIG[loan.currency];
            const lateCalculation = calculateLateFee(loan.monthlyPayment, daysLate, config.lateFee);
            lateFee = lateCalculation.total;
            paymentAmount += lateFee;
            loan.latePayments++;
        }
        
        // Generate Pix charge for payment
        const pixCharge = await criarCobrancaPix({
            customerId: accountId,
            value: paymentAmount,
            description: `Loan payment - Installment ${loan.paidMonths + 1}/${loan.termMonths} - Loan ${loan.loanId}`
        });
        
        if (!pixCharge.success) {
            return res.status(500).json({ error: 'Error generating Pix charge' });
        }
        
        // Store pending payment
        const pendingPayment = {
            paymentId: uuidv4(),
            loanId: loan.loanId,
            amount: paymentAmount,
            lateFee: lateFee,
            installmentNumber: loan.paidMonths + 1,
            pixCharge: pixCharge,
            status: 'PENDING',
            createdAt: new Date()
        };
        
        if (db.savePendingPayment) {
            await db.savePendingPayment(pendingPayment);
        }
        
        res.json({
            success: true,
            message: 'Pix charge generated for loan payment',
            payment: {
                loanId: loan.loanId,
                installmentNumber: loan.paidMonths + 1,
                totalInstallments: loan.termMonths,
                paymentAmount: paymentAmount,
                lateFee: lateFee,
                regularAmount: loan.monthlyPayment,
                pix: {
                    qrCode: pixCharge.payload,
                    qrCodeImage: pixCharge.qrCodeImage,
                    expiresAt: pixCharge.expiresAt
                },
                status: 'AWAITING_PAYMENT'
            }
        });
        
    } catch (error) {
        logger.error('Error generating Pix for loan payment', error);
        res.status(500).json({ error: 'Error generating payment' });
    }
};

/**
 * Confirm loan payment (webhook from Pix)
 * POST /api/loans/webhook/payment-confirmed
 */
const confirmLoanPayment = async (req, res) => {
    try {
        const { paymentId, txid, status } = req.body;
        
        if (status !== 'PAID') {
            return res.status(200).json({ received: true });
        }
        
        // Find pending payment
        const pendingPayment = await db.findPendingPayment(paymentId);
        if (!pendingPayment) {
            return res.status(404).json({ error: 'Payment not found' });
        }
        
        const loan = loans.find(l => l.loanId === pendingPayment.loanId);
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        
        // Process payment
        loan.paidMonths++;
        loan.paidAmount += pendingPayment.amount;
        loan.remainingBalance -= loan.monthlyPayment;
        
        // Update next payment date
        loan.nextPaymentDate.setMonth(loan.nextPaymentDate.getMonth() + 1);
        
        // Record payment in history
        loan.paymentHistory.push({
            id: nextPaymentId++,
            date: new Date(),
            amount: pendingPayment.amount,
            lateFee: pendingPayment.lateFee,
            month: loan.paidMonths,
            remainingBalance: loan.remainingBalance,
            txid: txid
        });
        
        // Check if loan is fully paid
        if (loan.paidMonths >= loan.termMonths || loan.remainingBalance <= 0) {
            loan.status = 'PAID';
            loan.completedAt = new Date();
        }
        
        // Update pending payment status
        pendingPayment.status = 'CONFIRMED';
        pendingPayment.confirmedAt = new Date();
        pendingPayment.txid = txid;
        
        await db.updatePendingPayment(pendingPayment);
        await db.updateLoan(loan);
        
        logger.info(`Loan payment confirmed: ${loan.loanId} - Installment ${loan.paidMonths}`);
        
        res.status(200).json({ received: true, processed: true });
        
    } catch (error) {
        logger.error('Error confirming loan payment', error);
        res.status(500).json({ error: 'Error processing confirmation' });
    }
};

/**
 * Pay installment directly from account balance
 * POST /api/loans/:loanId/pay
 */
const payInstallment = async (req, res) => {
    try {
        const { loanId } = req.params;
        const accountId = req.accountId;
        
        const loan = loans.find(l => l.loanId === loanId);
        
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        
        if (loan.accountId !== accountId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (loan.status !== 'ACTIVE') {
            return res.status(400).json({ error: `Loan is ${loan.status}` });
        }
        
        const account = await db.findAccountById(accountId);
        let paymentAmount = loan.monthlyPayment;
        let lateFee = 0;
        
        // Check for late payment
        const today = new Date();
        const dueDate = new Date(loan.nextPaymentDate);
        
        if (today > dueDate) {
            const daysLate = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
            const config = LOAN_CONFIG[loan.currency];
            const lateCalculation = calculateLateFee(loan.monthlyPayment, daysLate, config.lateFee);
            lateFee = lateCalculation.total;
            paymentAmount += lateFee;
            loan.latePayments++;
        }
        
        if (account.balance < paymentAmount) {
            return res.status(400).json({ 
                error: 'Insufficient balance',
                installmentAmount: loan.monthlyPayment,
                lateFee: lateFee,
                totalDue: paymentAmount,
                currentBalance: account.balance
            });
        }
        
        // Process payment
        const previousBalance = account.balance;
        account.balance -= paymentAmount;
        loan.paidMonths++;
        loan.paidAmount += paymentAmount;
        loan.remainingBalance -= loan.monthlyPayment;
        
        // Update next payment date
        loan.nextPaymentDate.setMonth(loan.nextPaymentDate.getMonth() + 1);
        
        // Record payment
        loan.paymentHistory.push({
            id: nextPaymentId++,
            date: new Date(),
            amount: paymentAmount,
            lateFee: lateFee,
            month: loan.paidMonths,
            remainingBalance: loan.remainingBalance
        });
        
        // Check if loan is fully paid
        if (loan.paidMonths >= loan.termMonths || loan.remainingBalance <= 0) {
            loan.status = 'PAID';
            loan.completedAt = new Date();
        }
        
        await db.updateAccount(accountId, { balance: account.balance });
        
        // Record transaction
        const transaction = {
            transactionId: `TXN-${Date.now()}`,
            accountId: accountId,
            type: 'LOAN_PAYMENT',
            amount: paymentAmount,
            description: `Loan payment - Installment ${loan.paidMonths}/${loan.termMonths}`,
            previousBalance: previousBalance,
            newBalance: account.balance,
            loanId: loan.loanId,
            timestamp: new Date()
        };
        
        await db.saveTransaction(transaction);
        
        const config = LOAN_CONFIG[loan.currency];
        
        res.json({
            success: true,
            message: `Installment ${loan.paidMonths}/${loan.termMonths} paid!`,
            installment: {
                number: loan.paidMonths,
                amount: `${config.symbol}${loan.monthlyPayment.toFixed(2)}`,
                lateFee: `${config.symbol}${lateFee.toFixed(2)}`,
                totalPaid: `${config.symbol}${paymentAmount.toFixed(2)}`,
                remainingInstallments: loan.termMonths - loan.paidMonths,
                remainingBalance: `${config.symbol}${loan.remainingBalance.toFixed(2)}`,
                loanStatus: loan.status,
                newBalance: account.balance
            }
        });
        
    } catch (error) {
        logger.error('Error paying installment', error);
        res.status(500).json({ error: 'Error processing payment' });
    }
};

/**
 * Get user's loans
 * GET /api/loans/my-loans
 */
const getMyLoans = async (req, res) => {
    try {
        const accountId = req.accountId;
        const myLoans = loans.filter(l => l.accountId === accountId);
        
        if (myLoans.length === 0) {
            return res.json({
                message: 'You have no loans',
                loans: []
            });
        }
        
        const formattedLoans = myLoans.map(loan => {
            const config = LOAN_CONFIG[loan.currency];
            return {
                id: loan.loanId,
                amount: `${config.symbol}${loan.amount.toLocaleString()}`,
                currency: loan.currency,
                symbol: config.symbol,
                termMonths: loan.termMonths,
                paidInstallments: loan.paidMonths,
                remainingInstallments: loan.termMonths - loan.paidMonths,
                monthlyPayment: `${config.symbol}${loan.monthlyPayment.toFixed(2)}`,
                remainingBalance: `${config.symbol}${loan.remainingBalance.toFixed(2)}`,
                status: loan.status,
                requestedAt: loan.requestedAt,
                nextPaymentDue: loan.nextPaymentDate,
                creditScore: loan.creditScore
            };
        });
        
        res.json({
            total: myLoans.length,
            loans: formattedLoans
        });
        
    } catch (error) {
        logger.error('Error fetching loans', error);
        res.status(500).json({ error: 'Error fetching loans' });
    }
};

/**
 * Get loan details
 * GET /api/loans/:loanId
 */
const getLoanDetails = async (req, res) => {
    try {
        const { loanId } = req.params;
        const accountId = req.accountId;
        
        const loan = loans.find(l => l.loanId === loanId);
        
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        
        if (loan.accountId !== accountId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const config = LOAN_CONFIG[loan.currency];
        
        res.json({
            loan: {
                id: loan.loanId,
                amount: `${config.symbol}${loan.amount.toLocaleString()}`,
                currency: loan.currency,
                symbol: config.symbol,
                termMonths: loan.termMonths,
                interestRate: `${(loan.interestRate * 100).toFixed(2)}%`,
                monthlyPayment: `${config.symbol}${loan.monthlyPayment.toFixed(2)}`,
                totalInterest: `${config.symbol}${loan.totalInterest.toFixed(2)}`,
                totalAmount: `${config.symbol}${loan.totalAmount.toFixed(2)}`,
                openingFee: `${config.symbol}${loan.openingFee.toFixed(2)}`,
                insuranceFee: `${config.symbol}${loan.insuranceFee.toFixed(2)}`,
                cet: `${loan.cet.toFixed(2)}%`,
                purpose: loan.purpose,
                status: loan.status,
                creditScore: loan.creditScore,
                requestedAt: loan.requestedAt,
                approvedAt: loan.approvedAt,
                nextPaymentDue: loan.nextPaymentDate,
                paidMonths: loan.paidMonths,
                remainingBalance: `${config.symbol}${loan.remainingBalance.toFixed(2)}`,
                paymentHistory: loan.paymentHistory.map(p => ({
                    date: p.date,
                    installment: p.month,
                    amount: `${config.symbol}${p.amount.toFixed(2)}`,
                    lateFee: `${config.symbol}${p.lateFee.toFixed(2)}`,
                    remainingBalance: `${config.symbol}${p.remainingBalance.toFixed(2)}`
                }))
            }
        });
        
    } catch (error) {
        logger.error('Error fetching loan details', error);
        res.status(500).json({ error: 'Error fetching loan details' });
    }
};

/**
 * Early loan payoff
 * POST /api/loans/:loanId/early-payoff
 */
const earlyPayoffLoan = async (req, res) => {
    try {
        const { loanId } = req.params;
        const accountId = req.accountId;
        
        const loan = loans.find(l => l.loanId === loanId);
        
        if (!loan) {
            return res.status(404).json({ error: 'Loan not found' });
        }
        
        if (loan.accountId !== accountId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        if (loan.status !== 'ACTIVE') {
            return res.status(400).json({ error: `Loan is ${loan.status}. Only active loans can be paid off early.` });
        }
        
        const config = LOAN_CONFIG[loan.currency];
        const discount = calculateEarlyPaymentDiscount(loan.remainingBalance, config.earlyPaymentDiscount);
        
        const account = await db.findAccountById(accountId);
        
        if (account.balance < discount.finalAmount) {
            return res.status(400).json({
                error: 'Insufficient balance for early payoff',
                requiredAmount: discount.finalAmount,
                currentBalance: account.balance
            });
        }
        
        // Process payment
        const previousBalance = account.balance;
        account.balance -= discount.finalAmount;
        
        // Record early payoff
        const payoffAmount = discount.finalAmount;
        const savedAmount = discount.discount;
        
        loan.status = 'PAID';
        loan.completedAt = new Date();
        loan.paidAmount += payoffAmount;
        loan.remainingBalance = 0;
        
        // Record payoff transaction
        loan.paymentHistory.push({
            id: nextPaymentId++,
            date: new Date(),
            amount: payoffAmount,
            lateFee: 0,
            month: loan.paidMonths + 1,
            remainingBalance: 0,
            isEarlyPayoff: true,
            discountReceived: savedAmount
        });
        
        await db.updateAccount(accountId, { balance: account.balance });
        
        const transaction = {
            transactionId: `TXN-${Date.now()}`,
            accountId: accountId,
            type: 'LOAN_EARLY_PAYOFF',
            amount: payoffAmount,
            description: `Early loan payoff - Loan ${loan.loanId}`,
            previousBalance: previousBalance,
            newBalance: account.balance,
            loanId: loan.loanId,
            timestamp: new Date()
        };
        
        await db.saveTransaction(transaction);
        
        res.json({
            success: true,
            message: '✅ LOAN PAID OFF EARLY!',
            details: {
                loanId: loan.loanId,
                remainingBalance: `${config.symbol}${loan.remainingBalance.toFixed(2)}`,
                earlyPaymentDiscount: `${config.symbol}${savedAmount.toFixed(2)}`,
                totalPaid: `${config.symbol}${payoffAmount.toFixed(2)}`,
                savings: `${config.symbol}${savedAmount.toFixed(2)}`,
                newBalance: account.balance
            }
        });
        
    } catch (error) {
        logger.error('Error processing early payoff', error);
        res.status(500).json({ error: 'Error processing early payoff' });
    }
};

/**
 * Admin: Get loan statistics
 * GET /api/admin/loans/stats
 */
const getLoanStats = async (req, res) => {
    try {
        // Check admin permission
        if (!req.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const totalLoans = loans.length;
        const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
        const pendingLoans = loans.filter(l => l.status === 'PENDING').length;
        const paidLoans = loans.filter(l => l.status === 'PAID').length;
        
        const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);
        const totalOutstanding = loans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
        
        const byCurrency = {
            BRL: {
                total: loans.filter(l => l.currency === 'BRL').length,
                amount: loans.filter(l => l.currency === 'BRL').reduce((sum, l) => sum + l.amount, 0),
                outstanding: loans.filter(l => l.currency === 'BRL').reduce((sum, l) => sum + l.remainingBalance, 0)
            },
            USD: {
                total: loans.filter(l => l.currency === 'USD').length,
                amount: loans.filter(l => l.currency === 'USD').reduce((sum, l) => sum + l.amount, 0),
                outstanding: loans.filter(l => l.currency === 'USD').reduce((sum, l) => sum + l.remainingBalance, 0)
            },
            EUR: {
                total: loans.filter(l => l.currency === 'EUR').length,
                amount: loans.filter(l => l.currency === 'EUR').reduce((sum, l) => sum + l.amount, 0),
                outstanding: loans.filter(l => l.currency === 'EUR').reduce((sum, l) => sum + l.remainingBalance, 0)
            },
            GBP: {
                total: loans.filter(l => l.currency === 'GBP').length,
                amount: loans.filter(l => l.currency === 'GBP').reduce((sum, l) => sum + l.amount, 0),
                outstanding: loans.filter(l => l.currency === 'GBP').reduce((sum, l) => sum + l.remainingBalance, 0)
            }
        };
        
        res.json({
            summary: {
                totalLoans: totalLoans,
                activeLoans: activeLoans,
                pendingLoans: pendingLoans,
                paidLoans: paidLoans,
                totalDisbursed: totalAmount,
                totalOutstanding: totalOutstanding,
                defaultRate: totalLoans > 0 ? ((loans.filter(l => l.latePayments > 3).length / totalLoans) * 100).toFixed(2) : '0'
            },
            byCurrency: byCurrency,
            configurations: LOAN_CONFIG
        });
        
    } catch (error) {
        logger.error('Error fetching loan statistics', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
};

module.exports = {
    requestLoan,
    approveLoan,
    payInstallment,
    payInstallmentWithPix,
    confirmLoanPayment,
    earlyPayoffLoan,
    getMyLoans,
    getLoanDetails,
    getLoanStats
};
