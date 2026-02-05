// Timezone utility for Dallas (Central Time Zone - America/Chicago)
// Dallas uses America/Chicago timezone (UTC-6 in winter, UTC-5 in summer)

const DALLAS_TIMEZONE = 'America/Chicago';

/**
 * Get current date/time in Dallas timezone
 * @returns {Date} Date object representing current time in Dallas
 */
export const getDallasDate = () => {
  const now = new Date();
  // Get Dallas time components
  const dallasTimeStr = now.toLocaleString('en-US', { timeZone: DALLAS_TIMEZONE });
  return new Date(dallasTimeStr);
};

/**
 * Format date to YYYY-MM-DD in Dallas timezone for date inputs
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string (YYYY-MM-DD) or empty string
 */
export const formatDateForInput = (date) => {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    
    // Get date components in Dallas timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: DALLAS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(dateObj);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for input:', error);
    return '';
  }
};

/**
 * Parse date string and create Date object representing that date in Dallas timezone
 * @param {string} dateStr - Date string (YYYY-MM-DD format)
 * @returns {Date} Date object or null
 */
export const parseDallasDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // For YYYY-MM-DD format, parse as date in Dallas timezone
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Create a date string that represents noon in Dallas timezone
      // We'll create it at UTC and then adjust for Dallas offset
      // Dallas is UTC-6 (CST) or UTC-5 (CDT)
      // To represent a date in Dallas, we create it at 18:00 UTC (which is 12:00 CST) or 17:00 UTC (which is 12:00 CDT)
      // We'll use a simpler approach: create at 12:00 local and let the system handle it
      // Actually, better: create date components directly
      const date = new Date(year, month - 1, day, 12, 0, 0);
      
      // Verify the date components match (to ensure no timezone conversion issues)
      // Get the date in Dallas timezone to verify
      const dallasFormatted = formatDateForInput(date);
      if (dallasFormatted === dateStr) {
        return date;
      }
      
      // If there's a mismatch, adjust
      // This handles edge cases where the date might shift due to timezone
      return new Date(Date.UTC(year, month - 1, day, 18, 0, 0)); // 18:00 UTC = 12:00 CST
    }
    
    // For other formats, try parsing
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (error) {
    console.error('Error parsing Dallas date:', error);
    return null;
  }
};

/**
 * Format date to ISO string for backend (preserving Dallas timezone date)
 * @param {Date|string} date - Date to format
 * @returns {string} ISO string or null
 */
export const formatDateForBackend = (date) => {
  if (!date) return null;
  
  try {
    let dateObj;
    if (typeof date === 'string') {
      // If it's a YYYY-MM-DD string, parse it
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        // Create at noon UTC to avoid date boundary issues
        // The date represents the date in Dallas timezone
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00.000Z`;
      }
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    if (!dateObj || isNaN(dateObj.getTime())) return null;
    
    // Get date components in Dallas timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: DALLAS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(dateObj);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    // Return ISO string at noon UTC to avoid timezone conversion issues
    return `${year}-${month}-${day}T12:00:00.000Z`;
  } catch (error) {
    console.error('Error formatting date for backend:', error);
    return null;
  }
};

/**
 * Get today's date in Dallas timezone (YYYY-MM-DD format)
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getTodayDateDallas = () => {
  return formatDateForInput(new Date());
};

/**
 * Calculate age at time of referral using Dallas timezone
 * @param {string|Date} dob - Date of birth
 * @param {string|Date} receivedDate - Date received by CAC
 * @returns {string} Age as string or empty string
 */
export const calculateAgeAtReferralDallas = (dob, receivedDate) => {
  if (!dob || !receivedDate) {
    return '';
  }
  
  try {
    // Parse dates ensuring we get the correct date in Dallas timezone
    let birthDate, referralDate;
    
    if (typeof dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      const [year, month, day] = dob.split('-').map(Number);
      birthDate = new Date(year, month - 1, day);
    } else {
      birthDate = dob instanceof Date ? dob : new Date(dob);
      // Get date components in Dallas timezone
      const dobStr = formatDateForInput(birthDate);
      if (dobStr) {
        const [year, month, day] = dobStr.split('-').map(Number);
        birthDate = new Date(year, month - 1, day);
      }
    }
    
    if (typeof receivedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(receivedDate)) {
      const [year, month, day] = receivedDate.split('-').map(Number);
      referralDate = new Date(year, month - 1, day);
    } else {
      referralDate = receivedDate instanceof Date ? receivedDate : new Date(receivedDate);
      // Get date components in Dallas timezone
      const receivedStr = formatDateForInput(referralDate);
      if (receivedStr) {
        const [year, month, day] = receivedStr.split('-').map(Number);
        referralDate = new Date(year, month - 1, day);
      }
    }
    
    if (isNaN(birthDate.getTime()) || isNaN(referralDate.getTime())) {
      console.warn('Invalid date in calculateAgeAtReferralDallas:', { dob, receivedDate });
      return '';
    }
    
    // Calculate age accurately
    let age = referralDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = referralDate.getMonth() - birthDate.getMonth();
    const dayDiff = referralDate.getDate() - birthDate.getDate();
    
    // If birthday hasn't occurred yet this year, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    
    return age >= 0 ? age.toString() : '';
  } catch (error) {
    console.error('Error calculating age in Dallas timezone:', error, { dob, receivedDate });
    return '';
  }
};

