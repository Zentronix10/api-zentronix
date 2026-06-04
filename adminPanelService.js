// adminPanelService.js - Complete Administrative Panel System
// Features: User management, KYC review, Transaction monitoring, System settings, Analytics dashboard

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class AdminPanelService {
    constructor() {
        this.admins = [];
        this.adminSessions = [];
        this.adminLogs = [];
        this.systemSettings = this.initializeSystemSettings();
        this.permissions = this.initializePermissions();
        
        // Initialize default admin
        this.initializeDefaultAdmin();
    }

    // ============= 1. INITIALIZE DEFAULT ADMIN =============
    initializeDefaultAdmin() {
        const defaultAdmin = {
            id: uuidv4(),
            username: 'admin',
            email: 'admin@zentronix.com',
            password: bcrypt.hashSync('Zentronix@Admin2025', 10),
            fullName: 'Super Administrator',
            role: 'super_admin',
            permissions: ['all'],
            status: 'active',
            lastLogin: null,
            lastIP: null,
            createdAt: new Date().toISOString(),
            twoFactorEnabled: false,
            twoFactorSecret: null
        };
        
        this.admins.push(defaultAdmin);
    }

    // ============= 2. INITIALIZE PERMISSIONS =============
    initializePermissions() {
        return {
            super_admin: [
                'all'
            ],
            admin: [
                'users.view',
                'users.create',
                'users.edit',
                'users.delete',
                'users.block',
                'kyc.view',
                'kyc.review',
                'kyc.approve',
                'kyc.reject',
                'transactions.view',
                'transactions.reverse',
                'loans.view',
                'loans.approve',
                'loans.reject',
                'cards.view',
                'cards.issue',
                'cards.block',
                'settings.view',
                'settings.edit',
                'reports.view',
                'reports.export',
                'alerts.view',
                'alerts.acknowledge',
                'logs.view'
            ],
            support: [
                'users.view',
                'kyc.view',
                'transactions.view',
                'loans.view',
                'cards.view',
                'alerts.view'
            ],
            compliance: [
                'users.view',
                'kyc.view',
                'kyc.review',
                'transactions.view',
                'loans.view',
                'reports.view',
                'alerts.view',
                'logs.view'
            ],
            auditor: [
                'users.view',
                'transactions.view',
                'loans.view',
                'reports.view',
                'logs.view'
            ]
        };
    }

    // ============= 3. INITIALIZE SYSTEM SETTINGS =============
    initializeSystemSettings() {
        return {
            general: {
                bankName: 'Zentronix Bank',
                bankLogo: '/images/logo.png',
                contactEmail: 'support@zentronix.com',
                supportPhone: '+1-888-123-4567',
                timezone: 'UTC',
                dateFormat: 'MM/DD/YYYY',
                language: 'en'
            },
            security: {
                sessionTimeout: 30, // minutes
                maxLoginAttempts: 5,
                lockoutDuration: 15, // minutes
                passwordExpiryDays: 90,
                twoFactorRequired: false,
                    ipWhitelistEnabled: false,
                ipWhitelist: [],
                mfaMethods: ['authenticator', 'sms', 'email']
            },
            kyc: {
                requiredDocuments: ['passport', 'proofOfAddress'],
                autoApproveScore: 85,
                manualReviewThreshold: 60,
                documentExpiryMonths: 3,
                amlCheckEnabled: true,
                sanctionsCheckEnabled: true
            },
            transactions: {
                dailyLimitPersonal: 50000,
                dailyLimitCorporate: 250000,
                monthlyLimitPersonal: 250000,
                monthlyLimitCorporate: 1000000,
                cryptoLimitDaily: 25000,
                internationalTransferFee: 25,
                instantTransferFee: 5
            },
            loans: {
                minAmount: 1000,
                maxAmount: 500000,
                minTerm: 6,
                maxTerm: 60,
                baseInterestRate: 5.9,
                processingFee: 1.5,
                latePaymentFee: 25
            },
            cards: {
                virtualCardLimit: 5000,
                physicalCardLimit: 10000,
                cardIssuanceFee: 10,
                monthlyFee: 5,
                internationalFee: 1.5
            },
            notifications: {
                emailEnabled: true,
                smsEnabled: true,
                pushEnabled: true,
                alertChannels: ['email', 'sms', 'dashboard']
            },
            maintenance: {
                mode: false,
                message: 'System under maintenance. Please check back later.',
                scheduledMaintenance: []
            }
        };
    }

    // ============= 4. ADMIN LOGIN =============
    async adminLogin(username, password, ipAddress) {
        const admin = this.admins.find(a => a.username === username);
        
        if (!admin) {
            await this.logAdminAction(null, 'LOGIN_FAILED', { username, ip: ipAddress });
            return {
                success: false,
                error: 'Invalid credentials'
            };
        }
        
        if (admin.status !== 'active') {
            return {
                success: false,
                error: 'Account is locked. Please contact support.'
            };
        }
        
        const validPassword = bcrypt.compareSync(password, admin.password);
        if (!validPassword) {
            await this.logAdminAction(admin.id, 'LOGIN_FAILED', { ip: ipAddress });
            return {
                success: false,
                error: 'Invalid credentials'
            };
        }
        
        // Update last login
        admin.lastLogin = new Date().toISOString();
        admin.lastIP = ipAddress;
        
        // Create session
        const sessionToken = uuidv4();
        const session = {
            token: sessionToken,
            adminId: admin.id,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
            ipAddress: ipAddress
        };
        
        this.adminSessions.push(session);
        
        await this.logAdminAction(admin.id, 'LOGIN_SUCCESS', { ip: ipAddress });
        
        return {
            success: true,
            token: sessionToken,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                role: admin.role,
                permissions: this.permissions[admin.role]
            }
        };
    }

    // ============= 5. ADMIN LOGOUT =============
    async adminLogout(token) {
        const sessionIndex = this.adminSessions.findIndex(s => s.token === token);
        if (sessionIndex !== -1) {
            const session = this.adminSessions[sessionIndex];
            await this.logAdminAction(session.adminId, 'LOGOUT', {});
            this.adminSessions.splice(sessionIndex, 1);
        }
        
        return { success: true };
    }

    // ============= 6. VERIFY ADMIN SESSION =============
    async verifySession(token) {
        const session = this.adminSessions.find(s => s.token === token);
        
        if (!session) {
            return { valid: false, error: 'Invalid session' };
        }
        
        if (new Date(session.expiresAt) < new Date()) {
            this.adminSessions = this.adminSessions.filter(s => s.token !== token);
            return { valid: false, error: 'Session expired' };
        }
        
        const admin = this.admins.find(a => a.id === session.adminId);
        if (!admin || admin.status !== 'active') {
            return { valid: false, error: 'Account inactive' };
        }
        
        return { valid: true, admin: admin };
    }

    // ============= 7. GET ALL ADMIN USERS =============
    async getAdminUsers(currentAdminId, filters = {}) {
        let admins = this.admins.filter(a => a.id !== currentAdminId);
        
        if (filters.role) {
            admins = admins.filter(a => a.role === filters.role);
        }
        
        if (filters.status) {
            admins = admins.filter(a => a.status === filters.status);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            admins = admins.filter(a => 
                a.username.toLowerCase().includes(search) ||
                a.email.toLowerCase().includes(search) ||
                a.fullName.toLowerCase().includes(search)
            );
        }
        
        return {
            success: true,
            total: admins.length,
            admins: admins.map(a => ({
                id: a.id,
                username: a.username,
                email: a.email,
                fullName: a.fullName,
                role: a.role,
                status: a.status,
                lastLogin: a.lastLogin,
                createdAt: a.createdAt
            }))
        };
    }

    // ============= 8. CREATE ADMIN USER =============
    async createAdminUser(createdBy, adminData) {
        const { username, email, password, fullName, role } = adminData;
        
        // Check if username exists
        if (this.admins.find(a => a.username === username)) {
            return { success: false, error: 'Username already exists' };
        }
        
        // Check if email exists
        if (this.admins.find(a => a.email === email)) {
            return { success: false, error: 'Email already exists' };
        }
        
        const newAdmin = {
            id: uuidv4(),
            username,
            email,
            password: bcrypt.hashSync(password, 10),
            fullName,
            role: role || 'support',
            permissions: this.permissions[role] || this.permissions.support,
            status: 'active',
            lastLogin: null,
            lastIP: null,
            createdAt: new Date().toISOString(),
            createdBy: createdBy,
            twoFactorEnabled: false,
            twoFactorSecret: null
        };
        
        this.admins.push(newAdmin);
        
        await this.logAdminAction(createdBy, 'ADMIN_CREATED', {
            targetAdmin: newAdmin.id,
            username: username,
            role: role
        });
        
        return {
            success: true,
            message: 'Admin user created successfully',
            admin: {
                id: newAdmin.id,
                username: newAdmin.username,
                email: newAdmin.email,
                fullName: newAdmin.fullName,
                role: newAdmin.role
            }
        };
    }

    // ============= 9. UPDATE ADMIN USER =============
    async updateAdminUser(adminId, updateData) {
        const admin = this.admins.find(a => a.id === adminId);
        
        if (!admin) {
            return { success: false, error: 'Admin not found' };
        }
        
        if (updateData.fullName) admin.fullName = updateData.fullName;
        if (updateData.email) admin.email = updateData.email;
        if (updateData.role) {
            admin.role = updateData.role;
            admin.permissions = this.permissions[updateData.role];
        }
        if (updateData.status) admin.status = updateData.status;
        if (updateData.password) {
            admin.password = bcrypt.hashSync(updateData.password, 10);
        }
        
        await this.logAdminAction(updateData.updatedBy, 'ADMIN_UPDATED', {
            targetAdmin: adminId,
            updates: Object.keys(updateData)
        });
        
        return {
            success: true,
            message: 'Admin user updated successfully',
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                fullName: admin.fullName,
                role: admin.role,
                status: admin.status
            }
        };
    }

    // ============= 10. DELETE ADMIN USER =============
    async deleteAdminUser(adminId, deletedBy) {
        const adminIndex = this.admins.findIndex(a => a.id === adminId);
        
        if (adminIndex === -1) {
            return { success: false, error: 'Admin not found' };
        }
        
        const admin = this.admins[adminIndex];
        
        // Prevent deleting super admin
        if (admin.role === 'super_admin') {
            return { success: false, error: 'Cannot delete super admin' };
        }
        
        this.admins.splice(adminIndex, 1);
        
        await this.logAdminAction(deletedBy, 'ADMIN_DELETED', {
            targetAdmin: adminId,
            username: admin.username
        });
        
        return { success: true, message: 'Admin user deleted successfully' };
    }

    // ============= 11. GET DASHBOARD STATISTICS =============
    async getDashboardStatistics() {
        // In production, these would come from your database
        const statistics = {
            users: {
                total: 12450,
                active: 8920,
                newToday: 47,
                newThisWeek: 312,
                newThisMonth: 1245,
                kycPending: 156,
                kycApproved: 11890,
                kycRejected: 404
            },
            transactions: {
                total24h: 1245,
                volume24h: 1850000,
                total7d: 8750,
                volume7d: 12450000,
                pending: 23,
                failed: 12
            },
            loans: {
                totalActive: 342,
                totalAmount: 8750000,
                pendingApproval: 18,
                defaultRate: 1.8,
                avgAmount: 25580
            },
            cards: {
                totalIssued: 28900,
                activeCards: 24500,
                totalSpent: 3420000,
                virtualCards: 22100,
                physicalCards: 6800
            },
            crypto: {
                btcPrice: 67200,
                ethPrice: 3443,
                brcPrice: 10.42,
                dailyVolume: 850000
            },
            alerts: {
                critical: 3,
                high: 12,
                medium: 28,
                low: 56
            },
            timestamp: new Date().toISOString()
        };
        
        return {
            success: true,
            statistics: statistics
        };
    }

    // ============= 12. GET RECENT ACTIVITY =============
    async getRecentActivity(limit = 20) {
        const recentLogs = this.adminLogs.slice(-limit).reverse();
        
        return {
            success: true,
            total: recentLogs.length,
            activities: recentLogs
        };
    }

    // ============= 13. LOG ADMIN ACTION =============
    async logAdminAction(adminId, action, details) {
        const log = {
            id: uuidv4(),
            adminId: adminId,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            ipAddress: details.ip || null
        };
        
        this.adminLogs.push(log);
        
        // Keep only last 10,000 logs
        if (this.adminLogs.length > 10000) {
            this.adminLogs = this.adminLogs.slice(-10000);
        }
        
        return log;
    }

    // ============= 14. GET SYSTEM SETTINGS =============
    async getSystemSettings(category = null) {
        if (category && this.systemSettings[category]) {
            return {
                success: true,
                settings: this.systemSettings[category]
            };
        }
        
        return {
            success: true,
            settings: this.systemSettings
        };
    }

    // ============= 15. UPDATE SYSTEM SETTINGS =============
    async updateSystemSettings(category, settings, updatedBy) {
        if (!this.systemSettings[category]) {
            return { success: false, error: 'Invalid category' };
        }
        
        this.systemSettings[category] = {
            ...this.systemSettings[category],
            ...settings
        };
        
        await this.logAdminAction(updatedBy, 'SETTINGS_UPDATED', {
            category: category,
            updates: Object.keys(settings)
        });
        
        return {
            success: true,
            message: 'Settings updated successfully',
            settings: this.systemSettings[category]
        };
    }

    // ============= 16. GET AUDIT LOGS =============
    async getAuditLogs(filters = {}) {
        let logs = [...this.adminLogs];
        
        if (filters.adminId) {
            logs = logs.filter(l => l.adminId === filters.adminId);
        }
        
        if (filters.action) {
            logs = logs.filter(l => l.action === filters.action);
        }
        
        if (filters.startDate) {
            logs = logs.filter(l => new Date(l.timestamp) >= new Date(filters.startDate));
        }
        
        if (filters.endDate) {
            logs = logs.filter(l => new Date(l.timestamp) <= new Date(filters.endDate));
        }
        
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 50;
        const startIndex = (page - 1) * limit;
        
        return {
            success: true,
            total: logs.length,
            page: page,
            limit: limit,
            logs: logs.slice(startIndex, startIndex + limit)
        };
    }

    // ============= 17. GET SYSTEM HEALTH =============
    async getSystemHealth() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            components: {
                api: { status: 'up', responseTime: 45 },
                database: { status: 'up', latency: 12 },
                websocket: { status: 'up', connections: this.adminSessions.length },
                redis: { status: 'up', hitRate: 0.92 },
                blockchain: { status: 'up', lastBlock: 845234 }
            },
            metrics: {
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cpuUsage: [12, 8, 15, 10, 9]
            }
        };
        
        return {
            success: true,
            health: health
        };
    }

    // ============= 18. GET MAINTENANCE MODE STATUS =============
    async getMaintenanceStatus() {
        return {
            success: true,
            maintenance: this.systemSettings.maintenance
        };
    }

    // ============= 19. TOGGLE MAINTENANCE MODE =============
    async toggleMaintenanceMode(enabled, message, updatedBy) {
        this.systemSettings.maintenance.mode = enabled;
        if (message) {
            this.systemSettings.maintenance.message = message;
        }
        
        await this.logAdminAction(updatedBy, 'MAINTENANCE_TOGGLED', {
            enabled: enabled,
            message: message
        });
        
        return {
            success: true,
            message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
            maintenance: this.systemSettings.maintenance
        };
    }

    // ============= 20. GET PERMISSIONS LIST =============
    async getPermissionsList() {
        const allPermissions = [];
        
        for (const [role, permissions] of Object.entries(this.permissions)) {
            allPermissions.push({ role, permissions });
        }
        
        return {
            success: true,
            roles: Object.keys(this.permissions),
            permissions: allPermissions
        };
    }

    // ============= 21. CHECK ADMIN PERMISSION =============
    async checkPermission(adminId, requiredPermission) {
        const admin = this.admins.find(a => a.id === adminId);
        
        if (!admin) {
            return false;
        }
        
        if (admin.role === 'super_admin') {
            return true;
        }
        
        return admin.permissions.includes(requiredPermission) || admin.permissions.includes('all');
    }
}

module.exports = new AdminPanelService();
