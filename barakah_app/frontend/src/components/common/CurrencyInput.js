import React from 'react';
import { formatCurrency, parseCurrency } from '../../utils/formatters';

/**
 * A custom input component that formats the value as currency (thousands separators) in real-time.
 * It's designed to feel premium and handle "nominal" input as requested.
 */
const CurrencyInput = ({ 
    value, 
    onChange, 
    placeholder = "0", 
    className = "", 
    prefix = "Rp", 
    name,
    required = false,
    ...props 
}) => {
    const handleInputChange = (e) => {
        const rawValue = e.target.value;
        const numericValue = parseCurrency(rawValue);
        
        // Pass the numeric value back to the parent
        if (onChange) {
            onChange({
                target: {
                    name: name,
                    value: numericValue
                }
            });
        }
    };

    // Format the current numeric value for display
    const displayValue = value ? formatCurrency(value) : '';

    return (
        <div className="relative group">
            {prefix && (
                <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-sm pointer-events-none group-focus-within:text-green-600 transition-colors">
                    {prefix}
                </span>
            )}
            <input
                type="text"
                name={name}
                value={displayValue}
                onChange={handleInputChange}
                required={required}
                placeholder={placeholder}
                className={`w-full ${prefix ? 'pl-12' : 'px-5'} pr-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all shadow-inner ${className}`}
                {...props}
            />
        </div>
    );
};

export default CurrencyInput;
