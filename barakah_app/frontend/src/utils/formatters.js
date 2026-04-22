/**
 * Utility functions for formatting data in the frontend.
 */

/**
 * Formats a number as IDR currency string (e.g., Rp 1.000.000)
 * @param {number|string} amount 
 * @returns {string}
 */
export const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || amount === '') return 'Rp 0';
    const number = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};

/**
 * Formats a number with thousand separators (e.g., 1.000.000)
 * @param {number|string} number 
 * @returns {string}
 */
export const formatNumber = (number) => {
    if (number === undefined || number === null || number === '') return '0';
    const num = typeof number === 'string' ? parseFloat(number) : number;
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
};

/**
 * Parses a formatted currency string back to a number
 * @param {string} formattedString 
 * @returns {number}
 */
export const parseCurrency = (formattedString) => {
    if (typeof formattedString !== 'string') return formattedString;
    return parseFloat(formattedString.replace(/[^\d]/g, '')) || 0;
};
