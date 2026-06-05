// Mask card number for display
const maskCardNumber = (cardNumber) => {
  if (!cardNumber) return '****';
  return `**** **** **** ${cardNumber.slice(-4)}`;
};

// Get card brand from number
const getCardBrand = (cardNumber) => {
  const firstDigit = cardNumber.charAt(0);
  const firstTwoDigits = cardNumber.substring(0, 2);
  const firstFourDigits = cardNumber.substring(0, 4);
  
  if (firstDigit === '4') return 'visa';
  if (firstTwoDigits >= '51' && firstTwoDigits <= '55') return 'mastercard';
  if (firstFourDigits === '6011' || firstTwoDigits === '65') return 'discover';
  if (firstTwoDigits === '34' || firstTwoDigits === '37') return 'amex';
  if (firstFourDigits === '5067' || firstFourDigits === '5090') return 'elo';
  
  return 'unknown';
};

// Validate card expiration
const isExpired = (expirationMonth, expirationYear) => {
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  
  if (parseInt(expirationYear) < currentYear) return true;
  if (parseInt(expirationYear) === currentYear && parseInt(expirationMonth) < currentMonth) return true;
  
  return false;
};

// Generate random CVV
const generateCVV = () => {
  return Math.floor(100 + Math.random() * 900).toString();
};

// Validate CVV
const isValidCVV = (cvv, cardType = 'visa') => {
  const expectedLength = cardType === 'amex' ? 4 : 3;
  return cvv && cvv.length === expectedLength && /^\d+$/.test(cvv);
};

// Format card expiry for display
const formatExpiry = (month, year) => {
  return `${month}/${year}`;
};

// Check if card can be used for ATM withdrawal
const canUseAtm = (card) => {
  return card.atmEnabled && !card.isBlocked() && card.status === 'active';
};

// Check if card can be used for online purchase
const canUseOnline = (card) => {
  return card.onlineEnabled && !card.isBlocked() && card.status === 'active';
};

// Get card status text
const getCardStatusText = (card) => {
  if (card.status === 'canceled') return 'Canceled';
  if (card.status === 'blocked') return 'Blocked';
  if (card.status === 'temporary_blocked') return 'Temporarily Blocked';
  if (card.isBlocked()) return 'Blocked';
  return 'Active';
};

// Get remaining daily limit
const getRemainingDailyLimit = (card, todaySpent) => {
  return Math.max(0, card.dailyLimit - todaySpent);
};

// Get remaining monthly limit
const getRemainingMonthlyLimit = (card, monthSpent) => {
  return Math.max(0, card.monthlyLimit - monthSpent);
};

// Validate block reason
const isValidBlockReason = (reason, allowedReasons) => {
  return allowedReasons.includes(reason);
};

// Generate card analytics
const generateCardAnalytics = (cards) => {
  return {
    totalCards: cards.length,
    activeCards: cards.filter(c => c.status === 'active' && !c.isBlocked()).length,
    usageRate: cards.filter(c => c.lastUsedAt).length / cards.length,
    averageDailyLimit: cards.reduce((sum, c) => sum + c.dailyLimit, 0) / cards.length,
    averageMonthlyLimit: cards.reduce((sum, c) => sum + c.monthlyLimit, 0) / cards.length,
    mostCommonBrand: getMostCommonBrand(cards)
  };
};

const getMostCommonBrand = (cards) => {
  const brandCount = {};
  cards.forEach(card => {
    brandCount[card.cardBrand] = (brandCount[card.cardBrand] || 0) + 1;
  });
  
  return Object.entries(brandCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';
};

module.exports = {
  maskCardNumber,
  getCardBrand,
  isExpired,
  generateCVV,
  isValidCVV,
  formatExpiry,
  canUseAtm,
  canUseOnline,
  getCardStatusText,
  getRemainingDailyLimit,
  getRemainingMonthlyLimit,
  isValidBlockReason,
  generateCardAnalytics
};
