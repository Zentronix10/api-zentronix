// server.js - Zentronix Bank Main API
// This file creates the backend server that manages all banking operations

const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS for your bank frontend to connect
app.use(cors());
app.use(express.json());

// SAMPLE DATABASE (simulating a real database)
// These will sync with your admin dashboard
let users = [
    {
        id: 1,
        name: "Alexander Vance",
        email: "alexander@zentronix.com",
        password: "zentronix123",
        balance_usd: 25000,
        balance_brc: 15000,
        kyc: "approved",
        status: "active"
    },
    {
        id: 2,
        name: "Sarah Chen",
        email: "sarah@zentronix.com",
        password: "sarah123",
        balance_usd: 128000,
        balance_brc: 5000,
        kyc: "approved",
        status: "active"
    },
    {
        id: 3,
        name: "James Rodriguez",
        email: "james@zentronix.com",
        password: "james123",
        balance_usd: 5400,
        balance_brc: 1000,
        kyc: "pending",
        status: "active"
    }
];

let loanRequests = [
    {
        id: 101,
        userId: 1,
        name: "Alexander Vance",
        amount: 50000,
        term: 24,
        purpose: "Business expansion",
        status: "pending",
        date: "2025-01-15"
    },
    {
        id: 102,
        userId: 2,
        name: "Sarah Chen",
        amount: 125000,
        term: 36,
        purpose: "Property acquisition",
        status: "pending",
        date: "2025-01-16"
    }
];

let cards = [
    {
        id: "card1",
        userId: 1,
        last4: "4213",
        type: "virtual",
        limit: 5000,
        status: "active"
    }
];

let transactions = [
    {
        id: 1,
        userId: 1,
        type: "transfer",
        amount: 1250,
        currency: "USD",
        date: "2025-01-15",
        description: "Wire transfer"
    },
    {
        id: 2,
        userId: 1,
        type: "crypto_purchase",
        amount: 2000,
        currency: "USD",
        date: "2025-01-14",
        description: "BTC Purchase"
    }
];

// ============= API ENDPOINTS =============

// Health check - verify API is running
app.get('/', (req, res) => {
    res.json({ 
        message: "🏦 Zentronix Bank API is running!",
        version: "1.0",
        endpoints: [
            "POST /api/login - User login",
            "GET /api/users - List all users",
            "GET /api/user/:id - Get user details",
            "POST /api/loan/request - Request a loan",
            "GET /api/loans/pending - View pending loans (Admin)",
            "PUT /api/loan/:id/approve - Approve loan (Admin)",
            "PUT /api/loan/:id/reject - Reject loan (Admin)",
            "GET /api/user/:id/balance - Get user balance",
            "POST /api/transfer - Make a transfer",
            "GET /api/stats - Dashboard statistics"
        ]
    });
});

// ============= AUTHENTICATION =============

// User login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Don't send password back
        const { password, ...userWithoutPassword } = user;
        res.json({
            success: true,
            message: "Login successful",
            user: userWithoutPassword
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: "Invalid email or password" 
        });
    }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    // Simple admin check (you can expand this)
    if (username === "admin" && password === "Zentronix@Admin2025") {
        res.json({
            success: true,
            message: "Admin login successful",
            admin: {
                id: "admin-1",
                name: "Master Admin",
                username: "admin",
                role: "super_admin"
            }
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: "Invalid admin credentials" 
        });
    }
});

// ============= USER MANAGEMENT =============

// Get all users (for admin dashboard)
app.get('/api/users', (req, res) => {
    const usersWithoutPassword = users.map(user => {
        const { password, ...userData } = user;
        return userData;
    });
    res.json({
        total: usersWithoutPassword.length,
        users: usersWithoutPassword
    });
});

// Get single user by ID
app.get('/api/user/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    
    const { password, ...userData } = user;
    res.json(userData);
});

// Get user balance
app.get('/api/user/:id/balance', (req, res) => {
    const userId = parseInt(req.params.id);
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    
    res.json({
        userId: user.id,
        name: user.name,
        balances: {
            USD: user.balance_usd,
            BRC: user.balance_brc
        },
        lastUpdate: new Date().toISOString()
    });
});

// Create new user account
app.post('/api/user/register', (req, res) => {
    const { name, email, password, initialDeposit } = req.body;
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
    }
    
    const newUser = {
        id: users.length + 1,
        name: name,
        email: email,
        password: password,
        balance_usd: initialDeposit || 0,
        balance_brc: 0,
        kyc: "pending",
        status: "active",
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    const { password: _, ...userData } = newUser;
    res.status(201).json({
        success: true,
        message: "Account created successfully",
        user: userData
    });
});

