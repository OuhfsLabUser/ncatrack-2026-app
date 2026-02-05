/**
 * SSN formatting utility functions
 * Used to format SSN as XXX-XX-XXXX format
 */

/**
 * Format SSN as XXX-XX-XXXX format
 * @param {string} ssn - Original SSN (may contain hyphens or only digits)
 * @returns {string} Formatted SSN (XXX-XX-XXXX)
 */
export const formatSSN = (ssn) => {
  if (!ssn) return '';
  
  // Remove all non-digit characters
  const digits = ssn.replace(/\D/g, '');
  
  // If empty, return empty string
  if (digits.length === 0) return '';
  
  // Limit to maximum 11 digits (9-digit SSN + 2 hyphen positions)
  const limitedDigits = digits.slice(0, 9);
  
  // Format based on length
  if (limitedDigits.length <= 3) {
    return limitedDigits;
  } else if (limitedDigits.length <= 5) {
    return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
  } else {
    return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 5)}-${limitedDigits.slice(5, 9)}`;
  }
};

/**
 * Convert formatted SSN to digits only (for storing to database)
 * @param {string} formattedSSN - Formatted SSN (XXX-XX-XXXX)
 * @returns {string} Digits-only SSN
 */
export const unformatSSN = (formattedSSN) => {
  if (!formattedSSN) return '';
  // Remove all non-digit characters
  return formattedSSN.replace(/\D/g, '');
};

/**
 * Handle SSN input changes, auto-format
 * @param {Event} e - Input event
 * @param {Function} onChange - Original onChange handler function
 * @param {Function} setValue - Function to set value (for updating state)
 */
export const handleSSNChange = (e, onChange, setValue) => {
  const inputValue = e.target.value;
  const formatted = formatSSN(inputValue);
  
  // Create new event object with formatted value
  const newEvent = {
    ...e,
    target: {
      ...e.target,
      value: formatted
    }
  };
  
  // Call original onChange handler function
  if (onChange) {
    onChange(newEvent);
  }
  
  // If setValue function is provided, also update value
  if (setValue) {
    setValue(formatted);
  }
};
