/**
 * Safari (WebKit) & Cross-browser Safe Date Utilities
 * Resolves iOS Safari's strict ISO-8601 parsing where "YYYY-MM-DD HH:mm:ss" yields "Invalid Date".
 */

/**
 * Safely parses any date string, timestamp, or Date object into a valid Date instance.
 * Returns null if the input cannot be parsed or is invalid.
 * @param {string|number|Date} dateInput 
 * @returns {Date|null}
 */
export const parseSafeDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }

  if (typeof dateInput === 'string') {
    let str = dateInput.trim();
    if (!str) return null;

    // Fix time-only strings like "14:30:00" or "14:30"
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
      const timeParts = str.split(':');
      const now = new Date();
      now.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), timeParts[2] ? parseInt(timeParts[2], 10) : 0, 0);
      return now;
    }

    // Fix Safari issue: Replace space between date and time with 'T'
    // E.g. "2025-08-15 14:30:00" -> "2025-08-15T14:30:00"
    if (str.includes(' ') && !str.includes('T')) {
      str = str.replace(' ', 'T');
    }

    // Fix trailing space or non-standard timezone offsets
    let d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    // Fallback: Try replacing dashes with slashes for older Chromium/WebKit engines
    const slashFormatted = str.replace(/-/g, '/').replace('T', ' ');
    d = new Date(slashFormatted);
    if (!isNaN(d.getTime())) return d;
  }


  return null;
};

/**
 * Safely formats a date for Indonesian locale (or specified options)
 * @param {string|number|Date} dateInput 
 * @param {Intl.DateTimeFormatOptions} options 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatSafeDate = (
  dateInput,
  options = { day: '2-digit', month: '2-digit', year: 'numeric' },
  fallback = '-'
) => {
  const d = parseSafeDate(dateInput);
  if (!d) return fallback;

  try {
    return d.toLocaleDateString('id-ID', options);
  } catch (e) {
    // Fallback if Intl or locale options fail on older engines
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
};

/**
 * Safely formats a time string
 * @param {string|number|Date} dateInput 
 * @param {string} fallback 
 * @returns {string}
 */
export const formatSafeTime = (dateInput, fallback = '-') => {
  const d = parseSafeDate(dateInput);
  if (!d) return fallback;

  try {
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
};

/**
 * Checks if a deadline or date is in the past
 * @param {string|number|Date} deadline 
 * @returns {boolean}
 */
export const isDateExpired = (deadline) => {
  if (!deadline) return false;
  const targetDate = parseSafeDate(deadline);
  if (!targetDate) return false;
  return targetDate.getTime() < Date.now();
};

/**
 * Converts any date representation into strict "YYYY-MM-DD" string
 * required by iOS Safari `<input type="date">`.
 * @param {string|number|Date} dateInput 
 * @returns {string}
 */
export const toDateInputString = (dateInput) => {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    // If it is already in YYYY-MM-DD format (10 chars), return clean part
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }

  const d = parseSafeDate(dateInput);
  if (!d) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
