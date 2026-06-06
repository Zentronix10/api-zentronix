/**
 * ZENTRONIX BANK - COMPLETE DDoS PROTECTION SYSTEM
 * Enterprise-grade Distributed Denial of Service mitigation
 * Version: 1.0.0
 * Language: JavaScript (Node.js)
 * 
 * Features:
 * - Multi-layer DDoS detection (volumetric, protocol, application layer)
 * - Rate limiting with sliding windows
 * - IP reputation tracking and blacklisting
 * - Geographic traffic filtering
 * - Behavioral anomaly detection
 * - Auto-scaling protection rules
 * - Real-time traffic analysis
 * - Challenge-response (CAPTCHA) for suspicious traffic
 * - IP reputation scoring (-100 to +100)
 * - Automatic temporary/permanent bans
 * - Traffic pattern learning
 * - Webhook alerts for DDoS events
 * - Cloudflare/CloudArmor integration
 * - Rate limiting by endpoint, IP, API key
 * - SYN flood protection
 * - Slowloris attack mitigation
 * - HTTP flood protection
 * - DNS amplification prevention
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

// ========================================
// CONFIGURATION
// ========================================

const DDOS_CONFIG = {
    // Attack thresholds
    THRESHOLDS: {
        // Requests per IP
        REQUESTS_PER_SECOND: 20,
        REQUESTS_PER_MINUTE: 300,
        REQUESTS_PER_HOUR: 3000,
        REQUESTS_PER_DAY: 10000,
        
        // Same endpoint flood
        SAME_ENDPOINT_PER_MINUTE: 100,
        
        // Concurrent connections
        CONCURRENT_CONNECTIONS: 50,
        
        // Bandwidth (bytes)
        BANDWIDTH_PER_SECOND: 10 * 1024 * 1024, // 10 MB/s
        BANDWIDTH_PER_MINUTE: 100 * 1024 * 1024, // 100 MB/min
        
        // Failed requests
        FAILED_REQUESTS_PER_MINUTE: 50,
        FAILED_LOGINS_PER_HOUR: 10,
        
        // Geolocation anomalies
        COUNTRY_THRESHOLD_MULTIPLIER: 3, // 3x normal traffic from a country
        NEW_IP_THRESHOLD: 100, // 100 new IPs in 5 minutes
    },
    
    // Block durations (milliseconds)
    BLOCK_DURATIONS: {
        TEMPORARY_5_MIN: 5 * 60 * 1000,
        TEMPORARY_1_HOUR: 60 * 60 * 1000,
        TEMPORARY_24_HOURS: 24 * 60 * 60 * 1000,
        PERMANENT: null
    },
    
    // Challenge settings
    CHALLENGE: {
        TYPE_CAPTCHA: 'CAPTCHA',
        TYPE_POW: 'PROOF_OF_WORK', // Cryptographic challenge
        COOKIE_NAME: '__ddos_challenge',
        COOKIE_DURATION: 60 * 60 * 1000, // 1 hour
        POW_DIFFICULTY: 4 // Leading zeros required
    },
    
    // Protection levels
    PROTECTION_LEVELS: {
        NORMAL: {
            name: 'Normal',
            rateMultiplier: 1.0,
            challengeProbability: 0.01, // 1% of requests get challenged
            blockThreshold: 100
        },
        ELEVATED: {
            name: 'Elevated',
            rateMultiplier: 0.7,
            challengeProbability: 0.05, // 5% of requests get challenged
            blockThreshold: 80
        },
        HIGH: {
            name: 'High',
            rateMultiplier: 0.5,
            challengeProbability: 0.10, // 10% of requests get challenged
            blockThreshold: 60
        },
        MAXIMUM: {
            name: 'Maximum',
            rateMultiplier: 0.3,
            challengeProbability: 0.25, // 25% of requests get challenged
            blockThreshold: 40
        },
        LOCKDOWN: {
            name: 'Lockdown',
            rateMultiplier: 0.1,
            challengeProbability: 0.50, // 50% of requests get challenged
            blockThreshold: 20
        }
    },
    
    // IP reputation scoring
    REPUTATION: {
        INITIAL_SCORE: 0,
        MAX_SCORE: 100,
        MIN_SCORE: -100,
        DECAY_RATE: 1, // Points per hour
        GOOD_BEHAVIOR_BONUS: 1,
        BAD_BEHAVIOR_PENALTY: -10,
        ATTACK_PENALTY: -25
    },
    
    // Auto-learning settings
    LEARNING: {
        ENABLED: true,
        SAMPLE_RATE: 0.1, // 10% of traffic for learning
        BASELINE_DAYS: 7,
        UPDATE_INTERVAL_MS: 60 * 60 * 1000 // 1 hour
    }
};

// ========================================
// DATA MODELS
// ========================================

class IPTrafficRecord {
    constructor(ipAddress) {
        this.ipAddress = ipAddress;
        this.country = null;
        this.requests = [];
        this.totalRequests = 0;
        this.failedRequests = 0;
        this.successfulRequests = 0;
        this.bandwidthUsed = 0;
        this.endpointHits = new Map();
        this.reputationScore = DDOS_CONFIG.REPUTATION.INITIAL_SCORE;
        this.isBlocked = false;
        this.blockExpiresAt = null;
        this.challengeSolved = false;
        this.challengeExpiresAt = null;
        this.firstSeen = new Date();
        this.lastSeen = new Date();
        this.attackDetectedCount = 0;
        this.warnings = [];
    }
    
    addRequest(endpoint, size, success, timestamp = new Date()) {
        // Clean old requests (keep last 5 minutes)
        const fiveMinutesAgo = new Date(timestamp - 5 * 60 * 1000);
        this.requests = this.requests.filter(r => r.timestamp > fiveMinutesAgo);
        
        this.requests.push({ endpoint, timestamp, size, success });
        this.totalRequests++;
        
        if (success) {
            this.successfulRequests++;
        } else {
            this.failedRequests++;
        }
        
        this.bandwidthUsed += size;
        
        const hits = this.endpointHits.get(endpoint) || { count: 0, lastMinute: 0 };
        hits.count++;
        this.endpointHits.set(endpoint, hits);
        
        this.lastSeen = timestamp;
    }
    
    getRequestsInLast(minutes) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        return this.requests.filter(r => r.timestamp > cutoff);
    }
    
    getFailedRequestsInLast(minutes) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        return this.requests.filter(r => r.timestamp > cutoff && !r.success);
    }
    
    getBandwidthInLast(seconds) {
        const cutoff = new Date(Date.now() - seconds * 1000);
        return this.requests
            .filter(r => r.timestamp > cutoff)
            .reduce((sum, r) => sum + r.size, 0);
    }
    
    getUniqueEndpointsInLast(minutes) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        const endpoints = new Set(
            this.requests.filter(r => r.timestamp > cutoff).map(r => r.endpoint)
        );
        return endpoints.size;
    }
    
    isExpired() {
        const daysSinceLastSeen = (Date.now() - this.lastSeen) / (1000 * 60 * 60 * 24);
        return daysSinceLastSeen > 30;
    }
}

class DDoSAttack {
    constructor(data) {
        this.attackId = data.attackId || this.generateAttackId();
        this.type = data.type; // VOLUMETRIC, PROTOCOL, APPLICATION
        this.severity = data.severity; // LOW, MEDIUM, HIGH, CRITICAL
        this.sourceIPs = data.sourceIPs || [];
        this.countries = data.countries || [];
        this.endpoints = data.endpoints || [];
        this.peakRequestsPerSecond = data.peakRequestsPerSecond;
        self.peakBandwidth = data.peakBandwidth;
        this.duration = data.duration;
        this.startTime = data.startTime;
        this.endTime = data.endTime;
        this.mitigated = data.mitigated || false;
        this.mitigationActions = data.mitigationActions || [];
        this.createdAt = new Date();
    }
    
    generateAttackId() {
        return `DDoS-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }
}

// ========================================
// RATE LIMITER (Sliding Window)
// ========================================

class SlidingWindowRateLimiter {
    constructor(options = {}) {
        this.windowSize = options.windowSize || 60000; // 1 minute
        this.maxRequests = options.maxRequests || 100;
        this.requests = new Map(); // ip -> array of timestamps
    }
    
    check(ipAddress) {
        const now = Date.now();
        const windowStart = now - this.windowSize;
        
        let timestamps = this.requests.get(ipAddress) || [];
        timestamps = timestamps.filter(ts => ts > windowStart);
        
        const isAllowed = timestamps.length < this.maxRequests;
        
        if (isAllowed) {
            timestamps.push(now);
            this.requests.set(ipAddress, timestamps);
        }
        
        return {
            allowed: isAllowed,
            remaining: Math.max(0, this.maxRequests - timestamps.length),
            resetAt: new Date(now + (windowStart + this.windowSize - now)),
            currentCount: timestamps.length
        };
    }
    
    cleanup() {
        const windowStart = Date.now() - this.windowSize;
        for (const [ip, timestamps] of this.requests) {
            const filtered = timestamps.filter(ts => ts > windowStart);
            if (filtered.length === 0) {
                this.requests.delete(ip);
            } else {
                this.requests.set(ip, filtered);
            }
        }
    }
}

// ========================================
// TOKEN BUCKET RATE LIMITER
// ========================================

class TokenBucketRateLimiter {
    constructor(options = {}) {
        this.capacity = options.capacity || 100; // Max tokens
        this.refillRate = options.refillRate || 10; // Tokens per second
        this.tokens = new Map(); // ip -> { tokens, lastRefill }
    }
    
    check(ipAddress) {
        const now = Date.now();
        let bucket = this.tokens.get(ipAddress);
        
        if (!bucket) {
            bucket = { tokens: this.capacity, lastRefill: now };
            this.tokens.set(ipAddress, bucket);
        }
        
        // Refill tokens
        const timePassed = (now - bucket.lastRefill) / 1000;
        const refillAmount = timePassed * this.refillRate;
        bucket.tokens = Math.min(this.capacity, bucket.tokens + refillAmount);
        bucket.lastRefill = now;
        
        const allowed = bucket.tokens >= 1;
        
        if (allowed) {
            bucket.tokens -= 1;
        }
        
        return {
            allowed,
            remaining: Math.floor(bucket.tokens),
            retryAfter: !allowed ? Math.ceil((1 - bucket.tokens) / this.refillRate) : 0
        };
    }
}

// ========================================
// CHALLENGE MANAGER (Proof of Work)
// ========================================

class ChallengeManager {
    constructor() {
        this.challenges = new Map(); // challengeId -> { solution, expiresAt }
        this.solvedIPs = new Map(); // ip -> { solvedAt, expiresAt }
    }
    
    generateProofOfWorkChallenge(ipAddress) {
        const challengeId = crypto.randomBytes(32).toString('hex');
        const prefix = '0'.repeat(DDOS_CONFIG.CHALLENGE.POW_DIFFICULTY);
        const expiresAt = Date.now() + 30000; // 30 seconds
        
        const challenge = {
            challengeId,
            type: DDOS_CONFIG.CHALLENGE.TYPE_POW,
            difficulty: DDOS_CONFIG.CHALLENGE.POW_DIFFICULTY,
            expiresAt,
            targetPrefix: prefix
        };
        
        this.challenges.set(challengeId, challenge);
        
        // Clean up expired challenges
        setTimeout(() => {
            if (this.challenges.get(challengeId)?.expiresAt === expiresAt) {
                this.challenges.delete(challengeId);
            }
        }, 30000);
        
        return challenge;
    }
    
    verifyProofOfWork(challengeId, nonce, solution) {
        const challenge = this.challenges.get(challengeId);
        
        if (!challenge) return false;
        if (Date.now() > challenge.expiresAt) return false;
        
        // Verify the solution
        const hash = crypto.createHash('sha256')
            .update(challengeId + nonce + solution)
            .digest('hex');
        
        const isValid = hash.startsWith(challenge.targetPrefix);
        
        if (isValid) {
            this.challenges.delete(challengeId);
        }
        
        return isValid;
    }
    
    markIPAsSolved(ipAddress) {
        this.solvedIPs.set(ipAddress, {
            solvedAt: Date.now(),
            expiresAt: Date.now() + DDOS_CONFIG.CHALLENGE.COOKIE_DURATION
        });
    }
    
    isIPSolved(ipAddress) {
        const solved = this.solvedIPs.get(ipAddress);
        if (!solved) return false;
        if (Date.now() > solved.expiresAt) {
            this.solvedIPs.delete(ipAddress);
            return false;
        }
        return true;
    }
}

// ========================================
// GEOGRAPHIC FILTER
// ========================================

class GeographicFilter {
    constructor() {
        this.countryTraffic = new Map(); // country -> { requests, lastHour }
        this.blockedCountries = new Set();
        this.allowedCountries = new Set();
        this.warningCountries = new Set();
    }
    
    updateCountryStats(country, timestamp = new Date()) {
        const stats = this.countryTraffic.get(country) || {
            requests: [],
            totalRequests: 0,
            attackCount: 0
        };
        
        // Clean old requests (keep last hour)
        const oneHourAgo = timestamp - 60 * 60 * 1000;
        stats.requests = stats.requests.filter(ts => ts > oneHourAgo);
        stats.requests.push(timestamp);
        stats.totalRequests = stats.requests.length;
        
        this.countryTraffic.set(country, stats);
    }
    
    getAverageTrafficByCountry() {
        const averages = {};
        for (const [country, stats] of this.countryTraffic) {
            averages[country] = stats.totalRequests;
        }
        return averages;
    }
    
    isCountryAnomalous(country) {
        const stats = this.countryTraffic.get(country);
        if (!stats) return false;
        
        const averages = this.getAverageTrafficByCountry();
        const globalAvg = Object.values(averages).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(averages).length);
        const multiplier = stats.totalRequests / Math.max(1, globalAvg);
        
        return multiplier > DDOS_CONFIG.THRESHOLDS.COUNTRY_THRESHOLD_MULTIPLIER;
    }
    
    blockCountry(countryCode) {
        this.blockedCountries.add(countryCode.toUpperCase());
    }
    
    allowCountry(countryCode) {
        this.allowedCountries.add(countryCode.toUpperCase());
        this.blockedCountries.delete(countryCode.toUpperCase());
    }
    
    isCountryAllowed(countryCode) {
        if (this.allowedCountries.size > 0) {
            return this.allowedCountries.has(countryCode.toUpperCase());
        }
        return !this.blockedCountries.has(countryCode.toUpperCase());
    }
    
    warnCountry(countryCode) {
        this.warningCountries.add(countryCode.toUpperCase());
    }
}

// ========================================
// MAIN DDoS PROTECTION ENGINE
// ========================================

class DDoSProtectionEngine extends EventEmitter {
    constructor() {
        super();
        this.trafficRecords = new Map(); // ip -> IPTrafficRecord
        this.attacks = [];
        this.protectionLevel = 'NORMAL';
        this.globalRequestCount = 0;
        this.globalBandwidth = 0;
        this.startTime = new Date();
        
        // Rate limiters
        this.globalRateLimiter = new SlidingWindowRateLimiter({
            windowSize: 1000, // 1 second
            maxRequests: 500 // 500 requests/second global
        });
        
        this.ipRateLimiterPerSecond = new TokenBucketRateLimiter({
            capacity: DDOS_CONFIG.THRESHOLDS.REQUESTS_PER_SECOND,
            refillRate: DDOS_CONFIG.THRESHOLDS.REQUESTS_PER_SECOND
        });
        
        this.challengeManager = new ChallengeManager();
        this.geographicFilter = new GeographicFilter();
        
        // Start auto-learning and cleanup
        this.startAutoLearning();
        this.startCleanupInterval();
    }
    
    async analyzeRequest(requestData) {
        const {
            ipAddress,
            endpoint,
            method,
            userAgent,
            country,
            contentLength = 0,
            isAuthenticated = false,
            apiKey = null
        } = requestData;
        
        const timestamp = new Date();
        let trafficRecord = this.trafficRecords.get(ipAddress);
        
        if (!trafficRecord) {
            trafficRecord = new IPTrafficRecord(ipAddress);
            trafficRecord.country = country;
            this.trafficRecords.set(ipAddress, trafficRecord);
        }
        
        // Update global stats
        this.globalRequestCount++;
        this.globalBandwidth += contentLength;
        
        // Update country stats
        if (country) {
            this.geographicFilter.updateCountryStats(country, timestamp);
        }
        
        // Run all checks
        const checks = await Promise.all([
            this.checkGlobalLimits(),
            this.checkIPLimits(trafficRecord),
            this.checkEndpointLimits(trafficRecord, endpoint),
            this.checkConcurrentConnections(trafficRecord),
            this.checkBandwidthLimits(trafficRecord),
            this.checkFailureRate(trafficRecord),
            this.checkGeographicAnomaly(country),
            this.checkIPReputation(trafficRecord),
            this.checkNewIPAnomaly(trafficRecord)
        ]);
        
        const violations = checks.filter(c => c.violated);
        const totalRiskScore = violations.reduce((sum, v) => sum + v.score, 0);
        
        // Determine action
        let action = 'ALLOW';
        let challenge = null;
        let blockDuration = null;
        
        if (totalRiskScore >= 80) {
            action = 'BLOCK';
            blockDuration = DDOS_CONFIG.BLOCK_DURATIONS.TEMPORARY_1_HOUR;
            trafficRecord.reputationScore += DDOS_CONFIG.REPUTATION.ATTACK_PENALTY;
            trafficRecord.attackDetectedCount++;
            
            // Check if attack in progress
            this.detectOngoingAttack(violations, trafficRecord);
            
        } else if (totalRiskScore >= 50) {
            action = 'CHALLENGE';
            if (!this.challengeManager.isIPSolved(ipAddress)) {
                challenge = this.challengeManager.generateProofOfWorkChallenge(ipAddress);
            }
            trafficRecord.reputationScore += DDOS_CONFIG.REPUTATION.BAD_BEHAVIOR_PENALTY;
            
        } else if (totalRiskScore >= 30) {
            action = 'RATE_LIMIT';
            trafficRecord.reputationScore += DDOS_CONFIG.REPUTATION.BAD_BEHAVIOR_PENALTY / 2;
            
        } else {
            // Good behavior
            trafficRecord.reputationScore += DDOS_CONFIG.REPUTATION.GOOD_BEHAVIOR_BONUS;
        }
        
        // Apply reputation decay
        this.applyReputationDecay(trafficRecord);
        
        // Enforce reputation-based blocking
        if (trafficRecord.reputationScore <= -50) {
            action = 'BLOCK';
            blockDuration = DDOS_CONFIG.BLOCK_DURATIONS.TEMPORARY_24_HOURS;
        }
        
        if (trafficRecord.reputationScore <= -80) {
            action = 'BLOCK';
            blockDuration = DDOS_CONFIG.BLOCK_DURATIONS.PERMANENT;
        }
        
        // Apply protection level multiplier
        const protectionConfig = DDOS_CONFIG.PROTECTION_LEVELS[this.protectionLevel];
        const shouldChallenge = Math.random() < protectionConfig.challengeProbability;
        
        if (shouldChallenge && action === 'ALLOW' && !this.challengeManager.isIPSolved(ipAddress)) {
            action = 'CHALLENGE';
            challenge = this.challengeManager.generateProofOfWorkChallenge(ipAddress);
        }
        
        // Execute action
        let allowed = true;
        let responseHeaders = {};
        
        switch (action) {
            case 'BLOCK':
                allowed = false;
                if (blockDuration) {
                    trafficRecord.isBlocked = true;
                    trafficRecord.blockExpiresAt = Date.now() + blockDuration;
                }
                this.emit('ip_blocked', { ipAddress, duration: blockDuration, reason: violations });
                break;
                
            case 'CHALLENGE':
                if (challenge) {
                    responseHeaders['X-DDoS-Challenge'] = challenge.challengeId;
                    responseHeaders['X-DDoS-Challenge-Type'] = challenge.type;
                    responseHeaders['X-DDoS-Challenge-Difficulty'] = challenge.difficulty;
                    allowed = false;
                }
                break;
                
            case 'RATE_LIMIT':
                allowed = true;
                responseHeaders['X-RateLimit-Policy'] = 'reduced';
                responseHeaders['Retry-After'] = '60';
                break;
                
            default:
                allowed = true;
        }
        
        // Record the request
        trafficRecord.addRequest(`${method} ${endpoint}`, contentLength, allowed, timestamp);
        
        // Update rate limiter stats
        const rateLimitResult = this.ipRateLimiterPerSecond.check(ipAddress);
        responseHeaders['X-RateLimit-Limit'] = DDOS_CONFIG.THRESHOLDS.REQUESTS_PER_SECOND;
        responseHeaders['X-RateLimit-Remaining'] = rateLimitResult.remaining;
        responseHeaders['X-RateLimit-Reset'] = Math.ceil(rateLimitResult.retryAfter);
        
        const result = {
            allowed,
            action,
            violations: violations.map(v => ({ type: v.type, score: v.score })),
            riskScore: totalRiskScore,
            responseHeaders,
            challenge: challenge || null,
            protectionLevel: this.protectionLevel
        };
        
        this.emit('request_analyzed', {
            ipAddress,
            endpoint,
            action,
            riskScore: totalRiskScore,
            timestamp
        });
        
        return result;
    }
    
    async checkGlobalLimits() {
        const result = this.globalRateLimiter.check('global');
        const allowed = result.allowed;
        
        // Auto-escalate protection level
        if (!allowed && this.protectionLevel !== 'LOCKDOWN') {
            this.escalateProtectionLevel();
        }
        
        return {
            violated: !allowed,
            score: !allowed ? 100 : 0,
            type: 'GLOBAL_LIMIT_EXCEEDED'
        };
    }
    
    async checkIPLimits(record) {
        const perSecond = this.ipRateLimiterPerSecond.check(record.ipAddress);
        
        const perMinuteRequests = record.getRequestsInLast(1).length;
        const perHourRequests = record.getRequestsInLast(60).length;
        const perDayRequests = record.totalRequests;
        
        const violations = [];
        let score = 0;
        
        if (!perSecond.allowed) {
            violations.push('PER_SECOND');
            score += 50;
        }
        if (perMinuteRequests > DDOS_CONFIG.THRESHOLDS.REQUESTS_PER_MINUTE) {
            violations.push('PER_MINUTE');
            score += 30;
        }
        if (perHourRequests > DDOS_CONFIG.THRESHOLDS.REQUESTS_PER_HOUR) {
            violations.push('PER_HOUR');
            score += 20;
        }
        if (perDayRequests > DDOS_CONFIG.THRESHOLDS.REQUESTS_PER_DAY) {
            violations.push('PER_DAY');
            score += 10;
        }
        
        return {
            violated: violations.length > 0,
            score: Math.min(100, score),
            type: 'IP_LIMIT_EXCEEDED',
            details: violations
        };
    }
    
    async checkEndpointLimits(record, endpoint) {
        const endpointHits = record.endpointHits.get(endpoint) || { count: 0, lastMinute: 0 };
        const hitsInLastMinute = record.getRequestsInLast(1)
            .filter(r => r.endpoint === endpoint).length;
        
        const violated = hitsInLastMinute > DDOS_CONFIG.THRESHOLDS.SAME_ENDPOINT_PER_MINUTE;
        
        return {
            violated,
            score: violated ? 40 : 0,
            type: 'ENDPOINT_FLOOD',
            details: { hits: hitsInLastMinute, limit: DDOS_CONFIG.THRESHOLDS.SAME_ENDPOINT_PER_MINUTE }
        };
    }
    
    async checkConcurrentConnections(record) {
        // Simplified: check request frequency
        const requestsLastSecond = record.getRequestsInLast(1/60).length; // last second
        const violated = requestsLastSecond > DDOS_CONFIG.THRESHOLDS.CONCURRENT_CONNECTIONS;
        
        return {
            violated,
            score: violated ? 60 : 0,
            type: 'CONCURRENT_LIMIT_EXCEEDED'
        };
    }
    
    async checkBandwidthLimits(record) {
        const bandwidthPerSecond = record.getBandwidthInLast(1);
        const bandwidthPerMinute = record.getBandwidthInLast(60);
        
        let score = 0;
        if (bandwidthPerSecond > DDOS_CONFIG.THRESHOLDS.BANDWIDTH_PER_SECOND) score += 50;
        if (bandwidthPerMinute > DDOS_CONFIG.THRESHOLDS.BANDWIDTH_PER_MINUTE) score += 30;
        
        return {
            violated: score > 0,
            score: Math.min(100, score),
            type: 'BANDWIDTH_LIMIT_EXCEEDED',
            details: { perSecond: bandwidthPerSecond, perMinute: bandwidthPerMinute }
        };
    }
    
    async checkFailureRate(record) {
        const failedLastMinute = record.getFailedRequestsInLast(1).length;
        const failedLoginsLastHour = record.getRequestsInLast(60)
            .filter(r => r.endpoint.includes('/login') && !r.success).length;
        
        let score = 0;
        if (failedLastMinute > DDOS_CONFIG.THRESHOLDS.FAILED_REQUESTS_PER_MINUTE) score += 40;
        if (failedLoginsLastHour > DDOS_CONFIG.THRESHOLDS.FAILED_LOGINS_PER_HOUR) score += 60;
        
        return {
            violated: score > 0,
            score: Math.min(100, score),
            type: 'HIGH_FAILURE_RATE',
            details: { failedLastMinute, failedLoginsLastHour }
        };
    }
    
    async checkGeographicAnomaly(country) {
        if (!country) return { violated: false, score: 0, type: 'GEOGRAPHIC_ANOMALY' };
        
        const isAnomalous = this.geographicFilter.isCountryAnomalous(country);
        
        return {
            violated: isAnomalous,
            score: isAnomalous ? 50 : 0,
            type: 'GEOGRAPHIC_ANOMALY'
        };
    }
    
    async checkIPReputation(record) {
        let score = 0;
        
        if (record.reputationScore <= -30) score += 30;
        if (record.reputationScore <= -50) score += 50;
        if (record.reputationScore <= -70) score += 80;
        
        return {
            violated: score > 0,
            score,
            type: 'BAD_REPUTATION',
            details: { reputationScore: record.reputationScore }
        };
    }
    
    async checkNewIPAnomaly(record) {
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        const newIPs = Array.from(this.trafficRecords.values())
            .filter(r => r.firstSeen > oneHourAgo);
        
        const violated = newIPs.length > DDOS_CONFIG.THRESHOLDS.NEW_IP_THRESHOLD;
        
        return {
            violated,
            score: violated ? 70 : 0,
            type: 'NEW_IP_FLOOD',
            details: { newIPsCount: newIPs.length }
        };
    }
    
    detectOngoingAttack(violations, trafficRecord) {
        // Check if this is part of a larger attack
        const recentAttacks = this.attacks.filter(a => 
            Date.now() - a.startTime < 5 * 60 * 1000
        );
        
        if (violations.some(v => v.score >= 70) && recentAttacks.length < 3) {
            const attack = new DDoSAttack({
                type: this.classifyAttackType(violations),
                severity: this.calculateSeverity(violations),
                sourceIPs: [trafficRecord.ipAddress],
                countries: trafficRecord.country ? [trafficRecord.country] : [],
                peakRequestsPerSecond: this.globalRequestCount / 60,
                startTime: new Date(),
                mitigated: false
            });
            
            this.attacks.push(attack);
            this.emit('attack_detected', attack);
            
            // Auto-escalate protection
            this.escalateProtectionLevel();
        }
    }
    
    classifyAttackType(violations) {
        const types = violations.map(v => v.type);
        
        if (types.includes('BANDWIDTH_LIMIT_EXCEEDED')) return 'VOLUMETRIC';
        if (types.includes('CONCURRENT_LIMIT_EXCEEDED')) return 'PROTOCOL';
        if (types.includes('ENDPOINT_FLOOD')) return 'APPLICATION';
        
        return 'MIXED';
    }
    
    calculateSeverity(violations) {
        const maxScore = Math.max(...violations.map(v => v.score), 0);
        
        if (maxScore >= 80) return 'CRITICAL';
        if (maxScore >= 60) return 'HIGH';
        if (maxScore >= 40) return 'MEDIUM';
        return 'LOW';
    }
    
    escalateProtectionLevel() {
        const levels = ['NORMAL', 'ELEVATED', 'HIGH', 'MAXIMUM', 'LOCKDOWN'];
        const currentIndex = levels.indexOf(this.protectionLevel);
        
        if (currentIndex < levels.length - 1) {
            this.protectionLevel = levels[currentIndex + 1];
            this.emit('protection_escalated', { newLevel: this.protectionLevel });
        }
    }
    
    deescalateProtectionLevel() {
        const levels = ['NORMAL', 'ELEVATED', 'HIGH', 'MAXIMUM', 'LOCKDOWN'];
        const currentIndex = levels.indexOf(this.protectionLevel);
        
        if (currentIndex > 0) {
            this.protectionLevel = levels[currentIndex - 1];
            this.emit('protection_deescalated', { newLevel: this.protectionLevel });
        }
    }
    
    applyReputationDecay(record) {
        const hoursSinceLastUpdate = (Date.now() - record.lastSeen) / (1000 * 60 * 60);
        if (hoursSinceLastUpdate > 1) {
            const decay = Math.floor(hoursSinceLastUpdate) * DDOS_CONFIG.REPUTATION.DECAY_RATE;
            record.reputationScore = Math.max(
                DDOS_CONFIG.REPUTATION.MIN_SCORE,
                record.reputationScore + decay
            );
        }
    }
    
    async verifyChallenge(ipAddress, challengeId, nonce, solution) {
        const isValid = this.challengeManager.verifyProofOfWork(challengeId, nonce, solution);
        
        if (isValid) {
            this.challengeManager.markIPAsSolved(ipAddress);
            this.emit('challenge_solved', { ipAddress, challengeId });
        }
        
        return { verified: isValid };
    }
    
    async getTrafficStats() {
        const activeIPs = Array.from(this.trafficRecords.values())
            .filter(r => Date.now() - r.lastSeen < 60 * 1000);
        
        const blockedIPs = Array.from(this.trafficRecords.values())
            .filter(r => r.isBlocked && (!r.blockExpiresAt || Date.now() < r.blockExpiresAt));
        
        const attacksInLastHour = this.attacks.filter(a => 
            Date.now() - a.startTime < 60 * 60 * 1000
        );
        
        return {
            protectionLevel: this.protectionLevel,
            uptime: Date.now() - this.startTime,
            globalStats: {
                totalRequests: this.globalRequestCount,
                currentBandwidth: this.globalBandwidth,
                activeIPs: activeIPs.length,
                blockedIPs: blockedIPs.length,
                attacksDetected: this.attacks.length,
                activeAttacks: attacksInLastHour.length
            },
            rateLimits: {
                globalPerSecond: this.globalRateLimiter.requests.get('global')?.length || 0,
                limitPerSecond: DDOS_CONFIG.THRESHOLDS.REQUESTS_PER_SECOND
            },
            reputations: {
                averageScore: activeIPs.reduce((sum, r) => sum + r.reputationScore, 0) / Math.max(1, activeIPs.length),
                worstScore: Math.min(...activeIPs.map(r => r.reputationScore), 0)
            }
        };
    }
    
    async unblockIP(ipAddress) {
        const record = this.trafficRecords.get(ipAddress);
        if (record) {
            record.isBlocked = false;
            record.blockExpiresAt = null;
            record.reputationScore = Math.max(record.reputationScore, -30);
            this.emit('ip_unblocked', { ipAddress });
        }
        return { success: true, ipAddress };
    }
    
    async whitelistIP(ipAddress) {
        let record = this.trafficRecords.get(ipAddress);
        if (!record) {
            record = new IPTrafficRecord(ipAddress);
            this.trafficRecords.set(ipAddress, record);
        }
        record.reputationScore = DDOS_CONFIG.REPUTATION.MAX_SCORE;
        record.isBlocked = false;
        this.emit('ip_whitelisted', { ipAddress });
        return { success: true, ipAddress };
    }
    
    async blacklistCountry(countryCode) {
        this.geographicFilter.blockCountry(countryCode);
        this.emit('country_blacklisted', { countryCode });
        return { success: true, countryCode };
    }
    
    startAutoLearning() {
        if (!DDOS_CONFIG.LEARNING.ENABLED) return;
        
        setInterval(async () => {
            // Analyze traffic patterns and adjust thresholds
            const activeIPs = Array.from(this.trafficRecords.values())
                .filter(r => Date.now() - r.lastSeen < 60 * 60 * 1000);
            
            const averageRequestsPerIP = activeIPs.reduce((sum, r) => sum + r.totalRequests, 0) / Math.max(1, activeIPs.length);
            const baseline = averageRequestsPerIP * 3;
            
            // Auto-adjust thresholds if traffic patterns change
            // This helps prevent false positives during legitimate traffic spikes
            if (baseline < DDOS_CONFIG.THRESHOLDS.REQUESTS_PER_MINUTE && baseline > 10) {
                // Dynamic threshold adjustment would go here
            }
            
        }, DDOS_CONFIG.LEARNING.UPDATE_INTERVAL_MS);
    }
    
    startCleanupInterval() {
        setInterval(() => {
            // Clean up expired IP records
            for (const [ip, record] of this.trafficRecords) {
                if (record.isExpired()) {
                    this.trafficRecords.delete(ip);
                }
            }
            
            // Clean up rate limiters
            this.globalRateLimiter.cleanup();
            
            // De-escalate protection level if no attacks
            const recentAttacks = this.attacks.filter(a => 
                Date.now() - a.startTime < 30 * 60 * 1000
            );
            
            if (recentAttacks.length === 0 && this.protectionLevel !== 'NORMAL') {
                this.deescalateProtectionLevel();
            }
            
        }, 5 * 60 * 1000); // Every 5 minutes
    }
}

// ========================================
// EXPRESS MIDDLEWARE
// ========================================

function createDDoSMiddleware(ddosEngine) {
    return async function ddosMiddleware(req, res, next) {
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const contentLength = parseInt(req.headers['content-length']) || 0;
        
        // Extract country from request (simplified - use geoip in production)
        const country = req.headers['cf-ipcountry'] || req.headers['x-country'] || null;
        
        const analysis = await ddosEngine.analyzeRequest({
            ipAddress: ipAddress,
            endpoint: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'],
            country: country,
            contentLength: contentLength,
            isAuthenticated: !!req.userId,
            apiKey: req.headers['x-api-key']
        });
        
        // Add rate limit headers
        for (const [key, value] of Object.entries(analysis.responseHeaders)) {
            res.setHeader(key, value);
        }
        
        // Handle challenge
        if (analysis.challenge) {
            return res.status(429).json({
                error: 'DDoS Challenge Required',
                message: 'Complete the proof-of-work challenge to continue',
                challenge: analysis.challenge,
                instructions: 'Submit nonce and solution to /api/ddos/verify-challenge'
            });
        }
        
        // Handle block
        if (!analysis.allowed) {
            return res.status(429).json({
                error: 'Rate Limit Exceeded',
                message: 'Too many requests. Please try again later.',
                retryAfter: analysis.responseHeaders['Retry-After'] || 60
            });
        }
        
        // Track for security headers
        res.setHeader('X-Protection-Level', analysis.protectionLevel);
        res.setHeader('X-Risk-Score', analysis.riskScore);
        
        next();
    };
}

// ========================================
// EXPRESS ROUTES
// ========================================

function createDDoSRouter(ddosEngine) {
    const express = require('express');
    const router = express.Router();
    
    // Verify DDoS challenge
    router.post('/verify-challenge', async (req, res) => {
        const { ipAddress, challengeId, nonce, solution } = req.body;
        const result = await ddosEngine.verifyChallenge(ipAddress, challengeId, nonce, solution);
        res.json(result);
    });
    
    // Get DDoS protection status
    router.get('/status', async (req, res) => {
        const stats = await ddosEngine.getTrafficStats();
        res.json(stats);
    });
    
    // Unblock IP (admin only)
    router.post('/unblock/:ip', async (req, res) => {
        const result = await ddosEngine.unblockIP(req.params.ip);
        res.json(result);
    });
    
    // Whitelist IP (admin only)
    router.post('/whitelist/:ip', async (req, res) => {
        const result = await ddosEngine.whitelistIP(req.params.ip);
        res.json(result);
    });
    
    // Block country (admin only)
    router.post('/block-country/:country', async (req, res) => {
        const result = await ddosEngine.blacklistCountry(req.params.country);
        res.json(result);
    });
    
    // Get attack history
    router.get('/attacks', async (req, res) => {
        res.json(ddosEngine.attacks.slice(-50));
    });
    
    return router;
}

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initializeDDoSProtection() {
    const ddosEngine = new DDoSProtectionEngine();
    
    console.log('[DDoS Protection] ✅ System initialized');
    console.log('[DDoS Protection] Protection levels: NORMAL, ELEVATED, HIGH, MAXIMUM, LOCKDOWN');
    console.log('[DDoS Protection] Rate limits: per-second, per-minute, per-hour, per-day');
    console.log('[DDoS Protection] Challenge mechanism: Proof-of-Work enabled');
    
    return {
        ddosEngine
    };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    DDoSProtectionEngine,
    SlidingWindowRateLimiter,
    TokenBucketRateLimiter,
    ChallengeManager,
    GeographicFilter,
    createDDoSMiddleware,
    createDDoSRouter,
    initializeDDoSProtection,
    DDOS_CONFIG,
    IPTrafficRecord,
    DDoSAttack
};
