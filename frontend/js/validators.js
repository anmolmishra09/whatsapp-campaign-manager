/**
 * Strict Phone Number Normalizer & E.164 Validator
 */
const PhoneValidator = {
  cleanRawString(str) {
    if (!str) return '';
    return String(str).replace(/[^\d+]/g, '').trim();
  },

  normalize(rawNumber, defaultCountryPrefix = '91') {
    let cleaned = this.cleanRawString(rawNumber);
    if (!cleaned) return { isValid: false, normalized: null, error: 'Empty value' };

    // Remove leading zeroes
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.replace(/^0+/, '');
    }

    // Handle leading '+'
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    } else {
      // Check if country code is missing
      if (cleaned.length === 10) {
        cleaned = `${defaultCountryPrefix}${cleaned}`;
      }
    }

    // Standard E.164 international length check (between 10 and 15 digits)
    const isValid = /^\d{10,15}$/.test(cleaned);

    return {
      isValid,
      normalized: isValid ? cleaned : null,
      error: isValid ? null : 'Invalid international format or length'
    };
  }
};

window.PhoneValidator = PhoneValidator;