// Update user KYC status
app.put('/api/user/:id/kyc', (req, res) => {
    const userId = parseInt(req.params.id);
    const { kycStatus, documents } = req.body;
    
    const user = users.find(u => u.id === userId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    
    user.kyc = kycStatus; // pending, approved, rejected
    
    res.json({
        success: true,
        message: `KYC status updated to ${kycStatus}`,
        user: {
            id: user.id,
            name: user.name,
            kyc: user.kyc
        }
    });
});

// ============= LOAN MANAGEMENT =============

// Request a loan
app.post('/api/loan/request', (req, res) => {
    const { userId, amount, term, purpose } = req.body;
    const user = users.find(u => u.id === userId);
    
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }
    
    if (user.kyc !== "approved") {
        return res.status(403).json({ 
            error: "KYC approval required to request a loan" 
        });
    }
    
    const newLoanRequest = {
        id: Date.now(),
        userId: userId,
        name: user.name,
        amount: amount,
        term: term,
        purpose: purpose,
        status: "pending",
        date: new Date().toISOString().split('T')[0],
        interestRate: 5.9
    };
    
    loanRequests.push(newLoanRequest);
    
    res.json({
        success: true,
        message: "Loan request submitted successfully!",
        loan: newLoanRequest
    });
});

// Get pending loans (for admin)
app.get('/api/loans/pending', (req, res) => {
    const pending = loanRequests.filter(loan => loan.status === "pending");
    res.json({
        total: pending.length,
        loans: pending
    });
});

// Get all loans (for admin)
app.get('/api/loans/all', (req, res) => {
    res.json({
        total: loanRequests.length,
        loans: loanRequests
    });
});

// Get user's loans
app.get('/api/user/:id/loans', (req, res) => {
    const userId = parseInt(req.params.id);
    const userLoans = loanRequests.filter(loan => loan.userId === userId);
    
    res.json({
        total: userLoans.length,
        loans: userLoans
    });
});

// Approve loan (Admin only)
app.put('/api/loan/:id/approve', (req, res) => {
    const loanId = parseInt(req.params.id);
    const loan = loanRequests.find(l => l.id === loanId);
    
    if (!loan) {
        return res.status(404).json({ error: "Loan request not found" });
    }
    
    if (loan.status !== "pending") {
        return res.status(400).json({ error: "Loan already processed" });
    }
    
    loan.status = "approved";
    loan.approvedDate = new Date().toISOString();
    
    // Add loan amount to user's balance
    const user = users.find(u => u.id === loan.userId);
    if (user) {
        user.balance_usd += loan.amount;
    }
    
    res.json({
        success: true,
        message: `Loan of $${loan.amount.toLocaleString()} approved for ${loan.name}`,
        loan: loan,
        newBalance: user ? user.balance_usd : null
    });
});

// Reject loan (Admin only)
app.put('/api/loan/:id/reject', (req, res) => {
    const loanId = parseInt(req.params.id);
    const { reason } = req.body;
    const loan = loanRequests.find(l => l.id === loanId);
    
    if (!loan) {
        return res.status(404).json({ error: "Loan request not found" });
    }
    
    if (loan.status !== "pending") {
        return res.status(400).json({ error: "Loan already processed" });
    }
    
    loan.status = "rejected";
    loan.rejectionReason = reason || "Not specified";
    loan.rejectedDate = new Date().toISOString();
    
    res.json({
        success: true,
        message: `Loan of $${loan.amount.toLocaleString()} rejected`,
        loan: loan
    });
});

// ============= TRANSACTIONS =============

// Make a transfer
app.post('/api/transfer', (req, res) => {
    const { fromUserId, toUserId, amount, currency, description } = req.body;
    
    const fromUser = users.find(u => u.id === fromUserId);
    const toUser = users.find(u => u.id === toUserId);
    
    if (!fromUser || !toUser) {
        return res.status(404).json({ error: "User not found" });
    }
    
    // Check sufficient balance
    if (currency === "USD" && fromUser.balance_usd < amount) {
        return res.status(400).json({ error: "Insufficient USD balance" });
    }
    if (currency === "BRC" && fromUser.balance_brc < amount) {
        return res.status(400).json({ error: "Insufficient BRC balance" });
    }
    
    // Process transfer
    if (currency === "USD") {
        fromUser.balance_usd -= amount;
        toUser.balance_usd += amount;
    } else if (currency === "BRC") {
        fromUser.balance_brc -= amount;
        toUser.balance_brc += amount;
    }
    
    // Record transaction
    const newTransaction = {
        id: transactions.length + 1,
        fromUserId: fromUserId,
        toUserId: toUserId,
        amount: amount,
        currency: currency,
        description: description || "Transfer",
        status: "completed",
        date: new Date().toISOString()
    };
    
    transactions.push(newTransaction);
    
    res.json({
        success: true,
        message: `Transfer of ${amount} ${currency} completed successfully`,
        transaction: newTransaction,
        newBalance: currency === "USD" ? fromUser.balance_usd : fromUser.balance_brc
    });
});

