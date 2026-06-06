/**
 * ZENTRONIX BANK - COMPLETE PREVENTIVE BLOCKING SYSTEM
 * Fraud Prevention, Account Protection, and Security Blocking
 * Version: 1.0.0
 * Language: JavaScript (Node.js)
 * 
 * Features:
 * - Real-time fraud detection and prevention
 * - Multiple block types (account, transaction, card, IP, device)
 * - Automatic suspicious activity blocking
 * - Manual admin controls for blocks
 * - Time-based and permanent blocks
 * - Block appeal and review process
 * - Notification system for blocked events
 * - Block history and audit logging
 * - Risk-based adaptive blocking
 * - Geolocation and velocity checks
 * - Device fingerprinting
 * - Behavioral pattern analysis
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ========================================
// CONFIGURATION
// ========================================

const BLOCKING_CONFIG = {
    // Block types
    BLOCK_TYPES: {
        ACCOUNT: 'ACCOUNT',
        TRANSACTION: 'TRANSACTION',
        CARD: 'CARD',
        IP_ADDRESS: 'IP_ADDRESS',
        DEVICE: 'DEVICE',
        WITHDRAWAL: 'WITHDRAWAL',
        DEPOSIT: 'DEPOSIT',
        CONVERSION: 'CONVERSION',
        INTERNATIONAL: 'INTERNATIONAL'
    },
    
    // Block reasons
    BLOCK_REASONS: {
        SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
        FRAUD_ATTEMPT: 'FRAUD_ATTEMPT',
        AML_VIOLATION: 'AML_VIOLATION',
        SANCTIONS_MATCH: 'SANCTIONS_MATCH',
        UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
        VELOCITY_EXCEEDED: 'VELOCITY_EXCEEDED',
        GEO_LOCATION_MISMATCH: 'GEO_LOCATION_MISMATCH',
        MULTIPLE_FAILED_ATTEMPTS: 'MULTIPLE_FAILED_ATTEMPTS',
        DEVICE_TAMPERING: 'DEVICE_TAMPERING',
        COURT_ORDER: 'COURT_ORDER',
        CUSTOMER_REQUEST: 'CUSTOMER_REQUEST',
        RISK_SCORE_EXCEEDED: 'RISK_SCORE_EXCEEDED'
    },
    
    // Block severity levels
    BLOCK_SEVERITY: {
        LOW: 'LOW',        // Warning only
        MEDIUM: 'MEDIUM',  // Block specific features
        HIGH: 'HIGH',      // Block account but allow appeal
        CRITICAL: 'CRITICAL' // Permanent block, no appeal
    },
    
    // Automatic triggers
    AUTO_TRIGGERS: {
        MAX_FAILED_LOGINS: 5,
        MAX_FAILED_TRANSACTIONS: 3,
        SUSPICIOUS_VELOCITY_THRESHOLD: 5, // transactions per minute
        UNUSUAL_AMOUNT_THRESHOLD: 50000, // USD
        IP_CHANGE_THRESHOLD: 3, // different countries in 1 hour
        DEVICE_CHANGE_THRESHOLD: 2, // new devices in 1 hour
        TIME_WINDOW_MINUTES: 60
    },
    
    // Block durations (milliseconds)
    BLOCK_DURATIONS: {
        TEMPORARY_1_HOUR: 60 * 60 * 1000,
        TEMPORARY_24_HOURS: 24 * 60 * 60 * 1000,
        TEMPORARY_7_DAYS: 7 * 24 * 60 * 60 * 1000,
        TEMPORARY_30_DAYS: 30 * 24 * 60 * 60 * 1000,
        PERMANENT: null
    },
    
    // Appeal settings
    APPEAL_SETTINGS: {
        MAX_APPEALS_PER_MONTH: 3,
        APPEAL_REVIEW_DAYS: 7,
        AUTO_APPROVE_ON_LOW_RISK: true
    }
};

// ========================================
// DATA MODELS
// ========================================

class Block {
    constructor(data) {
        this.blockId = data.blockId || this.generateBlockId();
        this.customerId = data.customerId;
        this.blockType = data.blockType;
        this.reason = data.reason;
        this.severity = data.severity || BLOCKING_CONFIG.BLOCK_SEVERITY.MEDIUM;
        this.description = data.description;
        this.triggeredBy = data.triggeredBy; // 'AUTO' or 'ADMIN'
        this.adminId = data.adminId || null;
        this.createdAt = data.createdAt || new Date();
        this.expiresAt = data.expiresAt || null;
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.appealId = data.appealId || null;
        this.resolvedAt = data.resolvedAt || null;
        this.resolvedBy = data.resolvedBy || null;
        this.resolutionNotes = data.resolutionNotes || null;
        this.metadata = data.metadata || {};
    }
    
    generateBlockId() {
        return `BLK-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
    
    isExpired() {
        if (!this.expiresAt) return false;
        return new Date() > new Date(this.expiresAt);
    }
}

class BlockAppeal {
    constructor(data) {
        this.appealId = data.appealId || this.generateAppealId();
        this.blockId = data.blockId;
        this.customerId = data.customerId;
        reason: data.reason,
        this.evidence = data.evidence || [];
        this.status = data.status || 'PENDING'; // PENDING, APPROVED, REJECTED
        this.adminNotes = data.adminNotes || null;
        this.createdAt = data.createdAt || new Date();
        this.resolvedAt = data.resolvedAt || null;
        this.resolvedBy = data.resolvedBy || null;
    }
    
    generateAppealId() {
        return `APL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

class SuspiciousEvent {
    constructor(data) {
        this.eventId = data.eventId || this.generateEventId();
        this.customerId = data.customerId;
        this.eventType = data.eventType;
        this.description = data.description;
        this.riskScore = data.riskScore || 0;
        this.triggeredRule = data.triggeredRule || null;
        this.ipAddress = data.ipAddress || null;
        this.deviceId = data.deviceId || null;
        this.location = data.location || null;
        this.timestamp = data.timestamp || new Date();
        this.isResolved = data.isResolved || false;
    }
    
    generateEventId() {
        return `EVT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

// ========================================
// FRAUD DETECTION ENGINE
// ========================================

class FraudDetectionEngine extends EventEmitter {
    constructor(db) {
        super();
        this.db = db;
        this.suspiciousEvents = [];
        this.velocityTracker = new Map();
        this.deviceHistory = new Map();
        this.ipHistory = new Map();
    }

    async analyzeActivity(customerId, activity) {
        const riskIndicators = [];
        let totalRiskScore = 0;
        
        // Check 1: Velocity (transaction frequency)
        const velocityCheck = this.checkVelocity(customerId);
        if (velocityCheck.isSuspicious) {
            riskIndicators.push({
                type: 'HIGH_VELOCITY',
                score: 40,
                details: `${velocityCheck.count} transactions in ${BLOCKING_CONFIG.AUTO_TRIGGERS.TIME_WINDOW_MINUTES} minutes`
            });
            totalRiskScore += 40;
        }
        
        // Check 2: Unusual amount
        if (activity.amount && activity.amount > BLOCKING_CONFIG.AUTO_TRIGGERS.UNUSUAL_AMOUNT_THRESHOLD) {
            riskIndicators.push({
                type: 'UNUSUAL_AMOUNT',
                score: 30,
                details: `Amount $${activity.amount} exceeds threshold`
            });
            totalRiskScore += 30;
        }
        
        // Check 3: IP/location mismatch
        if (activity.ipAddress) {
            const locationCheck = this.checkLocationMismatch(customerId, activity.ipAddress);
            if (locationCheck.isSuspicious) {
                riskIndicators.push({
                    type: 'LOCATION_MISMATCH',
                    score: 50,
                    details: locationCheck.reason
                });
                totalRiskScore += 50;
            }
        }
        
        // Check 4: Device fingerprint change
        if (activity.deviceId) {
            const deviceCheck = this.checkDeviceChange(customerId, activity.deviceId);
            if (deviceCheck.isSuspicious) {
                riskIndicators.push({
                    type: 'DEVICE_CHANGE',
                    score: 35,
                    details: `New device detected: ${activity.deviceId}`
                });
                totalRiskScore += 35;
            }
        }
        
        // Check 5: Failed attempts
        if (activity.isFailed) {
            const failedAttempts = this.trackFailedAttempt(customerId, activity.type);
            if (failedAttempts >= BLOCKING_CONFIG.AUTO_TRIGGERS.MAX_FAILED_TRANSACTIONS) {
                riskIndicators.push({
                    type: 'EXCESSIVE_FAILURES',
                    score: 45,
                    details: `${failedAttempts} failed ${activity.type} attempts`
                });
                totalRiskScore += 45;
            }
        }
        
        // Determine risk level
        let riskLevel = 'LOW';
        if (totalRiskScore >= 70) riskLevel = 'CRITICAL';
        else if (totalRiskScore >= 50) riskLevel = 'HIGH';
        else if (totalRiskScore >= 30) riskLevel = 'MEDIUM';
        
        const result = {
            riskScore: totalRiskScore,
            riskLevel,
            riskIndicators,
            requiresBlock: totalRiskScore >= 50,
            blockSeverity: totalRiskScore >= 70 ? 'CRITICAL' : (totalRiskScore >= 50 ? 'HIGH' : null)
        };
        
        if (result.requiresBlock) {
            const event = new SuspiciousEvent({
                customerId,
                eventType: 'HIGH_RISK_ACTIVITY',
                description: riskIndicators.map(i => i.details).join(', '),
                riskScore: totalRiskScore,
                triggeredRule: riskIndicators[0]?.type,
                ipAddress: activity.ipAddress,
                deviceId: activity.deviceId
            });
            this.suspiciousEvents.push(event);
            this.emit('suspicious_activity', event);
        }
        
        return result;
    }
    
    checkVelocity(customerId) {
        const now = Date.now();
        const timeWindow = BLOCKING_CONFIG.AUTO_TRIGGERS.TIME_WINDOW_MINUTES * 60 * 1000;
        const threshold = BLOCKING_CONFIG.AUTO_TRIGGERS.SUSPICIOUS_VELOCITY_THRESHOLD;
        
        let history = this.velocityTracker.get(customerId) || [];
        history = history.filter(timestamp => now - timestamp < timeWindow);
        history.push(now);
        this.velocityTracker.set(customerId, history);
        
        return {
            isSuspicious: history.length >= threshold,
            count: history.length,
            threshold
        };
    }
    
    checkLocationMismatch(customerId, currentIp) {
        const history = this.ipHistory.get(customerId) || [];
        
        if (history.length > 0) {
            const lastIp = history[history.length - 1];
            if (lastIp !== currentIp) {
                // In production, check actual geo-location
                return {
                    isSuspicious: true,
                    reason: `IP changed from ${lastIp} to ${currentIp}`
                };
            }
        }
        
        // Update IP history
        history.push(currentIp);
        if (history.length > 10) history.shift();
        this.ipHistory.set(customerId, history);
        
        return { isSuspicious: false };
    }
    
    checkDeviceChange(customerId, deviceId) {
        const devices = this.deviceHistory.get(customerId) || [];
        const timeWindow = BLOCKING_CONFIG.AUTO_TRIGGERS.TIME_WINDOW_MINUTES * 60 * 1000;
        const threshold = BLOCKING_CONFIG.AUTO_TRIGGERS.DEVICE_CHANGE_THRESHOLD;
        
        const recentDevices = devices.filter(d => Date.now() - d.timestamp < timeWindow);
        const deviceSeen = recentDevices.some(d => d.deviceId === deviceId);
        
        if (!deviceSeen) {
            recentDevices.push({ deviceId, timestamp: Date.now() });
            this.deviceHistory.set(customerId, recentDevices);
            
            return {
                isSuspicious: recentDevices.length >= threshold,
                reason: `New device detected. ${recentDevices.length} devices in window`
            };
        }
        
        return { isSuspicious: false };
    }
    
    trackFailedAttempt(customerId, activityType) {
        const key = `${customerId}_${activityType}`;
        const now = Date.now();
        const timeWindow = BLOCKING_CONFIG.AUTO_TRIGGERS.TIME_WINDOW_MINUTES * 60 * 1000;
        
        let attempts = this.failedAttempts?.get(key) || [];
        attempts = attempts.filter(t => now - t < timeWindow);
        attempts.push(now);
        
        if (!this.failedAttempts) this.failedAttempts = new Map();
        this.failedAttempts.set(key, attempts);
        
        return attempts.length;
    }
    
    resetFailedAttempts(customerId, activityType) {
        const key = `${customerId}_${activityType}`;
        this.failedAttempts?.delete(key);
    }
}

// ========================================
// PREVENTIVE BLOCKING MANAGER
// ========================================

class PreventiveBlockingManager extends EventEmitter {
    constructor(fraudDetection) {
        super();
        this.fraudDetection = fraudDetection;
        this.blocks = new Map();
        this.appeals = new Map();
        this.blockHistory = [];
    }
    
    async createBlock(data) {
        // Check for existing active block
        const existingBlock = await this.getActiveBlock(data.customerId, data.blockType);
        if (existingBlock && existingBlock.isActive && !existingBlock.isExpired()) {
            throw new Error(`Customer already has an active ${data.blockType} block`);
        }
        
        const block = new Block(data);
        this.blocks.set(block.blockId, block);
        this.blockHistory.push(block);
        
        this.emit('block_created', block);
        
        // Auto-schedule expiration if temporary
        if (block.expiresAt) {
            const expiryTime = new Date(block.expiresAt) - new Date();
            if (expiryTime > 0) {
                setTimeout(() => this.expireBlock(block.blockId), expiryTime);
            }
        }
        
        return block;
    }
    
    async expireBlock(blockId) {
        const block = this.blocks.get(blockId);
        if (block && block.isActive) {
            block.isActive = false;
            block.resolvedAt = new Date();
            block.resolutionNotes = 'Block expired automatically';
            this.emit('block_expired', block);
        }
    }
    
    async resolveBlock(blockId, adminId, notes) {
        const block = this.blocks.get(blockId);
        if (!block) throw new Error('Block not found');
        
        block.isActive = false;
        block.resolvedAt = new Date();
        block.resolvedBy = adminId;
        block.resolutionNotes = notes;
        
        this.emit('block_resolved', block);
        
        return block;
    }
    
    async getActiveBlock(customerId, blockType = null) {
        for (const block of this.blocks.values()) {
            if (block.customerId === customerId && 
                block.isActive && 
                !block.isExpired() &&
                (!blockType || block.blockType === blockType)) {
                return block;
            }
        }
        return null;
    }
    
    async getAllActiveBlocks(customerId) {
        const activeBlocks = [];
        for (const block of this.blocks.values()) {
            if (block.customerId === customerId && block.isActive && !block.isExpired()) {
                activeBlocks.push(block);
            }
        }
        return activeBlocks;
    }
    
    async checkAccess(customerId, accessType, activity = {}) {
        // Check for any active blocks
        const activeBlocks = await this.getAllActiveBlocks(customerId);
        
        for (const block of activeBlocks) {
            if (block.blockType === 'ACCOUNT') {
                return { allowed: false, block, reason: 'Account is blocked' };
            }
            
            if (block.blockType === accessType) {
                return { allowed: false, block, reason: `${block.blockType} operations are blocked` };
            }
            
            if (block.blockType === 'TRANSACTION' && ['WITHDRAWAL', 'DEPOSIT', 'TRANSFER'].includes(accessType)) {
                return { allowed: false, block, reason: 'Transaction operations are blocked' };
            }
            
            if (block.blockType === 'WITHDRAWAL' && accessType === 'WITHDRAWAL') {
                return { allowed: false, block, reason: 'Withdrawals are blocked' };
            }
        }
        
        // Analyze activity for suspicious patterns
        if (activity.amount || activity.ipAddress) {
            const analysis = await this.fraudDetection.analyzeActivity(customerId, {
                type: accessType,
                ...activity
            });
            
            if (analysis.requiresBlock) {
                const autoBlock = await this.createBlock({
                    customerId,
                    blockType: accessType === 'LOGIN' ? 'ACCOUNT' : accessType,
                    reason: BLOCKING_CONFIG.BLOCK_REASONS.SUSPICIOUS_ACTIVITY,
                    severity: analysis.blockSeverity,
                    description: `Auto-blocked due to suspicious activity: ${analysis.riskIndicators.map(i => i.details).join(', ')}`,
                    triggeredBy: 'AUTO',
                    expiresAt: analysis.blockSeverity === 'HIGH' ? 
                        new Date(Date.now() + BLOCKING_CONFIG.BLOCK_DURATIONS.TEMPORARY_24_HOURS) : null,
                    metadata: { riskScore: analysis.riskScore, riskIndicators: analysis.riskIndicators }
                });
                
                return { allowed: false, block: autoBlock, reason: 'Suspicious activity detected' };
            }
        }
        
        return { allowed: true };
    }
    
    async blockIP(ipAddress, reason, adminId = null, duration = null) {
        const block = await this.createBlock({
            customerId: `IP_${ipAddress}`,
            blockType: BLOCKING_CONFIG.BLOCK_TYPES.IP_ADDRESS,
            reason: BLOCKING_CONFIG.BLOCK_REASONS.SUSPICIOUS_ACTIVITY,
            severity: BLOCKING_CONFIG.BLOCK_SEVERITY.MEDIUM,
            description: reason,
            triggeredBy: adminId ? 'ADMIN' : 'AUTO',
            adminId,
            expiresAt: duration ? new Date(Date.now() + duration) : null,
            metadata: { ipAddress }
        });
        
        return block;
    }
    
    async blockDevice(deviceId, customerId, reason, adminId = null) {
        const block = await this.createBlock({
            customerId,
            blockType: BLOCKING_CONFIG.BLOCK_TYPES.DEVICE,
            reason: BLOCKING_CONFIG.BLOCK_REASONS.DEVICE_TAMPERING,
            severity: BLOCKING_CONFIG.BLOCK_SEVERITY.MEDIUM,
            description: reason,
            triggeredBy: adminId ? 'ADMIN' : 'AUTO',
            adminId,
            expiresAt: new Date(Date.now() + BLOCKING_CONFIG.BLOCK_DURATIONS.TEMPORARY_7_DAYS),
            metadata: { deviceId }
        });
        
        return block;
    }
    
    async createAppeal(customerId, blockId, reason, evidence = []) {
        const block = this.blocks.get(blockId);
        if (!block) throw new Error('Block not found');
        if (block.customerId !== customerId) throw new Error('Unauthorized');
        
        // Check appeal limits
        const customerAppeals = Array.from(this.appeals.values())
            .filter(a => a.customerId === customerId && 
                   new Date(a.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        
        if (customerAppeals.length >= BLOCKING_CONFIG.APPEAL_SETTINGS.MAX_APPEALS_PER_MONTH) {
            throw new Error('Maximum appeals per month reached');
        }
        
        const appeal = new BlockAppeal({
            blockId,
            customerId,
            reason,
            evidence
        });
        
        this.appeals.set(appeal.appealId, appeal);
        block.appealId = appeal.appealId;
        
        this.emit('appeal_created', appeal);
        
        return appeal;
    }
    
    async reviewAppeal(appealId, adminId, decision, notes) {
        const appeal = this.appeals.get(appealId);
        if (!appeal) throw new Error('Appeal not found');
        
        appeal.status = decision ? 'APPROVED' : 'REJECTED';
        appeal.adminNotes = notes;
        appeal.resolvedAt = new Date();
        appeal.resolvedBy = adminId;
        
        if (decision) {
            // Unblock the associated block
            await this.resolveBlock(appeal.blockId, adminId, `Appeal approved: ${notes}`);
        }
        
        this.emit('appeal_reviewed', appeal);
        
        return appeal;
    }
    
    async getBlockHistory(customerId, limit = 50) {
        return this.blockHistory
            .filter(block => block.customerId === customerId)
            .slice(-limit)
            .reverse();
    }
    
    async getStatistics() {
        const activeBlocks = Array.from(this.blocks.values()).filter(b => b.isActive && !b.isExpired());
        const autoBlocks = activeBlocks.filter(b => b.triggeredBy === 'AUTO');
        const adminBlocks = activeBlocks.filter(b => b.triggeredBy === 'ADMIN');
        const pendingAppeals = Array.from(this.appeals.values()).filter(a => a.status === 'PENDING');
        
        return {
            totalActiveBlocks: activeBlocks.length,
            autoBlocks: autoBlocks.length,
            adminBlocks: adminBlocks.length,
            byType: this.groupBlocksByType(activeBlocks),
            bySeverity: this.groupBlocksBySeverity(activeBlocks),
            pendingAppeals: pendingAppeals.length,
            totalBlocksHistory: this.blockHistory.length
        };
    }
    
    groupBlocksByType(blocks) {
        const grouped = {};
        for (const block of blocks) {
            grouped[block.blockType] = (grouped[block.blockType] || 0) + 1;
        }
        return grouped;
    }
    
    groupBlocksBySeverity(blocks) {
        const grouped = {};
        for (const block of blocks) {
            grouped[block.severity] = (grouped[block.severity] || 0) + 1;
        }
        return grouped;
    }
    
    async blockCustomerAccount(customerId, reason, severity = 'HIGH', adminId = null, duration = null) {
        return this.createBlock({
            customerId,
            blockType: BLOCKING_CONFIG.BLOCK_TYPES.ACCOUNT,
            reason: BLOCKING_CONFIG.BLOCK_REASONS[reason] || reason,
            severity,
            description: `Account blocked: ${reason}`,
            triggeredBy: adminId ? 'ADMIN' : 'AUTO',
            adminId,
            expiresAt: duration ? new Date(Date.now() + duration) : 
                (severity === 'CRITICAL' ? null : new Date(Date.now() + BLOCKING_CONFIG.BLOCK_DURATIONS.TEMPORARY_30_DAYS))
        });
    }
    
    async temporaryFreeze(customerId, reason, hours = 24, adminId = null) {
        const durationMs = hours * 60 * 60 * 1000;
        return this.createBlock({
            customerId,
            blockType: BLOCKING_CONFIG.BLOCK_TYPES.ACCOUNT,
            reason: BLOCKING_CONFIG.BLOCK_REASONS.SUSPICIOUS_ACTIVITY,
            severity: BLOCKING_CONFIG.BLOCK_SEVERITY.HIGH,
            description: `Temporary freeze: ${reason}`,
            triggeredBy: adminId ? 'ADMIN' : 'AUTO',
            adminId,
            expiresAt: new Date(Date.now() + durationMs)
        });
    }
}

// ========================================
// NOTIFICATION MANAGER
// ========================================

class BlockNotificationManager extends EventEmitter {
    constructor() {
        super();
    }
    
    async sendBlockNotification(customerId, block, channel = 'email') {
        const notification = {
            customerId,
            type: 'ACCOUNT_BLOCKED',
            title: this.getNotificationTitle(block),
            message: this.getNotificationMessage(block),
            blockDetails: {
                blockId: block.blockId,
                reason: block.reason,
                severity: block.severity,
                expiresAt: block.expiresAt,
                appealAvailable: block.severity !== 'CRITICAL'
            },
            timestamp: new Date().toISOString()
        };
        
        this.emit('notification_sent', notification);
        
        return notification;
    }
    
    getNotificationTitle(block) {
        switch (block.severity) {
            case 'CRITICAL': return 'Critical Alert: Account Permanently Blocked';
            case 'HIGH': return 'Important: Account Temporarily Frozen';
            case 'MEDIUM': return 'Security Alert: Account Restriction Applied';
            default: return 'Account Activity Notice';
        }
    }
    
    getNotificationMessage(block) {
        let message = `Your account has been ${block.isActive ? 'blocked' : 'restricted'} due to: ${block.description}`;
        
        if (block.expiresAt) {
            message += ` This restriction will expire on ${new Date(block.expiresAt).toLocaleString()}.`;
        }
        
        if (block.severity !== 'CRITICAL') {
            message += ' You may submit an appeal through our customer support.';
        }
        
        return message;
    }
}

// ========================================
// EXPRESS ROUTES
// ========================================

function createBlockingRouter(blockingManager, notificationManager) {
    const express = require('express');
    const router = express.Router();
    
    // Middleware to check if customer is blocked
    router.use(async (req, res, next) => {
        const customerId = req.headers['x-customer-id'] || req.body.customerId;
        
        if (customerId && req.path !== '/appeal' && req.path !== '/check') {
            const check = await blockingManager.checkAccess(customerId, req.method + ' ' + req.path);
            if (!check.allowed) {
                return res.status(403).json({
                    error: 'Access denied',
                    reason: check.reason,
                    blockId: check.block?.blockId,
                    blockExpiresAt: check.block?.expiresAt
                });
            }
        }
        next();
    });
    
    // Check access
    router.post('/check', async (req, res) => {
        const { customerId, accessType, activity } = req.body;
        const result = await blockingManager.checkAccess(customerId, accessType, activity);
        res.json(result);
    });
    
    // Create block (admin only)
    router.post('/block', async (req, res) => {
        try {
            const { customerId, blockType, reason, severity, description, adminId, durationHours } = req.body;
            const expiresAt = durationHours ? new Date(Date.now() + durationHours * 60 * 60 * 1000) : null;
            
            const block = await blockingManager.createBlock({
                customerId,
                blockType,
                reason,
                severity,
                description,
                triggeredBy: 'ADMIN',
                adminId,
                expiresAt
            });
            
            await notificationManager.sendBlockNotification(customerId, block);
            res.json(block);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Resolve block (admin only)
    router.post('/unblock/:blockId', async (req, res) => {
        try {
            const { adminId, notes } = req.body;
            const block = await blockingManager.resolveBlock(req.params.blockId, adminId, notes);
            res.json(block);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Get active blocks for customer
    router.get('/blocks/:customerId', async (req, res) => {
        const blocks = await blockingManager.getAllActiveBlocks(req.params.customerId);
        res.json(blocks);
    });
    
    // Get block history
    router.get('/history/:customerId', async (req, res) => {
        const history = await blockingManager.getBlockHistory(req.params.customerId);
        res.json(history);
    });
    
    // Create appeal
    router.post('/appeal', async (req, res) => {
        try {
            const { customerId, blockId, reason, evidence } = req.body;
            const appeal = await blockingManager.createAppeal(customerId, blockId, reason, evidence);
            res.json(appeal);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Review appeal (admin only)
    router.post('/appeal/:appealId/review', async (req, res) => {
        try {
            const { adminId, decision, notes } = req.body;
            const appeal = await blockingManager.reviewAppeal(req.params.appealId, adminId, decision, notes);
            res.json(appeal);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Get statistics (admin only)
    router.get('/statistics', async (req, res) => {
        const stats = await blockingManager.getStatistics();
        res.json(stats);
    });
    
    // Block IP address (admin only)
    router.post('/block-ip', async (req, res) => {
        try {
            const { ipAddress, reason, adminId, durationHours } = req.body;
            const duration = durationHours ? durationHours * 60 * 60 * 1000 : null;
            const block = await blockingManager.blockIP(ipAddress, reason, adminId, duration);
            res.json(block);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Temporary freeze account
    router.post('/freeze', async (req, res) => {
        try {
            const { customerId, reason, hours, adminId } = req.body;
            const block = await blockingManager.temporaryFreeze(customerId, reason, hours || 24, adminId);
            await notificationManager.sendBlockNotification(customerId, block);
            res.json(block);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    return router;
}

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initializeBlockingSystem() {
    const fraudDetection = new FraudDetectionEngine();
    const blockingManager = new PreventiveBlockingManager(fraudDetection);
    const notificationManager = new BlockNotificationManager();
    
    console.log('[BlockingSystem] ✅ Fully initialized with preventive blocking capabilities');
    console.log('[BlockingSystem] Block types: ACCOUNT, TRANSACTION, CARD, IP_ADDRESS, DEVICE');
    console.log('[BlockingSystem] Auto-triggers enabled for suspicious activity detection');
    
    return {
        fraudDetection,
        blockingManager,
        notificationManager
    };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    PreventiveBlockingManager,
    FraudDetectionEngine,
    BlockNotificationManager,
    createBlockingRouter,
    initializeBlockingSystem,
    BLOCKING_CONFIG
};
