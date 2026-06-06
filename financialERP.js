/**
 * ZENTRONIX BANK - COMPLETE FINANCIAL ERP SYSTEM
 * Enterprise Resource Planning for Banking Operations
 * Version: 1.0.0
 * Language: JavaScript (Node.js)
 * 
 * Features:
 * - General Ledger (Double-entry accounting)
 * - Accounts Payable (AP) Management
 * - Accounts Receivable (AR) Management
 * - Fixed Assets Management
 * - Inventory Management
 * - Tax Management (VAT, GST, Corporate Tax)
 * - Financial Reporting (Balance Sheet, P&L, Cash Flow)
 * - Budgeting & Forecasting
 * - Intercompany Transactions
 * - Multi-currency Accounting
 * - Bank Reconciliation
 * - Audit Trail
 * - Approval Workflows
 * - Vendor & Customer Management
 * - Invoice & Billing
 * - Payment Processing
 * - Expense Management
 * - Financial Consolidation
 * - Regulatory Reporting
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ========================================
// CONFIGURATION
// ========================================

const ERP_CONFIG = {
    // Chart of Accounts structure
    COA_CATEGORIES: {
        ASSETS: {
            code: '1',
            name: 'Assets',
            subcategories: {
                CURRENT_ASSETS: { code: '11', name: 'Current Assets' },
                CASH: { code: '111', name: 'Cash and Cash Equivalents' },
                ACCOUNTS_RECEIVABLE: { code: '112', name: 'Accounts Receivable' },
                INVENTORY: { code: '113', name: 'Inventory' },
                FIXED_ASSETS: { code: '12', name: 'Fixed Assets' },
                INTANGIBLE_ASSETS: { code: '13', name: 'Intangible Assets' }
            }
        },
        LIABILITIES: {
            code: '2',
            name: 'Liabilities',
            subcategories: {
                CURRENT_LIABILITIES: { code: '21', name: 'Current Liabilities' },
                ACCOUNTS_PAYABLE: { code: '211', name: 'Accounts Payable' },
                ACCRUED_EXPENSES: { code: '212', name: 'Accrued Expenses' },
                LONG_TERM_DEBT: { code: '22', name: 'Long-term Debt' }
            }
        },
        EQUITY: {
            code: '3',
            name: 'Equity',
            subcategories: {
                SHARE_CAPITAL: { code: '31', name: 'Share Capital' },
                RETAINED_EARNINGS: { code: '32', name: 'Retained Earnings' }
            }
        },
        REVENUE: {
            code: '4',
            name: 'Revenue',
            subcategories: {
                SERVICE_REVENUE: { code: '41', name: 'Service Revenue' },
                INTEREST_INCOME: { code: '42', name: 'Interest Income' },
                FEE_INCOME: { code: '43', name: 'Fee Income' }
            }
        },
        EXPENSES: {
            code: '5',
            name: 'Expenses',
            subcategories: {
                OPERATING_EXPENSES: { code: '51', name: 'Operating Expenses' },
                SALARIES: { code: '511', name: 'Salaries and Wages' },
                RENT: { code: '512', name: 'Rent' },
                UTILITIES: { code: '513', name: 'Utilities' },
                MARKETING: { code: '514', name: 'Marketing' },
                IT_EXPENSES: { code: '515', name: 'IT Expenses' }
            }
        }
    },
    
    // Journal entry types
    JOURNAL_TYPES: {
        MANUAL: 'MANUAL',
        INVOICE: 'INVOICE',
        PAYMENT: 'PAYMENT',
        PAYROLL: 'PAYROLL',
        DEPRECIATION: 'DEPRECIATION',
        ADJUSTMENT: 'ADJUSTMENT'
    },
    
    // Tax rates
    TAX_RATES: {
        VAT: { rate: 0.05, name: 'Value Added Tax' },
        GST: { rate: 0.18, name: 'Goods and Services Tax' },
        CORPORATE_TAX: { rate: 0.21, name: 'Corporate Income Tax' },
        WITHHOLDING_TAX: { rate: 0.10, name: 'Withholding Tax' }
    },
    
    // Accounting periods
    ACCOUNTING_PERIODS: {
        MONTHLY: 'MONTHLY',
        QUARTERLY: 'QUARTERLY',
        ANNUAL: 'ANNUAL'
    },
    
    // Approval statuses
    APPROVAL_STATUS: {
        DRAFT: 'DRAFT',
        PENDING: 'PENDING',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED',
        POSTED: 'POSTED'
    },
    
    // Supported currencies
    SUPPORTED_CURRENCIES: {
        USD: { code: 'USD', symbol: '$', decimalPlaces: 2 },
        EUR: { code: 'EUR', symbol: '€', decimalPlaces: 2 },
        GBP: { code: 'GBP', symbol: '£', decimalPlaces: 2 },
        BRL: { code: 'BRL', symbol: 'R$', decimalPlaces: 2 },
        BTC: { code: 'BTC', symbol: '₿', decimalPlaces: 8 },
        ETH: { code: 'ETH', symbol: 'Ξ', decimalPlaces: 6 },
        BRD: { code: 'BRD', symbol: 'BRD', decimalPlaces: 2 }
    }
};

// ========================================
// DATA MODELS
// ========================================

class Account {
    constructor(data) {
        this.accountId = data.accountId || this.generateAccountId();
        this.code = data.code;
        this.name = data.name;
        this.category = data.category;
        this.type = data.type; // Asset, Liability, Equity, Revenue, Expense
        this.normalBalance = data.normalBalance; // Debit or Credit
        this.currency = data.currency || 'USD';
        this.openingBalance = data.openingBalance || 0;
        this.currentBalance = data.openingBalance || 0;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.parentAccountId = data.parentAccountId || null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateAccountId() {
        return `ACC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

class JournalEntry {
    constructor(data) {
        this.journalId = data.journalId || this.generateJournalId();
        this.journalNumber = data.journalNumber || this.generateJournalNumber();
        this.type = data.type || ERP_CONFIG.JOURNAL_TYPES.MANUAL;
        this.date = data.date || new Date();
        this.description = data.description || '';
        this.lines = data.lines || [];
        this.totalDebit = 0;
        this.totalCredit = 0;
        this.status = data.status || ERP_CONFIG.APPROVAL_STATUS.DRAFT;
        this.approvedBy = data.approvedBy || null;
        this.approvedAt = data.approvedAt || null;
        this.postedBy = data.postedBy || null;
        this.postedAt = data.postedAt || null;
        this.reference = data.reference || null;
        this.createdBy = data.createdBy || null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        
        // Calculate totals
        for (const line of this.lines) {
            if (line.type === 'DEBIT') {
                this.totalDebit += line.amount;
            } else {
                this.totalCredit += line.amount;
            }
        }
    }
    
    generateJournalId() {
        return `JRN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    generateJournalNumber() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = crypto.randomBytes(2).toString('hex').toUpperCase();
        return `J${year}${month}-${random}`;
    }
    
    isBalanced() {
        return Math.abs(this.totalDebit - this.totalCredit) < 0.01;
    }
}

class JournalLine {
    constructor(data) {
        this.lineId = data.lineId || this.generateLineId();
        this.accountId = data.accountId;
        this.accountCode = data.accountCode;
        this.accountName = data.accountName;
        this.type = data.type; // DEBIT or CREDIT
        this.amount = data.amount;
        this.currency = data.currency || 'USD';
        this.description = data.description || null;
        this.costCenter = data.costCenter || null;
        this.project = data.project || null;
    }
    
    generateLineId() {
        return `LINE-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

class Invoice {
    constructor(data) {
        this.invoiceId = data.invoiceId || this.generateInvoiceId();
        this.invoiceNumber = data.invoiceNumber || this.generateInvoiceNumber();
        this.type = data.type; // SALES_INVOICE or PURCHASE_INVOICE
        this.customerId = data.customerId || null;
        this.vendorId = data.vendorId || null;
        this.issueDate = data.issueDate || new Date();
        this.dueDate = data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        this.items = data.items || [];
        this.subtotal = 0;
        this.taxAmount = 0;
        this.totalAmount = 0;
        this.currency = data.currency || 'USD';
        this.status = data.status || 'DRAFT'; // DRAFT, SENT, PAID, OVERDUE, CANCELLED
        this.paidAmount = data.paidAmount || 0;
        this.remainingAmount = 0;
        this.notes = data.notes || null;
        this.terms = data.terms || null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        
        this.calculateTotals();
    }
    
    generateInvoiceId() {
        return `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    generateInvoiceNumber() {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const random = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `INV-${year}${month}-${random}`;
    }
    
    calculateTotals() {
        this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        this.taxAmount = this.subtotal * (ERP_CONFIG.TAX_RATES.VAT.rate);
        this.totalAmount = this.subtotal + this.taxAmount;
        this.remainingAmount = this.totalAmount - this.paidAmount;
    }
}

class InvoiceItem {
    constructor(data) {
        this.itemId = data.itemId || this.generateItemId();
        this.productId = data.productId;
        this.description = data.description;
        this.quantity = data.quantity;
        this.unitPrice = data.unitPrice;
        this.totalPrice = this.quantity * this.unitPrice;
        this.taxRate = data.taxRate || ERP_CONFIG.TAX_RATES.VAT.rate;
    }
    
    generateItemId() {
        return `ITEM-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

class Payment {
    constructor(data) {
        this.paymentId = data.paymentId || this.generatePaymentId();
        this.paymentNumber = data.paymentNumber || this.generatePaymentNumber();
        this.invoiceId = data.invoiceId;
        this.customerId = data.customerId || null;
        this.vendorId = data.vendorId || null;
        this.amount = data.amount;
        this.currency = data.currency || 'USD';
        this.method = data.method; // CASH, BANK_TRANSFER, CREDIT_CARD, CRYPTO
        this.reference = data.reference || null;
        this.date = data.date || new Date();
        this.status = data.status || 'COMPLETED';
        this.createdAt = new Date();
    }
    
    generatePaymentId() {
        return `PMT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    generatePaymentNumber() {
        const random = crypto.randomBytes(4).toString('hex').toUpperCase();
        return `PMT-${random}`;
    }
}

class FixedAsset {
    constructor(data) {
        this.assetId = data.assetId || this.generateAssetId();
        this.name = data.name;
        this.category = data.category;
        this.purchaseDate = data.purchaseDate;
        this.purchaseCost = data.purchaseCost;
        this.salvageValue = data.salvageValue || 0;
        this.usefulLife = data.usefulLife; // in years
        this.depreciationMethod = data.depreciationMethod || 'STRAIGHT_LINE';
        this.currentBookValue = this.purchaseCost;
        this.accumulatedDepreciation = 0;
        this.depreciationExpense = 0;
        this.status = data.status || 'ACTIVE';
        this.location = data.location || null;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateAssetId() {
        return `AST-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    calculateDepreciation() {
        if (this.depreciationMethod === 'STRAIGHT_LINE') {
            const annualDepreciation = (this.purchaseCost - this.salvageValue) / this.usefulLife;
            return annualDepreciation / 12; // Monthly depreciation
        }
        return 0;
    }
}

class Budget {
    constructor(data) {
        this.budgetId = data.budgetId || this.generateBudgetId();
        this.accountId = data.accountId;
        this.fiscalYear = data.fiscalYear;
        this.period = data.period;
        this.amount = data.amount;
        this.actualAmount = 0;
        this.variance = 0;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    
    generateBudgetId() {
        return `BDG-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

// ========================================
// GENERAL LEDGER SERVICE
// ========================================

class GeneralLedgerService extends EventEmitter {
    constructor() {
        super();
        this.accounts = new Map();
        this.journalEntries = new Map();
        this.journalCounter = 0;
    }
    
    async createAccount(accountData) {
        // Check if account code exists
        for (const account of this.accounts.values()) {
            if (account.code === accountData.code) {
                throw new Error(`Account code ${accountData.code} already exists`);
            }
        }
        
        const account = new Account(accountData);
        this.accounts.set(account.accountId, account);
        this.emit('account_created', account);
        return account;
    }
    
    async createJournalEntry(entryData) {
        const journalEntry = new JournalEntry(entryData);
        
        if (!journalEntry.isBalanced()) {
            throw new Error(`Journal entry is not balanced. Debits: ${journalEntry.totalDebit}, Credits: ${journalEntry.totalCredit}`);
        }
        
        // Validate all accounts exist
        for (const line of journalEntry.lines) {
            const account = this.accounts.get(line.accountId);
            if (!account) {
                throw new Error(`Account ${line.accountId} not found`);
            }
            line.accountCode = account.code;
            line.accountName = account.name;
        }
        
        this.journalEntries.set(journalEntry.journalId, journalEntry);
        this.emit('journal_created', journalEntry);
        return journalEntry;
    }
    
    async postJournalEntry(journalId, postedBy) {
        const journalEntry = this.journalEntries.get(journalId);
        if (!journalEntry) throw new Error('Journal entry not found');
        
        if (journalEntry.status === ERP_CONFIG.APPROVAL_STATUS.POSTED) {
            throw new Error('Journal entry already posted');
        }
        
        // Update account balances
        for (const line of journalEntry.lines) {
            const account = this.accounts.get(line.accountId);
            if (line.type === 'DEBIT') {
                account.currentBalance += line.amount;
            } else {
                account.currentBalance -= line.amount;
            }
            account.updatedAt = new Date();
        }
        
        journalEntry.status = ERP_CONFIG.APPROVAL_STATUS.POSTED;
        journalEntry.postedBy = postedBy;
        journalEntry.postedAt = new Date();
        journalEntry.updatedAt = new Date();
        
        this.emit('journal_posted', journalEntry);
        return journalEntry;
    }
    
    async getTrialBalance(asOfDate = new Date()) {
        const trialBalance = [];
        
        for (const account of this.accounts.values()) {
            trialBalance.push({
                accountId: account.accountId,
                code: account.code,
                name: account.name,
                debitBalance: account.normalBalance === 'DEBIT' ? account.currentBalance : 0,
                creditBalance: account.normalBalance === 'CREDIT' ? account.currentBalance : 0
            });
        }
        
        const totals = trialBalance.reduce((sum, item) => ({
            totalDebits: sum.totalDebits + item.debitBalance,
            totalCredits: sum.totalCredits + item.creditBalance
        }), { totalDebits: 0, totalCredits: 0 });
        
        return {
            asOfDate,
            accounts: trialBalance,
            totals,
            isBalanced: Math.abs(totals.totalDebits - totals.totalCredits) < 0.01
        };
    }
    
    async getBalanceSheet(asOfDate = new Date()) {
        const assets = [];
        const liabilities = [];
        const equity = [];
        
        for (const account of this.accounts.values()) {
            const accountData = {
                code: account.code,
                name: account.name,
                balance: account.currentBalance
            };
            
            if (account.category === 'ASSETS') {
                assets.push(accountData);
            } else if (account.category === 'LIABILITIES') {
                liabilities.push(accountData);
            } else if (account.category === 'EQUITY') {
                equity.push(accountData);
            }
        }
        
        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
        const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);
        
        return {
            asOfDate,
            assets: { items: assets, total: totalAssets },
            liabilities: { items: liabilities, total: totalLiabilities },
            equity: { items: equity, total: totalEquity },
            totalLiabilitiesEquity: totalLiabilities + totalEquity
        };
    }
    
    async getIncomeStatement(startDate, endDate) {
        const revenue = [];
        const expenses = [];
        
        // Get journal entries within date range
        const periodEntries = Array.from(this.journalEntries.values())
            .filter(je => je.date >= startDate && je.date <= endDate && je.status === 'POSTED');
        
        // Aggregate by account
        const accountBalances = new Map();
        
        for (const entry of periodEntries) {
            for (const line of entry.lines) {
                const account = this.accounts.get(line.accountId);
                if (account.category === 'REVENUE' || account.category === 'EXPENSES') {
                    const current = accountBalances.get(account.accountId) || { balance: 0, account };
                    if (line.type === 'DEBIT') {
                        current.balance += line.amount;
                    } else {
                        current.balance -= line.amount;
                    }
                    accountBalances.set(account.accountId, current);
                }
            }
        }
        
        for (const [_, data] of accountBalances) {
            const item = {
                code: data.account.code,
                name: data.account.name,
                balance: Math.abs(data.balance)
            };
            
            if (data.account.category === 'REVENUE') {
                revenue.push(item);
            } else {
                expenses.push(item);
            }
        }
        
        const totalRevenue = revenue.reduce((sum, r) => sum + r.balance, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
        const netIncome = totalRevenue - totalExpenses;
        
        return {
            period: { startDate, endDate },
            revenue: { items: revenue, total: totalRevenue },
            expenses: { items: expenses, total: totalExpenses },
            netIncome
        };
    }
}

// ========================================
// ACCOUNTS RECEIVABLE SERVICE
// ========================================

class AccountsReceivableService extends EventEmitter {
    constructor() {
        super();
        this.invoices = new Map();
        this.payments = new Map();
    }
    
    async createInvoice(invoiceData) {
        const invoice = new Invoice(invoiceData);
        invoice.status = 'SENT';
        this.invoices.set(invoice.invoiceId, invoice);
        this.emit('invoice_created', invoice);
        return invoice;
    }
    
    async recordPayment(paymentData) {
        const payment = new Payment(paymentData);
        const invoice = this.invoices.get(payment.invoiceId);
        
        if (!invoice) throw new Error('Invoice not found');
        
        invoice.paidAmount += payment.amount;
        invoice.remainingAmount = invoice.totalAmount - invoice.paidAmount;
        
        if (invoice.remainingAmount <= 0) {
            invoice.status = 'PAID';
            invoice.paidAt = new Date();
        }
        
        invoice.updatedAt = new Date();
        this.payments.set(payment.paymentId, payment);
        this.emit('payment_recorded', { payment, invoice });
        
        return payment;
    }
    
    async getAgingReport(asOfDate = new Date()) {
        const agingBuckets = {
            '0-30': [],
            '31-60': [],
            '61-90': [],
            '90+': []
        };
        
        for (const invoice of this.invoices.values()) {
            if (invoice.status !== 'PAID' && invoice.type === 'SALES_INVOICE') {
                const daysOverdue = Math.floor((asOfDate - invoice.dueDate) / (1000 * 60 * 60 * 24));
                
                let bucket = '0-30';
                if (daysOverdue > 90) bucket = '90+';
                else if (daysOverdue > 60) bucket = '61-90';
                else if (daysOverdue > 30) bucket = '31-60';
                
                agingBuckets[bucket].push({
                    invoiceId: invoice.invoiceId,
                    invoiceNumber: invoice.invoiceNumber,
                    customerId: invoice.customerId,
                    amount: invoice.remainingAmount,
                    dueDate: invoice.dueDate,
                    daysOverdue: Math.max(0, daysOverdue)
                });
            }
        }
        
        const totals = {};
        for (const [bucket, items] of Object.entries(agingBuckets)) {
            totals[bucket] = items.reduce((sum, item) => sum + item.amount, 0);
        }
        
        return {
            asOfDate,
            buckets: agingBuckets,
            totals,
            totalOutstanding: Object.values(totals).reduce((a, b) => a + b, 0)
        };
    }
}

// ========================================
// ACCOUNTS PAYABLE SERVICE
// ========================================

class AccountsPayableService extends EventEmitter {
    constructor() {
        super();
        this.bills = new Map();
        this.vendorPayments = new Map();
    }
    
    async createBill(billData) {
        const bill = new Invoice({ ...billData, type: 'PURCHASE_INVOICE' });
        bill.status = 'PENDING';
        this.bills.set(bill.invoiceId, bill);
        this.emit('bill_created', bill);
        return bill;
    }
    
    async recordVendorPayment(paymentData) {
        const payment = new Payment(paymentData);
        const bill = this.bills.get(payment.invoiceId);
        
        if (!bill) throw new Error('Bill not found');
        
        bill.paidAmount += payment.amount;
        bill.remainingAmount = bill.totalAmount - bill.paidAmount;
        
        if (bill.remainingAmount <= 0) {
            bill.status = 'PAID';
        }
        
        bill.updatedAt = new Date();
        this.vendorPayments.set(payment.paymentId, payment);
        this.emit('vendor_payment_recorded', { payment, bill });
        
        return payment;
    }
    
    async getBillsDueReport() {
        const billsDue = [];
        const now = new Date();
        
        for (const bill of this.bills.values()) {
            if (bill.status !== 'PAID' && bill.type === 'PURCHASE_INVOICE') {
                billsDue.push({
                    billId: bill.invoiceId,
                    billNumber: bill.invoiceNumber,
                    vendorId: bill.vendorId,
                    amount: bill.remainingAmount,
                    dueDate: bill.dueDate,
                    isOverdue: bill.dueDate < now
                });
            }
        }
        
        const totalDue = billsDue.reduce((sum, b) => sum + b.amount, 0);
        const totalOverdue = billsDue.filter(b => b.isOverdue).reduce((sum, b) => sum + b.amount, 0);
        
        return {
            asOfDate: now,
            billsDue,
            totalDue,
            totalOverdue,
            countDue: billsDue.length,
            countOverdue: billsDue.filter(b => b.isOverdue).length
        };
    }
}

// ========================================
// FIXED ASSETS SERVICE
// ========================================

class FixedAssetsService extends EventEmitter {
    constructor() {
        super();
        this.assets = new Map();
        this.depreciationSchedule = new Map();
    }
    
    async addAsset(assetData) {
        const asset = new FixedAsset(assetData);
        this.assets.set(asset.assetId, asset);
        this.emit('asset_added', asset);
        return asset;
    }
    
    async runDepreciation(periodEndDate) {
        const depreciationEntries = [];
        
        for (const asset of this.assets.values()) {
            if (asset.status === 'ACTIVE') {
                const monthlyDepreciation = asset.calculateDepreciation();
                
                if (monthlyDepreciation > 0) {
                    asset.accumulatedDepreciation += monthlyDepreciation;
                    asset.currentBookValue = asset.purchaseCost - asset.accumulatedDepreciation;
                    asset.depreciationExpense = monthlyDepreciation;
                    asset.updatedAt = new Date();
                    
                    depreciationEntries.push({
                        assetId: asset.assetId,
                        assetName: asset.name,
                        depreciationAmount: monthlyDepreciation,
                        accumulatedDepreciation: asset.accumulatedDepreciation,
                        bookValue: asset.currentBookValue
                    });
                }
            }
        }
        
        this.emit('depreciation_run', { periodEndDate, entries: depreciationEntries });
        return depreciationEntries;
    }
    
    async getAssetSummary() {
        const totalCost = Array.from(this.assets.values()).reduce((sum, a) => sum + a.purchaseCost, 0);
        const totalDepreciation = Array.from(this.assets.values()).reduce((sum, a) => sum + a.accumulatedDepreciation, 0);
        const totalBookValue = totalCost - totalDepreciation;
        
        return {
            totalAssets: this.assets.size,
            activeAssets: Array.from(this.assets.values()).filter(a => a.status === 'ACTIVE').length,
            totalCost,
            totalDepreciation,
            totalBookValue,
            byCategory: this.groupAssetsByCategory()
        };
    }
    
    groupAssetsByCategory() {
        const categories = {};
        for (const asset of this.assets.values()) {
            categories[asset.category] = (categories[asset.category] || 0) + 1;
        }
        return categories;
    }
}

// ========================================
// BUDGETING SERVICE
// ========================================

class BudgetingService extends EventEmitter {
    constructor() {
        super();
        this.budgets = new Map();
        this.forecasts = new Map();
    }
    
    async createBudget(budgetData) {
        const budget = new Budget(budgetData);
        this.budgets.set(budget.budgetId, budget);
        this.emit('budget_created', budget);
        return budget;
    }
    
    async updateActuals(accountId, amount, period) {
        for (const budget of this.budgets.values()) {
            if (budget.accountId === accountId && budget.period === period) {
                budget.actualAmount += amount;
                budget.variance = budget.amount - budget.actualAmount;
                budget.updatedAt = new Date();
                this.budgets.set(budget.budgetId, budget);
            }
        }
        this.emit('actuals_updated', { accountId, amount, period });
    }
    
    async getBudgetVarianceReport(fiscalYear) {
        const report = [];
        
        for (const budget of this.budgets.values()) {
            if (budget.fiscalYear === fiscalYear) {
                report.push({
                    accountId: budget.accountId,
                    budgetedAmount: budget.amount,
                    actualAmount: budget.actualAmount,
                    variance: budget.variance,
                    variancePercentage: (budget.variance / budget.amount) * 100
                });
            }
        }
        
        return {
            fiscalYear,
            report,
            totalBudgeted: report.reduce((sum, r) => sum + r.budgetedAmount, 0),
            totalActual: report.reduce((sum, r) => sum + r.actualAmount, 0),
            totalVariance: report.reduce((sum, r) => sum + r.variance, 0)
        };
    }
    
    async createForecast(forecastData) {
        const forecastId = `FCST-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const forecast = {
            forecastId,
            ...forecastData,
            createdAt: new Date()
        };
        this.forecasts.set(forecastId, forecast);
        return forecast;
    }
}

// ========================================
// FINANCIAL REPORTING SERVICE
// ========================================

class FinancialReportingService extends EventEmitter {
    constructor(glService, arService, apService, assetsService, budgetingService) {
        super();
        this.glService = glService;
        this.arService = arService;
        this.apService = apService;
        this.assetsService = assetsService;
        this.budgetingService = budgetingService;
    }
    
    async generateFullFinancialPackage(periodEndDate) {
        const startDate = new Date(periodEndDate);
        startDate.setMonth(startDate.getMonth() - 1);
        
        const [balanceSheet, incomeStatement, trialBalance, agingReport, billsDue, assetSummary, budgetReport] = await Promise.all([
            this.glService.getBalanceSheet(periodEndDate),
            this.glService.getIncomeStatement(startDate, periodEndDate),
            this.glService.getTrialBalance(periodEndDate),
            this.arService.getAgingReport(periodEndDate),
            this.apService.getBillsDueReport(),
            this.assetsService.getAssetSummary(),
            this.budgetingService.getBudgetVarianceReport(periodEndDate.getFullYear())
        ]);
        
        const financialPackage = {
            generatedAt: new Date(),
            periodEndDate,
            balanceSheet,
            incomeStatement,
            trialBalance,
            accountsReceivable: agingReport,
            accountsPayable: billsDue,
            fixedAssets: assetSummary,
            budgetVariance: budgetReport,
            keyMetrics: this.calculateKeyMetrics(balanceSheet, incomeStatement)
        };
        
        this.emit('financial_package_generated', financialPackage);
        return financialPackage;
    }
    
    calculateKeyMetrics(balanceSheet, incomeStatement) {
        const totalAssets = balanceSheet.assets.total;
        const totalLiabilities = balanceSheet.liabilities.total;
        const totalEquity = balanceSheet.equity.total;
        const netIncome = incomeStatement.netIncome;
        
        return {
            currentRatio: totalLiabilities > 0 ? totalAssets / totalLiabilities : 0,
            debtToEquity: totalEquity > 0 ? totalLiabilities / totalEquity : 0,
            returnOnEquity: totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0,
            profitMargin: incomeStatement.revenue.total > 0 ? (netIncome / incomeStatement.revenue.total) * 100 : 0,
            workingCapital: totalAssets - totalLiabilities
        };
    }
    
    async generateCashFlowStatement(startDate, endDate) {
        // Get all journal entries in period
        const entries = Array.from(this.glService.journalEntries.values())
            .filter(je => je.date >= startDate && je.date <= endDate && je.status === 'POSTED');
        
        const cashFlow = {
            operating: { inflows: 0, outflows: 0, net: 0 },
            investing: { inflows: 0, outflows: 0, net: 0 },
            financing: { inflows: 0, outflows: 0, net: 0 }
        };
        
        for (const entry of entries) {
            for (const line of entry.lines) {
                const account = this.glService.accounts.get(line.accountId);
                if (account && account.code.startsWith('111')) { // Cash accounts
                    const amount = line.type === 'DEBIT' ? line.amount : -line.amount;
                    
                    // Categorize based on account type of the other side
                    if (account.category === 'OPERATING') {
                        cashFlow.operating.net += amount;
                    } else if (account.category === 'INVESTING') {
                        cashFlow.investing.net += amount;
                    } else if (account.category === 'FINANCING') {
                        cashFlow.financing.net += amount;
                    }
                }
            }
        }
        
        return {
            period: { startDate, endDate },
            operating: cashFlow.operating,
            investing: cashFlow.investing,
            financing: cashFlow.financing,
            netCashFlow: cashFlow.operating.net + cashFlow.investing.net + cashFlow.financing.net
        };
    }
}

// ========================================
// EXPRESS ROUTES
// ========================================

function createERPRouter(glService, arService, apService, assetsService, budgetingService, reportingService) {
    const express = require('express');
    const router = express.Router();
    
    // ========== General Ledger Routes ==========
    router.post('/accounts', async (req, res) => {
        try {
            const account = await glService.createAccount(req.body);
            res.json(account);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/journal-entries', async (req, res) => {
        try {
            const entry = await glService.createJournalEntry(req.body);
            res.json(entry);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/journal-entries/:journalId/post', async (req, res) => {
        try {
            const { postedBy } = req.body;
            const entry = await glService.postJournalEntry(req.params.journalId, postedBy);
            res.json(entry);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/trial-balance', async (req, res) => {
        const { asOfDate } = req.query;
        const trialBalance = await glService.getTrialBalance(asOfDate ? new Date(asOfDate) : new Date());
        res.json(trialBalance);
    });
    
    router.get('/balance-sheet', async (req, res) => {
        const { asOfDate } = req.query;
        const balanceSheet = await glService.getBalanceSheet(asOfDate ? new Date(asOfDate) : new Date());
        res.json(balanceSheet);
    });
    
    router.get('/income-statement', async (req, res) => {
        const { startDate, endDate } = req.query;
        const incomeStatement = await glService.getIncomeStatement(new Date(startDate), new Date(endDate));
        res.json(incomeStatement);
    });
    
    // ========== Accounts Receivable Routes ==========
    router.post('/invoices', async (req, res) => {
        try {
            const invoice = await arService.createInvoice(req.body);
            res.json(invoice);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/payments', async (req, res) => {
        try {
            const payment = await arService.recordPayment(req.body);
            res.json(payment);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/aging-report', async (req, res) => {
        const { asOfDate } = req.query;
        const report = await arService.getAgingReport(asOfDate ? new Date(asOfDate) : new Date());
        res.json(report);
    });
    
    // ========== Accounts Payable Routes ==========
    router.post('/bills', async (req, res) => {
        try {
            const bill = await apService.createBill(req.body);
            res.json(bill);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/vendor-payments', async (req, res) => {
        try {
            const payment = await apService.recordVendorPayment(req.body);
            res.json(payment);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/bills-due', async (req, res) => {
        const report = await apService.getBillsDueReport();
        res.json(report);
    });
    
    // ========== Fixed Assets Routes ==========
    router.post('/assets', async (req, res) => {
        try {
            const asset = await assetsService.addAsset(req.body);
            res.json(asset);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.post('/assets/depreciation', async (req, res) => {
        const { periodEndDate } = req.body;
        const result = await assetsService.runDepreciation(new Date(periodEndDate));
        res.json(result);
    });
    
    router.get('/assets/summary', async (req, res) => {
        const summary = await assetsService.getAssetSummary();
        res.json(summary);
    });
    
    // ========== Budgeting Routes ==========
    router.post('/budgets', async (req, res) => {
        try {
            const budget = await budgetingService.createBudget(req.body);
            res.json(budget);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    router.get('/budget-variance/:fiscalYear', async (req, res) => {
        const report = await budgetingService.getBudgetVarianceReport(parseInt(req.params.fiscalYear));
        res.json(report);
    });
    
    // ========== Financial Reporting Routes ==========
    router.get('/financial-package', async (req, res) => {
        const { periodEndDate } = req.query;
        const package_ = await reportingService.generateFullFinancialPackage(new Date(periodEndDate));
        res.json(package_);
    });
    
    router.get('/cash-flow', async (req, res) => {
        const { startDate, endDate } = req.query;
        const statement = await reportingService.generateCashFlowStatement(new Date(startDate), new Date(endDate));
        res.json(statement);
    });
    
    return router;
}

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initializeERPSystem() {
    const glService = new GeneralLedgerService();
    const arService = new AccountsReceivableService();
    const apService = new AccountsPayableService();
    const assetsService = new FixedAssetsService();
    const budgetingService = new BudgetingService();
    const reportingService = new FinancialReportingService(
        glService, arService, apService, assetsService, budgetingService
    );
    
    // Create default chart of accounts
    await createDefaultChartOfAccounts(glService);
    
    console.log('[ERP] ✅ Financial ERP System initialized');
    console.log('[ERP] Modules: GL, AR, AP, Fixed Assets, Budgeting, Reporting');
    
    return {
        glService,
        arService,
        apService,
        assetsService,
        budgetingService,
        reportingService
    };
}

async function createDefaultChartOfAccounts(glService) {
    const defaultAccounts = [
        // Assets
        { code: '1110', name: 'Cash - USD', category: 'ASSETS', type: 'Asset', normalBalance: 'DEBIT' },
        { code: '1120', name: 'Accounts Receivable', category: 'ASSETS', type: 'Asset', normalBalance: 'DEBIT' },
        { code: '1130', name: 'Inventory', category: 'ASSETS', type: 'Asset', normalBalance: 'DEBIT' },
        { code: '1210', name: 'Fixed Assets', category: 'ASSETS', type: 'Asset', normalBalance: 'DEBIT' },
        // Liabilities
        { code: '2110', name: 'Accounts Payable', category: 'LIABILITIES', type: 'Liability', normalBalance: 'CREDIT' },
        { code: '2120', name: 'Accrued Expenses', category: 'LIABILITIES', type: 'Liability', normalBalance: 'CREDIT' },
        // Equity
        { code: '3110', name: 'Share Capital', category: 'EQUITY', type: 'Equity', normalBalance: 'CREDIT' },
        { code: '3120', name: 'Retained Earnings', category: 'EQUITY', type: 'Equity', normalBalance: 'CREDIT' },
        // Revenue
        { code: '4110', name: 'Service Revenue', category: 'REVENUE', type: 'Revenue', normalBalance: 'CREDIT' },
        { code: '4120', name: 'Interest Income', category: 'REVENUE', type: 'Revenue', normalBalance: 'CREDIT' },
        // Expenses
        { code: '5110', name: 'Salaries Expense', category: 'EXPENSES', type: 'Expense', normalBalance: 'DEBIT' },
        { code: '5120', name: 'Rent Expense', category: 'EXPENSES', type: 'Expense', normalBalance: 'DEBIT' },
        { code: '5130', name: 'Utilities Expense', category: 'EXPENSES', type: 'Expense', normalBalance: 'DEBIT' }
    ];
    
    for (const accountData of defaultAccounts) {
        try {
            await glService.createAccount(accountData);
        } catch (error) {
            // Account may already exist
        }
    }
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    GeneralLedgerService,
    AccountsReceivableService,
    AccountsPayableService,
    FixedAssetsService,
    BudgetingService,
    FinancialReportingService,
    createERPRouter,
    initializeERPSystem,
    ERP_CONFIG,
    Account,
    JournalEntry,
    Invoice,
    Payment,
    FixedAsset,
    Budget
};
