// ibanGenerator.js - Gerador de IBAN para contas internacionais

// Códigos de país e seus respectivos BBAN lengths
const COUNTRY_CODES = {
    'US': { code: 'US', name: 'Estados Unidos', bbanLength: 20, swiftPrefix: 'BOFA' },
    'GB': { code: 'GB', name: 'Reino Unido', bbanLength: 22, swiftPrefix: 'NWBK' },
    'DE': { code: 'DE', name: 'Alemanha', bbanLength: 20, swiftPrefix: 'DEUT' },
    'FR': { code: 'FR', name: 'França', bbanLength: 23, swiftPrefix: 'BNPA' },
    'ES': { code: 'ES', name: 'Espanha', bbanLength: 24, swiftPrefix: 'BBVA' },
    'IT': { code: 'IT', name: 'Itália', bbanLength: 27, swiftPrefix: 'BCIT' },
    'CH': { code: 'CH', name: 'Suíça', bbanLength: 21, swiftPrefix: 'UBSW' },
    'LU': { code: 'LU', name: 'Luxemburgo', bbanLength: 20, swiftPrefix: 'BCEE' },
    'PT': { code: 'PT', name: 'Portugal', bbanLength: 25, swiftPrefix: 'BPIP' },
    'BR': { code: 'BR', name: 'Brasil', bbanLength: 29, swiftPrefix: 'BBBR' }
};

// Calcular dígitos de verificação do IBAN
const calculateIbanChecksum = (ibanWithoutChecksum) => {
    const rearranged = ibanWithoutChecksum.slice(4) + ibanWithoutChecksum.slice(0, 4);
    const numeric = rearranged.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 48 && code <= 57) return char;
        return (code - 55).toString();
    }).join('');
    
    let remainder = 0;
    for (let i = 0; i < numeric.length; i++) {
        remainder = (remainder * 10 + parseInt(numeric[i])) % 97;
    }
    const checksum = (98 - remainder).toString().padStart(2, '0');
    return checksum;
};

// Gerar IBAN válido
const generateIBAN = (countryCode = 'GB') => {
    const country = COUNTRY_CODES[countryCode];
    if (!country) return null;
    
    // Gerar BBAN (Basic Bank Account Number)
    const bankCode = Math.floor(Math.random() * 10000000).toString().padStart(8, '0');
    const branchCode = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    
    let bban = '';
    if (countryCode === 'GB') {
        bban = `${bankCode}${branchCode}${accountNumber}`.slice(0, 22);
    } else if (countryCode === 'DE') {
        bban = `${bankCode}${accountNumber}`.slice(0, 20);
    } else {
        bban = `${bankCode}${branchCode}${accountNumber}`.slice(0, country.bbanLength);
    }
    
    // Construir IBAN sem checksum
    const ibanWithoutChecksum = `${country.code}00${bban}`;
    const checksum = calculateIbanChecksum(ibanWithoutChecksum);
    
    return `${country.code}${checksum}${bban}`;
};

// Validar IBAN
const validateIBAN = (iban) => {
    if (!iban) return false;
    const formattedIban = iban.toUpperCase().replace(/\s/g, '');
    const countryCode = formattedIban.slice(0, 2);
    
    if (!COUNTRY_CODES[countryCode]) return false;
    
    const checksum = formattedIban.slice(2, 4);
    const bban = formattedIban.slice(4);
    
    const ibanWithoutChecksum = `${countryCode}00${bban}`;
    const calculatedChecksum = calculateIbanChecksum(ibanWithoutChecksum);
    
    return checksum === calculatedChecksum;
};

// Obter código SWIFT/BIC baseado no país e banco
const generateSWIFT = (countryCode = 'GB') => {
    const country = COUNTRY_CODES[countryCode];
    if (!country) return null;
    
    const bankCode = 'ZENX'; // Zentreonix Bank code
    const locationCode = '22'; // Main office
    const branchCode = 'XXX';
    
    return `${bankCode}${country.swiftPrefix.slice(0, 2)}${locationCode}${branchCode}`;
};

module.exports = {
    generateIBAN,
    validateIBAN,
    generateSWIFT,
    COUNTRY_CODES
};
