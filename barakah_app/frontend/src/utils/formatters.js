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
 * Parses a currency string or API decimal number back to a clean plain integer.
 * Correctly handles API decimal strings (e.g. "199000.00"), Indonesian formatted strings ("199.000"),
 * and comma decimals ("199.000,00"), completely eliminating the +2 zeroes digit bug and allowing any number magnitude.
 * @param {number|string} value 
 * @returns {number|string}
 */
export const parseCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '';
    if (typeof value === 'number') return isNaN(value) ? 0 : Math.round(value);
    
    let str = value.toString().trim();
    if (str === '') return '';

    // Handle standard Django/API decimal strings ending in .00 or .0 (e.g. "199000.00", "5000.0")
    if (/^\d+\.(?:0|00)$/.test(str)) {
        str = str.split('.')[0];
    }

    // If it has Indonesian comma decimal e.g. "199.000,00" -> take integer part before comma
    if (str.includes(',')) {
        str = str.split(',')[0];
    }

    // If it's a plain integer string with no formatting e.g. "199000"
    if (/^\d+$/.test(str)) {
        return parseInt(str, 10);
    }

    // In Indonesian currency formatting (id-ID), dots are thousand separators: "3.000", "10.000", "1.500.000"
    // Strip all non-digit characters (dots, spaces, Rp, etc.)
    const clean = str.replace(/[^\d]/g, '');
    if (clean === '') return 0;
    return parseInt(clean, 10);
};
