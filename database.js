// database.js - Zentronix Bank Database Layer
// Complete in-memory database simulation for development and testing
// Replace with PostgreSQL/MongoDB for production

const logger = require('./logger');

// ==================== DATA STRUCTURES ====================
let accounts = [];
let loans = [];
let transactions = [];
let pendingPayments = [];
let cards = [];
let auditLogs = [];
let sessions = [];
let notifications = [];
let investments = [];
let cryptoWallets = [];

// ==================== ID COUNTERS ====================
let nextAccountId = 1000;
let nextLoanId = 1;
let nextTransactionId = 5000;
let nextPaymentId = 1;
let nextCardId = 7000;
let nextAuditId = 9000;
let nextNotificationId = 11000;
let nextInvestmentId = 13000;
let nextWalletId = 15000;

// ==================== SAMPLE DATA INITIALIZATION ====================
const initializeSampleAccounts = () => {
  if (accounts.length === 0) {
    // Premium Account
    accounts.push({
      id: nextAccountId++,
      accountNumber: '100001',
      accountType: 'PREMIUM',
      name: 'João Silva',
      email: 'joao@zentronix.com',
      document: '123.456.789-00',
      phone: '+55 11 99999-1111',
      balance: 52500.00,
      blockedBalance: 0,
      currency: 'BRL',
      monthlyIncome: 15000.00,
      creditScore: 785,
      accountAgeMonths: 24,
      paymentHistory: [
        { date: '2026-01-15', onTime: true, amount: 1250.00 },
        { date: '2026-02-15', onTime: true, amount: 1250.00 },
        { date: '2026-03-15', onTime: true, amount: 1250.00 }
      ],
      status: 'ACTIVE',
      tier: 'BLACK',
      createdAt: new Date('2024-06-01'),
      lastLoginAt: new Date(),
      twoFactorEnabled: true,
      biometricEnabled: true
    });
    
    // Business Account
    accounts.push({
      id: nextAccountId++,
      accountNumber: '100002',
      accountType: 'BUSINESS',
      name: 'Zentronix Corp',
      email: 'corp@zentronix.com',
      document: '12.345.678/0001-90',
      phone: '+55 11 99999-2222',
      balance: 127500.00,
      blockedBalance: 5000.00,
      currency: 'BRL',
      monthlyIncome: 85000.00,
      creditScore: 820,
      accountAgeMonths: 36,
      paymentHistory: [
        { date: '2026-01-10', onTime: true, amount: 5000.00 },
        { date: '2026-02-10', onTime: true, amount: 5000.00 },
        { date: '2026-03-10', onTime: true, amount: 5000.00 }
      ],
      status: 'ACTIVE',
      tier: 'ENTERPRISE',
      createdAt: new Date('2023-06-01'),
      lastLoginAt: new Date(),
      twoFactorEnabled: true,
      biometricEnabled: false
    });
    
    // Standard Account
    accounts.push({
      id: nextAccountId++,
      accountNumber: '100003',
      accountType: 'STANDARD',
      name: 'Maria Santos',
      email: 'maria@zentronix.com',
      document: '987.654.321-00',
      phone: '+55 11 99999-3333',
      balance: 8750.00,
      blockedBalance: 0,
      currency: 'BRL',
      monthlyIncome: 4500.00,
      creditScore: 650,
      accountAgeMonths: 6,
      paymentHistory: [
        { date: '2026-02-20', onTime: true, amount: 350.00 },
        { date: '2026-03-20', onTime: true, amount: 350.00 }
      ],
      status: 'ACTIVE',
      tier: 'GOLD',
      createdAt: new Date('2025-12-01'),
      lastLoginAt: new Date(),
      twoFactorEnabled: false,
      biometricEnabled: false
    });

    // International Account (USD)
    accounts.push({
      id: nextAccountId++,
      accountNumber: '100004',
      accountType: 'INTERNATIONAL',
      name: 'John Doe International',
      email: 'john.international@zentronix.com',
      document: 'PASSPORT-USA-12345',
      phone: '+1 555 123-4567',
      balance: 25000.00,
      blockedBalance: 0,
      currency: 'USD',
      monthlyIncome: 8000.00,
      creditScore: 750,
      accountAgeMonths: 12,
      paymentHistory: [
        { date: '2026-01-05', onTime: true, amount: 500.00 },
        { date: '2026-02-05', onTime: true, amount: 500.00 },
        { date: '2026-03-05', onTime: true, amount: 500.00 }
      ],
      status: 'ACTIVE',
      tier: 'PLATINUM',
      createdAt: new Date('2025-06-01'),
      lastLoginAt: new Date(),
      twoFactorEnabled: true,
      biometricEnabled: true
    });
    
    logger.info('Sample accounts initialized successfully');
  }
};

