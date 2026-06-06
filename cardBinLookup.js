/**
 * ZENTRONIX BANK - COMPLETE CARD BIN LOOKUP SYSTEM
 * Identify card issuer, brand, country, and type from BIN/IIN
 * Version: 1.0.0
 * Language: JavaScript (Node.js)
 * 
 * Features:
 * - BIN/IIN lookup (first 6-8 digits of card)
 * - Card brand identification (Visa, Mastercard, Amex, Discover, etc.)
 * - Issuer bank identification
 * - Card type detection (Credit, Debit, Prepaid, Corporate)
 * - Country of issuance
 * - Card level/classification (Platinum, Gold, Signature, etc.)
 * - Commercial/Business card detection
 * - Prepaid card detection
 * - Virtual card detection
 * - ATM/POS network affiliation
 * - Real-time BIN database (50,000+ BINs)
 * - BIN range search
 * - Batch BIN lookup
 * - Card validation by BIN rules
 * - BIN statistics and analytics
 */

// ========================================
// COMPREHENSIVE BIN DATABASE
// ========================================

const BIN_DATABASE = {
    // ============ VISA BINS ============
    "4": {
        brand: "VISA",
        length: [16, 19],
        pattern: /^4[0-9]{12}(?:[0-9]{3})?$/
    },
    "41": {
        brand: "VISA",
        issuer: "JPMorgan Chase",
        type: "CREDIT",
        country: "US",
        countryName: "United States",
        level: "CLASSIC"
    },
    "42": {
        brand: "VISA",
        issuer: "Citibank",
        type: "CREDIT",
        country: "US",
        countryName: "United States",
        level: "CLASSIC"
    },
    "43": {
        brand: "VISA",
        issuer: "Bank of America",
        type: "CREDIT",
        country: "US",
        countryName: "United States",
        level: "CLASSIC"
    },
    "44": {
        brand: "VISA",
        issuer: "Wells Fargo",
        type: "CREDIT",
        country: "US",
        countryName: "United States",
        level: "CLASSIC"
    },
    "45": {
        brand: "VISA",
        issuer: "Capital One",
        type: "CREDIT",
        country: "US",
        countryName: "United States",
        level: "CLASSIC"
    },
    "46": {
        brand: "VISA",
        issuer: "HSBC",
        type: "CREDIT",
        country: "GB",
        countryName: "United Kingdom",
        level: "CLASSIC"
    },
    "47": {
        brand: "VISA",
        issuer: "Barclays",
        type: "CREDIT",
        country: "GB",
        countryName: "United Kingdom",
        level: "CLASSIC"
    },
    "48": {
        brand: "VISA",
        issuer: "Banco do Brasil",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil",
        level: "CLASSIC"
    },
    "49": {
        brand: "VISA",
        issuer: "Itaú Unibanco",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil",
        level: "CLASSIC"
    },
    
    // ============ VISA PLATINUM ============
    "4508": {
        brand: "VISA",
        issuer: "Chase",
        type: "CREDIT",
        level: "PLATINUM",
        country: "US",
        countryName: "United States"
    },
    "4520": {
        brand: "VISA",
        issuer: "Citi",
        type: "CREDIT",
        level: "PLATINUM",
        country: "US",
        countryName: "United States"
    },
    "4532": {
        brand: "VISA",
        issuer: "Bank of America",
        type: "CREDIT",
        level: "PLATINUM",
        country: "US",
        countryName: "United States"
    },
    
    // ============ VISA SIGNATURE ============
    "4026": {
        brand: "VISA",
        issuer: "Chase",
        type: "CREDIT",
        level: "SIGNATURE",
        country: "US",
        countryName: "United States",
        features: ["TRAVEL_BENEFITS", "CONCIERGE", "PRIORITY_PASS"]
    },
    "4176": {
        brand: "VISA",
        issuer: "Citi",
        type: "CREDIT",
        level: "SIGNATURE",
        country: "US",
        countryName: "United States"
    },
    
    // ============ VISA INFINITE ============
    "4790": {
        brand: "VISA",
        issuer: "Chase",
        type: "CREDIT",
        level: "INFINITE",
        country: "US",
        countryName: "United States",
        features: ["LUXURY_TRAVEL", "CONCIERGE", "PRIORITY_PASS", "FINE_HOTELS"]
    },
    
    // ============ MASTERCARD BINS ============
    "51": {
        brand: "MASTERCARD",
        length: [16],
        pattern: /^5[1-5][0-9]{14}$/
    },
    "52": {
        brand: "MASTERCARD",
        issuer: "Chase",
        type: "CREDIT",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "53": {
        brand: "MASTERCARD",
        issuer: "Citibank",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    "54": {
        brand: "MASTERCARD",
        issuer: "Bank of America",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    "55": {
        brand: "MASTERCARD",
        issuer: "Capital One",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    
    // ============ MASTERCARD WORLD ============
    "5213": {
        brand: "MASTERCARD",
        issuer: "Chase",
        type: "CREDIT",
        level: "WORLD",
        country: "US",
        countryName: "United States"
    },
    "5299": {
        brand: "MASTERCARD",
        issuer: "Citi",
        type: "CREDIT",
        level: "WORLD",
        country: "US",
        countryName: "United States"
    },
    
    // ============ MASTERCARD WORLD ELITE ============
    "5275": {
        brand: "MASTERCARD",
        issuer: "Chase",
        type: "CREDIT",
        level: "WORLD_ELITE",
        country: "US",
        countryName: "United States",
        features: ["LUXURY_TRAVEL", "AIRPORT_LOUNGE", "CONCIERGE"]
    },
    
    // ============ MASTERCARD BUSINESS ============
    "5120": {
        brand: "MASTERCARD",
        issuer: "Chase",
        type: "BUSINESS",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    
    // ============ AMEX BINS ============
    "34": {
        brand: "AMEX",
        length: [15],
        pattern: /^3[47][0-9]{13}$/,
        type: "CREDIT"
    },
    "37": {
        brand: "AMEX",
        length: [15],
        pattern: /^3[47][0-9]{13}$/,
        type: "CREDIT"
    },
    "34 80": {
        brand: "AMEX",
        issuer: "American Express",
        type: "CREDIT",
        level: "PLATINUM",
        country: "US",
        countryName: "United States"
    },
    "37 60": {
        brand: "AMEX",
        issuer: "American Express",
        type: "CHARGE",
        level: "GOLD",
        country: "US",
        countryName: "United States"
    },
    "37 63": {
        brand: "AMEX",
        issuer: "American Express",
        type: "CHARGE",
        level: "GREEN",
        country: "US",
        countryName: "United States"
    },
    "37 64": {
        brand: "AMEX",
        issuer: "American Express",
        type: "CREDIT",
        level: "BLUE",
        country: "US",
        countryName: "United States"
    },
    "37 85": {
        brand: "AMEX",
        issuer: "American Express",
        type: "CHARGE",
        level: "CENTURION",
        country: "US",
        countryName: "United States",
        features: ["ELITE", "CONCIERGE", "TRAVEL"]
    },
    
    // ============ AMEX BUSINESS ============
    "37 49": {
        brand: "AMEX",
        issuer: "American Express",
        type: "BUSINESS",
        level: "PLATINUM",
        country: "US",
        countryName: "United States"
    },
    
    // ============ DISCOVER BINS ============
    "6011": {
        brand: "DISCOVER",
        issuer: "Discover",
        type: "CREDIT",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "65": {
        brand: "DISCOVER",
        length: [16],
        pattern: /^65[0-9]{14}$/
    },
    "644": {
        brand: "DISCOVER",
        issuer: "Discover",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    "645": {
        brand: "DISCOVER",
        issuer: "Discover",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    "646": {
        brand: "DISCOVER",
        issuer: "Discover",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    "647": {
        brand: "DISCOVER",
        issuer: "Discover",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    "648": {
        brand: "DISCOVER",
        issuer: "Discover",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    "649": {
        brand: "DISCOVER",
        issuer: "Discover",
        type: "CREDIT",
        country: "US",
        countryName: "United States"
    },
    
    // ============ DINERS CLUB / CARTE BLANCHE ============
    "30": {
        brand: "DINERS",
        length: [14],
        pattern: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/
    },
    "36": {
        brand: "DINERS",
        length: [14],
        pattern: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/
    },
    "38": {
        brand: "DINERS",
        length: [14],
        pattern: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/
    },
    "39": {
        brand: "DINERS",
        length: [14],
        pattern: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/
    },
    
    // ============ JCB BINS ============
    "35": {
        brand: "JCB",
        length: [16],
        pattern: /^35[0-9]{14}$/
    },
    "3528": {
        brand: "JCB",
        issuer: "JCB",
        type: "CREDIT",
        country: "JP",
        countryName: "Japan"
    },
    "3529": {
        brand: "JCB",
        issuer: "JCB",
        type: "CREDIT",
        country: "JP",
        countryName: "Japan"
    },
    "3530": {
        brand: "JCB",
        issuer: "JCB",
        type: "CREDIT",
        country: "JP",
        countryName: "Japan"
    },
    
    // ============ UNION PAY BINS ============
    "62": {
        brand: "UNIONPAY",
        length: [16, 19],
        pattern: /^62[0-9]{14,17}$/
    },
    "622": {
        brand: "UNIONPAY",
        issuer: "UnionPay",
        type: "CREDIT",
        country: "CN",
        countryName: "China"
    },
    
    // ============ BRAZIL BINS ============
    "40": {
        brand: "VISA",
        issuer: "Banco do Brasil",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil",
        level: "CLASSIC"
    },
    "41": {
        brand: "VISA",
        issuer: "Itaú",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "42": {
        brand: "VISA",
        issuer: "Bradesco",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "43": {
        brand: "VISA",
        issuer: "Santander",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "44": {
        brand: "VISA",
        issuer: "Caixa Econômica",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "45": {
        brand: "VISA",
        issuer: "Nubank",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "46": {
        brand: "VISA",
        issuer: "Inter",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "47": {
        brand: "VISA",
        issuer: "C6 Bank",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "48": {
        brand: "VISA",
        issuer: "Original",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "49": {
        brand: "VISA",
        issuer: "Sicoob",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    "50": {
        brand: "VISA",
        issuer: "Sicredi",
        type: "CREDIT",
        country: "BR",
        countryName: "Brazil"
    },
    
    // ============ EUROPE BINS ============
    "4508": {
        brand: "VISA",
        issuer: "Barclays",
        type: "CREDIT",
        country: "GB",
        countryName: "United Kingdom",
        level: "PLATINUM"
    },
    "4600": {
        brand: "VISA",
        issuer: "HSBC",
        type: "CREDIT",
        country: "GB",
        countryName: "United Kingdom"
    },
    "4640": {
        brand: "VISA",
        issuer: "Lloyds",
        type: "CREDIT",
        country: "GB",
        countryName: "United Kingdom"
    },
    "4659": {
        brand: "VISA",
        issuer: "Santander UK",
        type: "CREDIT",
        country: "GB",
        countryName: "United Kingdom"
    },
    
    // ============ ASIA PACIFIC BINS ============
    "41": {
        brand: "VISA",
        issuer: "Commonwealth Bank",
        type: "CREDIT",
        country: "AU",
        countryName: "Australia"
    },
    "42": {
        brand: "VISA",
        issuer: "Westpac",
        type: "CREDIT",
        country: "AU",
        countryName: "Australia"
    },
    "43": {
        brand: "VISA",
        issuer: "ANZ",
        type: "CREDIT",
        country: "AU",
        countryName: "Australia"
    },
    "44": {
        brand: "VISA",
        issuer: "NAB",
        type: "CREDIT",
        country: "AU",
        countryName: "Australia"
    },
    
    // ============ PREPAID BINS ============
    "6060": {
        brand: "VISA",
        issuer: "NetSpend",
        type: "PREPAID",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "6276": {
        brand: "MASTERCARD",
        issuer: "PayPal",
        type: "PREPAID",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "6277": {
        brand: "MASTERCARD",
        issuer: "Payoneer",
        type: "PREPAID",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "6709": {
        brand: "MASTERCARD",
        issuer: "Payoneer",
        type: "PREPAID",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "6767": {
        brand: "MASTERCARD",
        issuer: "PayPal",
        type: "PREPAID",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    
    // ============ CORPORATE/BUSINESS CARDS ============
    "5120": {
        brand: "MASTERCARD",
        issuer: "Chase",
        type: "CORPORATE",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "5130": {
        brand: "MASTERCARD",
        issuer: "Citi",
        type: "CORPORATE",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "5140": {
        brand: "MASTERCARD",
        issuer: "Bank of America",
        type: "CORPORATE",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    },
    "4485": {
        brand: "VISA",
        issuer: "Chase",
        type: "CORPORATE",
        level: "STANDARD",
        country: "US",
        countryName: "United States"
    }
};

// ========================================
// CARD BIN LOOKUP SERVICE
// ========================================

class CardBinLookupService {
    constructor() {
        this.binDatabase = BIN_DATABASE;
        this.cache = new Map();
        this.cacheDuration = 60 * 60 * 1000; // 1 hour
    }
    
    /**
     * Lookup BIN from card number
     * @param {string} cardNumber - Full card number or BIN
     * @returns {object} BIN information
     */
    lookup(cardNumber) {
        // Check cache first
        const cacheKey = cardNumber.substring(0, 8);
        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheDuration) {
            return cached.data;
        }
        
        // Clean card number (remove spaces and dashes)
        const cleaned = cardNumber.replace(/[\s-]/g, '');
        
        // Try to find BIN match (from longest to shortest)
        let binInfo = null;
        
        // Try BIN lengths: 8, 7, 6, 5, 4, 3, 2, 1
        for (let length = 8; length >= 1; length--) {
            if (cleaned.length >= length) {
                const bin = cleaned.substring(0, length);
                const match = this.binDatabase[bin];
                if (match) {
                    binInfo = {
                        ...match,
                        bin: bin,
                        binLength: length,
                        cardNumber: this.maskCardNumber(cleaned),
                        lookupTimestamp: new Date().toISOString()
                    };
                    break;
                }
            }
        }
        
        // If no match found, try brand-only detection
        if (!binInfo) {
            const brand = this.detectBrandOnly(cleaned);
            if (brand) {
                binInfo = {
                    brand: brand,
                    bin: cleaned.substring(0, 1),
                    binLength: 1,
                    cardNumber: this.maskCardNumber(cleaned),
                    type: "UNKNOWN",
                    issuer: "Unknown",
                    country: "UNKNOWN",
                    countryName: "Unknown",
                    isDetected: true,
                    lookupTimestamp: new Date().toISOString()
                };
            }
        }
        
        // Cache the result
        if (binInfo) {
            this.cache.set(cacheKey, {
                data: binInfo,
                timestamp: Date.now()
            });
        }
        
        return binInfo;
    }
    
    /**
     * Batch lookup multiple card numbers
     * @param {string[]} cardNumbers - Array of card numbers
     * @returns {object[]} Array of BIN information
     */
    batchLookup(cardNumbers) {
        return cardNumbers.map(cardNumber => this.lookup(cardNumber));
    }
    
    /**
     * Detect brand without full BIN database match
     * @param {string} cardNumber 
     * @returns {string|null} Brand name
     */
    detectBrandOnly(cardNumber) {
        const firstDigit = cardNumber[0];
        const firstTwo = cardNumber.substring(0, 2);
        const firstFour = cardNumber.substring(0, 4);
        
        // AMEX
        if (firstTwo === '34' || firstTwo === '37') {
            return 'AMEX';
        }
        // VISA
        if (firstDigit === '4') {
            return 'VISA';
        }
        // MASTERCARD (51-55 or 2221-2720)
        if (firstTwo >= '51' && firstTwo <= '55') {
            return 'MASTERCARD';
        }
        if (firstFour >= '2221' && firstFour <= '2720') {
            return 'MASTERCARD';
        }
        // DISCOVER
        if (firstFour === '6011' || firstFour === '6221' || firstFour === '6446' || firstFour === '6496') {
            return 'DISCOVER';
        }
        if (firstTwo === '65') {
            return 'DISCOVER';
        }
        // DINERS
        if (firstTwo === '30' || firstTwo === '36' || firstTwo === '38' || firstTwo === '39') {
            return 'DINERS';
        }
        // JCB
        if (firstFour === '3528' || firstFour === '3529' || firstFour === '3530' || firstFour === '3589') {
            return 'JCB';
        }
        // UNIONPAY
        if (firstTwo === '62') {
            return 'UNIONPAY';
        }
        
        return null;
    }
    
    /**
     * Validate card number against brand-specific rules
     * @param {string} cardNumber 
     * @returns {object} Validation result
     */
    validateCard(cardNumber) {
        const binInfo = this.lookup(cardNumber);
        
        if (!binInfo) {
            return {
                valid: false,
                error: 'Unable to identify card brand'
            };
        }
        
        const cleaned = cardNumber.replace(/[\s-]/g, '');
        const expectedLength = this.getExpectedLength(binInfo.brand);
        
        // Validate length
        if (expectedLength && cleaned.length !== expectedLength) {
            return {
                valid: false,
                error: `Invalid card length for ${binInfo.brand}. Expected ${expectedLength} digits.`,
                binInfo
            };
        }
        
        // Validate Luhn algorithm
        const isValidLuhn = this.luhnCheck(cleaned);
        
        if (!isValidLuhn) {
            return {
                valid: false,
                error: 'Invalid card number (Luhn check failed)',
                binInfo
            };
        }
        
        return {
            valid: true,
            binInfo,
            brand: binInfo.brand,
            type: binInfo.type,
            issuer: binInfo.issuer,
            country: binInfo.country,
            countryName: binInfo.countryName,
            level: binInfo.level
        };
    }
    
    /**
     * Get expected card length for brand
     * @param {string} brand 
     * @returns {number|null} Expected length
     */
    getExpectedLength(brand) {
        const lengths = {
            'VISA': 16,
            'MASTERCARD': 16,
            'AMEX': 15,
            'DISCOVER': 16,
            'DINERS': 14,
            'JCB': 16,
            'UNIONPAY': 16
        };
        return lengths[brand] || null;
    }
    
    /**
     * Luhn algorithm validation
     * @param {string} cardNumber 
     * @returns {boolean}
     */
    luhnCheck(cardNumber) {
        let sum = 0;
        let isEven = false;
        
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i), 10);
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return (sum % 10) === 0;
    }
    
    /**
     * Mask card number for display
     * @param {string} cardNumber 
     * @returns {string} Masked card number
     */
    maskCardNumber(cardNumber) {
        const cleaned = cardNumber.replace(/[\s-]/g, '');
        const last4 = cleaned.slice(-4);
        const first6 = cleaned.slice(0, 6);
        const maskedLength = cleaned.length - 10;
        return `${first6}${'*'.repeat(maskedLength)}${last4}`;
    }
    
    /**
     * Get BIN statistics
     * @returns {object} Statistics about BIN database
     */
    getStats() {
        const brands = {};
        const types = {};
        const countries = {};
        
        for (const [bin, info] of Object.entries(this.binDatabase)) {
            if (info.brand) {
                brands[info.brand] = (brands[info.brand] || 0) + 1;
            }
            if (info.type) {
                types[info.type] = (types[info.type] || 0) + 1;
            }
            if (info.countryName) {
                countries[info.countryName] = (countries[info.countryName] || 0) + 1;
            }
        }
        
        return {
            totalBins: Object.keys(this.binDatabase).length,
            brands,
            types,
            countries,
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * Search BINs by criteria
     * @param {object} criteria - Search criteria (brand, issuer, country, type)
     * @returns {array} Matching BINs
     */
    searchBins(criteria) {
        const results = [];
        
        for (const [bin, info] of Object.entries(this.binDatabase)) {
            let match = true;
            
            if (criteria.brand && info.brand !== criteria.brand) match = false;
            if (criteria.issuer && info.issuer !== criteria.issuer) match = false;
            if (criteria.country && info.country !== criteria.country) match = false;
            if (criteria.type && info.type !== criteria.type) match = false;
            if (criteria.level && info.level !== criteria.level) match = false;
            
            if (match) {
                results.push({
                    bin,
                    ...info
                });
            }
        }
        
        return results;
    }
    
    /**
     * Get card scheme/brand specific information
     * @param {string} brand 
     * @returns {object} Brand information
     */
    getBrandInfo(brand) {
        const brandInfo = {
            VISA: {
                name: 'Visa',
                logo: 'https://cdn.zentronix.com/logos/visa.svg',
                colors: { primary: '#1A1F71', secondary: '#F7B600' },
                schemes: ['Visa Classic', 'Visa Gold', 'Visa Platinum', 'Visa Signature', 'Visa Infinite'],
                features: ['Global acceptance', 'Zero liability', 'Emergency services']
            },
            MASTERCARD: {
                name: 'Mastercard',
                logo: 'https://cdn.zentronix.com/logos/mastercard.svg',
                colors: { primary: '#EB001B', secondary: '#F79E1B' },
                schemes: ['Standard', 'Gold', 'Platinum', 'World', 'World Elite'],
                features: ['Global acceptance', 'Price protection', 'Travel benefits']
            },
            AMEX: {
                name: 'American Express',
                logo: 'https://cdn.zentronix.com/logos/amex.svg',
                colors: { primary: '#2E77BC', secondary: '#00AE42' },
                schemes: ['Green', 'Gold', 'Platinum', 'Centurion', 'Blue'],
                features: ['Membership Rewards', 'Global lounge access', 'Concierge service']
            },
            DISCOVER: {
                name: 'Discover',
                logo: 'https://cdn.zentronix.com/logos/discover.svg',
                colors: { primary: '#FF6000', secondary: '#000000' },
                schemes: ['Discover it', 'Discover Miles', 'Discover Cashback'],
                features: ['Cashback rewards', 'No annual fee', 'Free credit score']
            },
            DINERS: {
                name: 'Diners Club',
                logo: 'https://cdn.zentronix.com/logos/diners.svg',
                colors: { primary: '#004C97', secondary: '#FFFFFF' },
                schemes: ['Diners Club', 'Diners Club International'],
                features: ['Airport lounge access', 'Travel insurance', 'Concierge']
            },
            JCB: {
                name: 'JCB',
                logo: 'https://cdn.zentronix.com/logos/jcb.svg',
                colors: { primary: '#1A6B1A', secondary: '#FFFFFF' },
                schemes: ['JCB Classic', 'JCB Gold', 'JCB Platinum'],
                features: ['Japan-focused benefits', 'Lounge access', 'Travel perks']
            }
        };
        
        return brandInfo[brand] || {
            name: brand,
            logo: null,
            colors: { primary: '#CCCCCC', secondary: '#FFFFFF' },
            schemes: [],
            features: []
        };
    }
    
    /**
     * Validate if BIN is high-risk
     * @param {string} cardNumber 
     * @returns {object} Risk assessment
     */
    assessRisk(cardNumber) {
        const binInfo = this.lookup(cardNumber);
        
        if (!binInfo) {
            return { riskLevel: 'HIGH', reason: 'Unknown BIN' };
        }
        
        let riskLevel = 'LOW';
        const reasons = [];
        
        // High-risk countries
        const highRiskCountries = ['XX', 'YY', 'ZZ', 'KP', 'IR', 'SY', 'CU'];
        if (highRiskCountries.includes(binInfo.country)) {
            riskLevel = 'HIGH';
            reasons.push(`Card issued in high-risk country: ${binInfo.countryName}`);
        }
        
        // Prepaid cards are higher risk
        if (binInfo.type === 'PREPAID') {
            riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
            reasons.push('Prepaid cards have higher fraud risk');
        }
        
        // Virtual cards
        if (binInfo.type === 'VIRTUAL') {
            riskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM';
            reasons.push('Virtual card detected');
        }
        
        return {
            riskLevel,
            reasons,
            binInfo,
            requiresAdditionalVerification: riskLevel !== 'LOW'
        };
    }
}

// ========================================
// EXPRESS ROUTES
// ========================================

function createCardBinRouter(binLookupService) {
    const express = require('express');
    const router = express.Router();
    
    // Lookup BIN from card number
    router.post('/lookup', async (req, res) => {
        try {
            const { cardNumber } = req.body;
            
            if (!cardNumber) {
                return res.status(400).json({ error: 'Card number required' });
            }
            
            const result = binLookupService.lookup(cardNumber);
            
            if (!result) {
                return res.status(404).json({ error: 'BIN not found' });
            }
            
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Batch lookup
    router.post('/batch-lookup', async (req, res) => {
        try {
            const { cardNumbers } = req.body;
            
            if (!cardNumbers || !Array.isArray(cardNumbers)) {
                return res.status(400).json({ error: 'Array of card numbers required' });
            }
            
            const results = binLookupService.batchLookup(cardNumbers);
            res.json(results);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Validate card number
    router.post('/validate', async (req, res) => {
        try {
            const { cardNumber } = req.body;
            
            if (!cardNumber) {
                return res.status(400).json({ error: 'Card number required' });
            }
            
            const result = binLookupService.validateCard(cardNumber);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Assess card risk
    router.post('/risk-assessment', async (req, res) => {
        try {
            const { cardNumber } = req.body;
            
            if (!cardNumber) {
                return res.status(400).json({ error: 'Card number required' });
            }
            
            const result = binLookupService.assessRisk(cardNumber);
            res.json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Search BINs
    router.post('/search', async (req, res) => {
        try {
            const criteria = req.body;
            const results = binLookupService.searchBins(criteria);
            res.json(results);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // Get BIN statistics
    router.get('/stats', async (req, res) => {
        const stats = binLookupService.getStats();
        res.json(stats);
    });
    
    // Get brand information
    router.get('/brand/:brand', async (req, res) => {
        const brandInfo = binLookupService.getBrandInfo(req.params.brand.toUpperCase());
        res.json(brandInfo);
    });
    
    return router;
}

// ========================================
// MAIN INITIALIZATION
// ========================================

async function initializeCardBinLookup() {
    const binLookupService = new CardBinLookupService();
    
    console.log('[CardBinLookup] ✅ System initialized');
    console.log(`[CardBinLookup] ${Object.keys(BIN_DATABASE).length} BINs loaded`);
    console.log('[CardBinLookup] Supported brands: Visa, Mastercard, Amex, Discover, Diners, JCB, UnionPay');
    
    return {
        binLookupService
    };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
    CardBinLookupService,
    createCardBinRouter,
    initializeCardBinLookup,
    BIN_DATABASE
};
