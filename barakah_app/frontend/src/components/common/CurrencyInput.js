import React from 'react';
import { formatCurrency, parseCurrency } from '../../utils/formatters';

/**
 * A custom input component that formats the value as currency (thousands separators) in real-time.
 * It's designed to feel premium and handle "nominal" input as requested.
 */
const CurrencyInput = ({ 
    value: controlledValue, 
    onChange, 
    placeholder = "0", 
    className = "", 
    prefix = "Rp", 
    name,
    required = false,
    ...props 
}) => {
    // Handle both controlled and uncontrolled (defaultValue) modes
    const [uncontrolledValue, setUncontrolledValue] = React.useState(props.defaultValue || '');
    
    // If controlledValue is provided (not undefined), use it. Otherwise use internal state.
    const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;

    const handleInputChange = (e) => {
        const rawValue = e.target.value;
        const numericValue = parseCurrency(rawValue);
        
        // Update local state if uncontrolled
        if (controlledValue === undefined) {
            setUncontrolledValue(numericValue);
        }
        
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
    const displayValue = (value !== undefined && value !== null && value !== '') ? formatCurrency(value) : '';

    return (
        <div className="relative group">
            {prefix && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-[10px] pointer-events-none group-focus-within:text-green-600 transition-colors">
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
                className={`w-full ${prefix ? 'pl-11' : 'px-4'} pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all ${className}`}
                {...props}
            />
        </div>
    );
};

export default CurrencyInput;