// ==================== ACCOUNT FUNCTIONS ====================

/**
 * Find account by ID
 * @param {number} id - Account ID
 * @returns {Promise<Object|null>} Account object or null
 */
const findAccountById = async (id) => {
  const account = accounts.find(acc => acc.id === id);
  if (account) {
    logger.debug(`Account found: ${account.accountNumber}`);
  }
  return account || null;
};

/**
 * Find account by account number
 * @param {string} accountNumber - Account number
 * @returns {Promise<Object|null>} Account object or null
 */
const findAccountByNumber = async (accountNumber) => {
  return accounts.find(acc => acc.accountNumber === accountNumber) || null;
};

/**
 * Find account by email
 * @param {string} email - Account email
 * @returns {Promise<Object|null>} Account object or null
 */
const findAccountByEmail = async (email) => {
  return accounts.find(acc => acc.email === email) || null;
};

/**
 * Find account by document (CPF/CNPJ)
 * @param {string} document - Document number
 * @returns {Promise<Object|null>} Account object or null
 */
const findAccountByDocument = async (document) => {
  return accounts.find(acc => acc.document === document) || null;
};

/**
 * Create a new account
 * @param {Object} accountData - Account data
 * @returns {Promise<Object>} Created account
 */
const createAccount = async (accountData) => {
  const newAccount = {
    id: nextAccountId++,
    accountNumber: `10${String(nextAccountId).padStart(4, '0')}`,
    balance: 0,
    blockedBalance: 0,
    status: 'PENDING',
    ...accountData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  accounts.push(newAccount);
  logger.info(`New account created: ${newAccount.accountNumber}`);
  return newAccount;
};

/**
 * Update account information
 * @param {number} id - Account ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object|null>} Updated account or null
 */
const updateAccount = async (id, data) => {
  const index = accounts.findIndex(acc => acc.id === id);
  if (index !== -1) {
    accounts[index] = { 
      ...accounts[index], 
      ...data, 
      updatedAt: new Date() 
    };
    logger.info(`Account ${id} updated`);
    return accounts[index];
  }
  logger.warn(`Account ${id} not found for update`);
  return null;
};

/**
 * Delete an account (soft delete)
 * @param {number} id - Account ID
 * @returns {Promise<boolean>} Success status
 */
const deleteAccount = async (id) => {
  const index = accounts.findIndex(acc => acc.id === id);
  if (index !== -1) {
    accounts[index].status = 'CLOSED';
    accounts[index].closedAt = new Date();
    logger.info(`Account ${id} closed`);
    return true;
  }
  return false;
};

/**
 * Get all accounts (admin only)
 * @returns {Promise<Array>} List of all accounts
 */
const getAllAccounts = async () => {
  return accounts;
};

// ==================== TRANSACTION FUNCTIONS ====================

/**
 * Save a transaction to history
 * @param {Object} transaction - Transaction object
 * @returns {Promise<Object>} Saved transaction
 */
const saveTransaction = async (transaction) => {
  const newTransaction = {
    id: nextTransactionId++,
    transactionId: `TXN-${Date.now()}-${nextTransactionId}`,
    timestamp: new Date(),
    ...transaction
  };
  transactions.push(newTransaction);
  logger.info(`Transaction ${newTransaction.transactionId} saved`);
  return newTransaction;
};

/**
 * Get transactions for an account
 * @param {number} accountId - Account ID
 * @param {number} limit - Maximum number of transactions
 * @returns {Promise<Array>} List of transactions
 */
const getAccountTransactions = async (accountId, limit = 50) => {
  return transactions
    .filter(t => t.accountId === accountId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

/**
 * Get transaction by ID
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object|null>} Transaction or null
 */
const getTransactionById = async (transactionId) => {
  return transactions.find(t => t.transactionId === transactionId) || null;
};

/**
 * Get all transactions (admin)
 * @returns {Promise<Array>} All transactions
 */
const getAllTransactions = async () => {
  return transactions;
};

// ==================== LOAN FUNCTIONS ====================

/**
 * Save a loan to database
 * @param {Object} loan - Loan object
 * @returns {Promise<Object>} Saved loan
 */
const saveLoan = async (loan) => {
  loans.push(loan);
  logger.info(`Loan ${loan.loanId} saved`);
  return loan;
};

/**
 * Update an existing loan
 * @param {Object} loan - Updated loan object
 * @returns {Promise<Object|null>} Updated loan or null
 */
const updateLoan = async (loan) => {
  const index = loans.findIndex(l => l.loanId === loan.loanId);
  if (index !== -1) {
    loans[index] = { ...loans[index], ...loan, updatedAt: new Date() };
    logger.info(`Loan ${loan.loanId} updated`);
    return loans[index];
  }
  logger.warn(`Loan ${loan.loanId} not found for update`);
  return null;
};

/**
 * Find loan by ID
 * @param {string} loanId - Loan ID
 * @returns {Promise<Object|null>} Loan or null
 */
const findLoanById = async (loanId) => {
  return loans.find(l => l.loanId === loanId) || null;
};

/**
 * Get loans by account ID
 * @param {number} accountId - Account ID
 * @returns {Promise<Array>} List of loans
 */
const getLoansByAccount = async (accountId) => {
  return loans.filter(l => l.accountId === accountId);
};

/**
 * Get all loans (admin)
 * @returns {Promise<Array>} All loans
 */
const getAllLoans = async () => {
  return loans;
};

// ==================== PIX PAYMENT FUNCTIONS ====================

/**
 * Save a pending Pix payment
 * @param {Object} payment - Payment object
 * @returns {Promise<Object>} Saved payment
 */
const savePendingPayment = async (payment) => {
  pendingPayments.push(payment);
  logger.info(`Pending payment ${payment.paymentId} saved`);
  return payment;
};

/**
 * Find pending payment by ID
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object|null>} Payment or null
 */
const findPendingPayment = async (paymentId) => {
  return pendingPayments.find(p => p.paymentId === paymentId) || null;
};

/**
 * Update pending payment status
 * @param {Object} payment - Updated payment object
 * @returns {Promise<Object|null>} Updated payment or null
 */
const updatePendingPayment = async (payment) => {
  const index = pendingPayments.findIndex(p => p.paymentId === payment.paymentId);
  if (index !== -1) {
    pendingPayments[index] = { ...pendingPayments[index], ...payment };
    logger.info(`Pending payment ${payment.paymentId} updated`);
    return pendingPayments[index];
  }
  return null;
};

// ==================== CARD FUNCTIONS ====================

/**
 * Create a new card
 * @param {Object} cardData - Card data
 * @returns {Promise<Object>} Created card
 */
const createCard = async (cardData) => {
  const newCard = {
    id: nextCardId++,
    cardId: `CARD-${Date.now()}-${nextCardId}`,
    ...cardData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  cards.push(newCard);
  logger.info(`Card ${newCard.cardId} created for account ${cardData.accountId}`);
  return newCard;
};

/**
 * Get cards by account ID
 * @param {number} accountId - Account ID
 * @returns {Promise<Array>} List of cards
 */
const getCardsByAccount = async (accountId) => {
  return cards.filter(c => c.accountId === accountId);
};

/**
 * Update card status
 * @param {string} cardId - Card ID
 * @param {string} status - New status (ACTIVE, BLOCKED, CANCELLED)
 * @returns {Promise<Object|null>} Updated card or null
 */
const updateCardStatus = async (cardId, status) => {
  const index = cards.findIndex(c => c.cardId === cardId);
  if (index !== -1) {
    cards[index].status = status;
    cards[index].updatedAt = new Date();
    logger.info(`Card ${cardId} status updated to ${status}`);
    return cards[index];
  }
  return null;
};

// ==================== AUDIT FUNCTIONS ====================

/**
 * Save audit log entry
 * @param {Object} auditData - Audit data
 * @returns {Promise<Object>} Saved audit entry
 */
const saveAuditLog = async (auditData) => {
  const auditEntry = {
    id: nextAuditId++,
    auditId: `AUDIT-${Date.now()}-${nextAuditId}`,
    timestamp: new Date(),
    ...auditData
  };
  auditLogs.push(auditEntry);
  logger.debug(`Audit log saved: ${auditEntry.action}`);
  return auditEntry;
};

/**
 * Get audit logs by account
 * @param {number} accountId - Account ID
 * @param {number} limit - Maximum entries
 * @returns {Promise<Array>} List of audit logs
 */
const getAuditLogsByAccount = async (accountId, limit = 100) => {
  return auditLogs
    .filter(a => a.accountId === accountId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

// ==================== SESSION FUNCTIONS ====================

/**
 * Create a new session
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} Created session
 */
const createSession = async (sessionData) => {
  const newSession = {
    sessionId: `SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ...sessionData,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };
  sessions.push(newSession);
  return newSession;
};

/**
 * Find session by ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} Session or null
 */
const findSession = async (sessionId) => {
  return sessions.find(s => s.sessionId === sessionId && s.expiresAt > new Date()) || null;
};

/**
 * Invalidate session
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} Success status
 */
const invalidateSession = async (sessionId) => {
  const index = sessions.findIndex(s => s.sessionId === sessionId);
  if (index !== -1) {
    sessions[index].expiresAt = new Date();
    return true;
  }
  return false;
};

// ==================== NOTIFICATION FUNCTIONS ====================

/**
 * Create a notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object>} Created notification
 */
const createNotification = async (notificationData) => {
  const notification = {
    id: nextNotificationId++,
    notificationId: `NOTIF-${Date.now()}-${nextNotificationId}`,
    read: false,
    createdAt: new Date(),
    ...notificationData
  };
  notifications.push(notification);
  return notification;
};

/**
 * Get notifications by account
 * @param {number} accountId - Account ID
 * @param {boolean} unreadOnly - Only unread notifications
 * @returns {Promise<Array>} List of notifications
 */
const getNotificationsByAccount = async (accountId, unreadOnly = false) => {
  let userNotifications = notifications.filter(n => n.accountId === accountId);
  if (unreadOnly) {
    userNotifications = userNotifications.filter(n => !n.read);
  }
  return userNotifications.sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
const markNotificationAsRead = async (notificationId) => {
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    notifications[index].read = true;
    notifications[index].readAt = new Date();
    return true;
  }
  return false;
};

// ==================== INVESTMENT FUNCTIONS ====================

/**
 * Create an investment
 * @param {Object} investmentData - Investment data
 * @returns {Promise<Object>} Created investment
 */
const createInvestment = async (investmentData) => {
  const investment = {
    id: nextInvestmentId++,
    investmentId: `INV-${Date.now()}-${nextInvestmentId}`,
    status: 'ACTIVE',
    createdAt: new Date(),
    ...investmentData
  };
  investments.push(investment);
  return investment;
};

/**
 * Get investments by account
 * @param {number} accountId - Account ID
 * @returns {Promise<Array>} List of investments
 */
const getInvestmentsByAccount = async (accountId) => {
  return investments.filter(i => i.accountId === accountId);
};

// ==================== CRYPTO WALLET FUNCTIONS ====================

/**
 * Create a crypto wallet
 * @param {Object} walletData - Wallet data
 * @returns {Promise<Object>} Created wallet
 */
const createCryptoWallet = async (walletData) => {
  const wallet = {
    id: nextWalletId++,
    walletId: `WALLET-${Date.now()}-${nextWalletId}`,
    balance: 0,
    createdAt: new Date(),
    ...walletData
  };
  cryptoWallets.push(wallet);
  return wallet;
};

/**
 * Get crypto wallets by account
 * @param {number} accountId - Account ID
 * @returns {Promise<Array>} List of wallets
 */
const getCryptoWalletsByAccount = async (accountId) => {
  return cryptoWallets.filter(w => w.accountId === accountId);
};

/**
 * Update crypto wallet balance
 * @param {string} walletId - Wallet ID
 * @param {number} newBalance - New balance
 * @returns {Promise<Object|null>} Updated wallet or null
 */
const updateCryptoBalance = async (walletId, newBalance) => {
  const index = cryptoWallets.findIndex(w => w.walletId === walletId);
  if (index !== -1) {
    cryptoWallets[index].balance = newBalance;
    cryptoWallets[index].updatedAt = new Date();
    return cryptoWallets[index];
  }
  return null;
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Clear all data (for testing only)
 */
const clearAllData = () => {
  accounts = [];
  loans = [];
  transactions = [];
  pendingPayments = [];
  cards = [];
  auditLogs = [];
  sessions = [];
  notifications = [];
  investments = [];
  cryptoWallets = [];
  nextAccountId = 1000;
  nextLoanId = 1;
  nextTransactionId = 5000;
  initializeSampleAccounts();
  logger.warn('All database data cleared');
};

/**
 * Get database statistics
 * @returns {Object} Database statistics
 */
const getStats = () => {
  return {
    accounts: accounts.length,
    loans: loans.length,
    transactions: transactions.length,
    pendingPayments: pendingPayments.length,
    cards: cards.length,
    auditLogs: auditLogs.length,
    sessions: sessions.length,
    notifications: notifications.length,
    investments: investments.length,
    cryptoWallets: cryptoWallets.length
  };
};

// Initialize sample data
initializeSampleAccounts();

// ==================== EXPORTS ====================
module.exports = {
  // Account functions
  findAccountById,
  findAccountByNumber,
  findAccountByEmail,
  findAccountByDocument,
  createAccount,
  updateAccount,
  deleteAccount,
  getAllAccounts,
  
  // Transaction functions
  saveTransaction,
  getAccountTransactions,
  getTransactionById,
  getAllTransactions,
  
  // Loan functions
  saveLoan,
  updateLoan,
  findLoanById,
  getLoansByAccount,
  getAllLoans,
  
  // Pix payment functions
  savePendingPayment,
  findPendingPayment,
  updatePendingPayment,
  
  // Card functions
  createCard,
  getCardsByAccount,
  updateCardStatus,
  
  // Audit functions
  saveAuditLog,
  getAuditLogsByAccount,
  
  // Session functions
  createSession,
  findSession,
  invalidateSession,
  
  // Notification functions
  createNotification,
  getNotificationsByAccount,
  markNotificationAsRead,
  
  // Investment functions
  createInvestment,
  getInvestmentsByAccount,
  
  // Crypto wallet functions
  createCryptoWallet,
  getCryptoWalletsByAccount,
  updateCryptoBalance,
  
  // Utility functions
  clearAllData,
  getStats
};
