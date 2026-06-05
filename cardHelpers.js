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
  if (firstFourDigits === '5067' || first