// Get user transactions
app.get('/api/user/:id/transactions', (req, res) => {
    const userId = parseInt(req.params.id);
    const { limit = 50, type } = req.query;
    
    let userTransactions = transactions.filter(t => 
        t.fromUserId === userId || t.toUserId === userId
    );
    
    // Filter by type if specified
    if (type === "sent") {
        userTransactions = userTransactions.filter(t => t.fromUserId === userId);
    } else if (type === "received") {
        userTransactions = userTransactions.filter(t => t.toUserId === userId);
    }
    
    // Limit results
    userTransactions = userTransactions.slice(0, parseInt(limit));
    
    res.json({
        total: userTransactions.length,
        transactions: userTransactions
    });
});

// ============= CARD MANAGEMENT =============

// Get user cards
app.get('/api/user/:id/cards', (req, res) => {
    const userId = parseInt(req.params.id);
    const userCards = cards.filter(c => c.userId === userId);
    
    res.json({
        total: userCards.length,
        cards: userCards
    });
});

// Create virtual card
app.post('/api/card/create', (req, res) => {
    const { userId, type } = req.body;
    
    const newCard = {
        id: "card" + (cards.length + 1),
        userId: userId,
        last4: Math.floor(1000 + Math.random() * 9000).toString(),
        type: type || "virtual",
        limit: 5000,
        status: "active",
        createdAt: new Date().toISOString()
    };
    
    cards.push(newCard);
    
    res.json({
        success: true,
        message: "Virtual card created successfully",
        card: newCard
    });
});

// Block card
app.put('/api/card/:id/block', (req, res) => {
    const cardId = req.params.id;
    const card = cards.find(c => c.id === cardId);
    
    if (!card) {
        return res.status(404).json({ error: "Card not found" });
    }
    
    card.status = "blocked";
    
    res.json({
        success: true,
        message: "Card blocked successfully"
    });
});

// ============= DASHBOARD STATISTICS (Admin) =============

// Get dashboard statistics
app.get('/api/stats', (req, res) => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === "active").length;
    const totalBalance = users.reduce((sum, u) => sum + u.balance_usd, 0);
    const totalBRC = users.reduce((sum, u) => sum + u.balance_brc, 0);
    const pendingKYCs = users.filter(u => u.kyc === "pending").length;
    const pendingLoans = loanRequests.filter(l => l.status === "pending").length;
    const approvedLoans = loanRequests.filter(l => l.status === "approved").length;
    const totalLoansAmount = loanRequests
        .filter(l => l.status === "approved")
        .reduce((sum, l) => sum + l.amount, 0);
    
    res.json({
        users: {
            total: totalUsers,
            active: activeUsers,
            pendingKYC: pendingKYCs
        },
        finances: {
            totalBalanceUSD: totalBalance,
            totalBalanceBRC: totalBRC,
            brcToUSD: 10.42 // Current BRADICOIN price
        },
        loans: {
            pending: pendingLoans,
            approved: approvedLoans,
            totalAmount: totalLoansAmount
        },
        timestamp: new Date().toISOString()
    });
});

// ============= BRADICOIN PRICE =============

// Get BRADICOIN current price
app.get('/api/bradicoin/price', (req, res) => {
    // Simulate small price fluctuations
    const basePrice = 10.42;
    const variation = (Math.random() - 0.5) * 0.2;
    const currentPrice = basePrice + variation;
    
    res.json({
        symbol: "BRC",
        name: "BRADICOIN",
        price: currentPrice.toFixed(2),
        change24h: ((variation / basePrice) * 100).toFixed(2),
        lastUpdate: new Date().toISOString()
    });
});

// ============= START SERVER =============
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════╗
    ║                                                  ║
    ║   🏦 ZENTRONIX BANK API - RUNNING 🏦            ║
    ║                                                  ║
    ║   Server: http://localhost:${PORT}                ║
    ║   Environment: ${process.env.NODE_ENV || 'development'}         ║
    ║                                                  ║
    ║   📡 Available Endpoints:                       ║
    ║   POST   /api/login                             ║
    ║   POST   /api/admin/login                       ║
    ║   GET    /api/users                             ║
    ║   GET    /api/user/:id                          ║
    ║   POST   /api/user/register                     ║
    ║   POST   /api/loan/request                      ║
    ║   GET    /api/loans/pending                     ║
    ║   PUT    /api/loan/:id/approve                  ║
    ║   PUT    /api/loan/:id/reject                   ║
    ║   POST   /api/transfer                          ║
    ║   GET    /api/user/:id/transactions             ║
    ║   GET    /api/stats                             ║
    ║   GET    /api/bradicoin/price                   ║
    ║                                                  ║
    ╚══════════════════════════════════════════════════╝
    `);
});

// Export for testing
module.exports = app;
