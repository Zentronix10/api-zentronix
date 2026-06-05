// Card network detection and validation
const cardNetworkHelpers = {
  // Detect card network from BIN/IIN (first 6 digits)
  detectNetwork: (cardNumber) => {
    const bin = cardNumber.replace(/\D/g, '').substring(0, 6);
    const firstDigit = bin.charAt(0);
    const firstTwoDigits = bin.substring(0, 2);
    const firstThreeDigits = bin.substring(0, 3);
    const firstFourDigits = bin.substring(0, 4);
    
    // Visa
    if (firstDigit === '4') {
      return 'visa';
    }
    
    // Mastercard
    if (firstTwoDigits >= '51' && firstTwoDigits <= '55') {
      return 'mastercard';
    }
    if (firstTwoDigits >= '22' && firstTwoDigits <= '27') {
      return 'mastercard';
    }
    
    // American Express
    if (firstTwoDigits === '34' || firstTwoDigits === '37') {
      return 'amex';
    }
    
    // Elo
    const eloPrefixes = ['4011', '4312', '4389', '4514', '4576', '5041', '5066', '5090', '6277', '6362', '6363', '6504', '6505', '6506', '6507', '6509', '6516', '6550'];
    if (eloPrefixes.some(prefix => bin.startsWith(prefix))) {
      return 'elo';
    }
    
    // Discover
    if (firstFourDigits === '6011' || firstTwoDigits === '65' || firstThreeDigits >= '644' && firstThreeDigits <= '649') {
      return 'discover';
    }
    
    // Digital wallets are detected by token/device, not card number
    return 'unknown';
  },
  
  // Get network-specific unblock requirements
  getNetworkUnblockRequirements: (network) => {
    const requirements = {
      visa: {
        requiresPin: true,
        requiresOtp: true,
        maxAttempts: 3,
        unblockTimeoutMs: 15000,
        supportsAppUnblock: true
      },
      mastercard: {
        requiresPin: true,
        requiresOtp: true,
        maxAttempts: 3,
        unblockTimeoutMs: 15000,
        supportsAppUnblock: true
      },
      amex: {
        requiresPin: true,
        requiresOtp: true,
        requiresSecurityQuestions: true,
        maxAttempts: 3,
        unblockTimeoutMs: 20000,
        supportsAppUnblock: true
      },
      elo: {
        requiresPin: true,
        requiresOtp: true,
        maxAttempts: 3,
        unblockTimeoutMs: 15000,
        supportsAppUnblock: true
      },
      discover: {
        requiresPin: true,
        requiresOtp: true,
        maxAttempts: 3,
        unblockTimeoutMs: 15000,
        supportsAppUnblock: true
      }
    };
    
    return requirements[network] || requirements.visa;
  },
  
  // Digital wallet support
  digitalWallets: {
    google_pay: {
      name: 'Google Pay',
      supportsInstantUnblock: true,
      unblockMethod: 'app_only',
      verificationRequired: ['biometric', 'device_auth']
    },
    apple_pay: {
      name: 'Apple Pay',
      supportsInstantUnblock: true,
      unblockMethod: 'app_only',
      verificationRequired: ['biometric', 'face_id']
    },
    samsung_pay: {
      name: 'Samsung Pay',
      supportsInstantUnblock: true,
      unblockMethod: 'app_only',
      verificationRequired: ['biometric', 'iris', 'pin']
    }
  },
  
  // Format card number for network API
  formatForNetwork: (cardNumber, network) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    switch(network) {
      case 'amex':
        return `${cleaned.slice(0,4)} ${cleaned.slice(4,10)} ${cleaned.slice(10,15)}`;
      default:
        return `${cleaned.slice(0,4)} ${cleaned.slice(4,8)} ${cleaned.slice(8,12)} ${cleaned.slice(12,16)}`;
    }
  },
  
  // Validate CVV length by network
  getCvvLength: (network) => {
    return network === 'amex' ? 4 : 3;
  },
  
  // Get network contact info for support
  getNetworkSupportInfo: (network) => {
    const supportInfo = {
      visa: {
        phone: '1-800-847-2911',
        website: 'https://www.visa.com/support',
        emergencyUnblock: true
      },
      mastercard: {
        phone: '1-800-627-8372',
        website: 'https://www.mastercard.com/support',
        emergencyUnblock: true
      },
      amex: {
        phone: '1-800-528-4800',
        website: 'https://www.americanexpress.com/support',
        emergencyUnblock: true
      },
      elo: {
        phone: '0800-727-8356',
        website: 'https://www.elo.com.br/suporte',
        emergencyUnblock: true
      }
    };
    
    return supportInfo[network] || supportInfo.visa;
  }
};

module.exports = cardNetworkHelpers;
