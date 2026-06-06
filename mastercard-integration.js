// mastercard-integration.js
// Mastercard API Integration Module for Zentronix Bank

const axios = require('axios');
const crypto = require('crypto');

class MastercardIntegration {
    constructor(config) {
        this.consumerKey = config.consumerKey;
        this.keystorePassword = config.keystorePassword;
        this.isSandbox = config.isSandbox !== false;
        this.baseUrl = this.isSandbox 
            ? 'https://sandbox.api.mastercard.com' 
            : 'https://api.mastercard.com';
    }

    /**
     * Generates OAuth signature for the request.
     * (Simplified implementation - full version requires .p12 file)
     */
    _generateAuthHeader(method, url, payload) {
        console.log(`⚠️ [Mastercard] Using simulated signature. Production requires .p12 file.`);
        // This is a placeholder. Real OAuth needs the .p12 file downloaded from dashboard.
        return `OAuth oauth_consumer_key="${this.consumerKey}", oauth_signature_method="RSA-SHA256"`;
    }

    /**
     * Internal method to make authenticated requests.
     */
    async _request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const payload = data ? JSON.stringify(data) : '';
        const authHeader = this._generateAuthHeader(method, url, payload);

        try {
            const response = await axios({
                method,
                url,
                data,
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                }
            });
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`❌ [Mastercard API] Error ${method} ${endpoint}:`, error.response?.data || error.message);
            return { 
                success: false, 
                error: error.response?.data || error.message,
                message: 'Failed to communicate with Mastercard'
            };
        }
    }

    /**
     * 1. BIN LOOKUP (Card Bin Lookup)
     * @param {string|number} bin - First 6 digits of the card
     */
    async lookupBin(bin) {
        const binStr = bin.toString().substring(0, 6);
        console.log(`🔍 [Mastercard] Looking up BIN: ${binStr}`);
        
        const result = await this._request(`/bin-lookup/v1/bins/${binStr}`);
        
        if (result.success) {
            console.log(`✅ BIN ${binStr} found:`, result.data);
            return {
                success: true,
                bin: binStr,
                scheme: result.data.scheme,
                type: result.data.type,
                issuer: result.data.issuer,
                country: result.data.country
            };
        }
        return result;
    }

    /**
     * 2. SERVICE STATUS (Health Check)
     * Checks if Mastercard API is accessible
     */
    async getServiceStatus() {
        console.log(`🏥 [Mastercard] Checking service status...`);
        return this._request('/health/v1/status');
    }

    /**
     * 3. CARD TOKENIZATION (MDES)
     * @param {string} cardNumber - Card number
     * @param {string} expiryMonth - Expiration month (MM)
     * @param {string} expiryYear - Expiration year (YYYY)
     */
    async tokenizeCard(cardNumber, expiryMonth, expiryYear) {
        console.log(`🔐 [Mastercard] Tokenizing card ending in ${cardNumber.slice(-4)}`);
        
        const payload = {
            cardNumber: cardNumber,
            expirationMonth: expiryMonth,
            expirationYear: expiryYear,
            tokenType: 'CLOUD_BASED'
        };
        
        return this._request('/mdes/v1/tokenize', 'POST', payload);
    }

    /**
     * 4. LOYALTY PROGRAM INFORMATION
     * @param {string} cardNumber - Card number
     */
    async getLoyaltyInfo(cardNumber) {
        console.log(`⭐ [Mastercard] Looking up loyalty program...`);
        return this._request(`/loyalty/v1/cards/${cardNumber}/programs`);
    }
}

module.exports = MastercardIntegration;

// If executed directly, shows usage instructions
if (require.main === module) {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🏦 MASTERCARD INTEGRATION MODULE - ZENTRONIX BANK       ║
╚══════════════════════════════════════════════════════════════╝

✅ Module loaded successfully!

📌 To use this module in your code:

1. Install dependencies:
   npm install axios

2. Import and configure:
   const MastercardIntegration = require('./mastercard-integration');
   
   const mastercard = new MastercardIntegration({
       consumerKey: 'YOUR_APP_KEY',
       keystorePassword: 'YOUR_PASSWORD',
       isSandbox: true
   });

3. Usage example:
   const result = await mastercard.lookupBin('555555');
   console.log(result);

⚠️ ATTENTION: For real API calls, you need the .p12 file.
   Without it, requests will use simulated mode.
    `);
}
