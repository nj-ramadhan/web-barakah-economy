/**
 * Formats a number as Indonesian Rupiah currency without decimals.
 * @param {number|string} value 
 * @returns {string}
 */
export const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const number = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(number)) return '';
    
    // Using id-ID to get dots as thousands separators (e.g. 10.000)
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

/**
 * Parses a currency string back to a plain number, resolving both dots and commas.
 * @param {string} value 
 * @returns {number}
 */
export const parseCurrency = (value) => {
    if (!value) return 0;
    // Remove all non-digit characters
    const clean = value.toString().replace(/[^\d]/g, '');
    return parseInt(clean, 10) || 0;
};
