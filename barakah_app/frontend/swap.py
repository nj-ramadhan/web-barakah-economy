import re

with open('src/pages/EventDetailPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to swap the payment block and the form block.
# And also add the `extraFormPrice` logic inside the payment block.

payment_block_pattern = re.compile(r"(\{event\.price_type !== 'free' && !isUserFreeByLabel\(\) && \([\s\S]*?</div>\s*\)\})")
form_block_pattern = re.compile(r"(\{event\.form_fields\?\.length > 0 && \([\s\S]*?</div>\s*\)\})")

payment_match = payment_block_pattern.search(content)
form_match = form_block_pattern.search(content)

if payment_match and form_match:
    payment_str = payment_match.group(1)
    form_str = form_match.group(1)
    
    # We will modify the payment block to include extraFormPrice
    calc_logic = """let fixed = Number(event?.price_fixed) || 0;
                                                            if (selectedPriceVariation) fixed = Number(selectedPriceVariation.price);
                                                            
                                                            let extraFormPrice = 0;
                                                            if (event?.form_fields) {
                                                                event.form_fields.forEach(f => {
                                                                    if (['select', 'radio', 'checkbox'].includes(f.field_type) && f.options && responses[f.id]) {
                                                                        const opts = Array.isArray(f.options) ? f.options : [];
                                                                        if (f.field_type === 'checkbox') {
                                                                            const selected = responses[f.id] || [];
                                                                            selected.forEach(s => {
                                                                                const match = opts.find(o => o.label === s || o === s);
                                                                                if (match && match.price) extraFormPrice += Number(match.price);
                                                                            });
                                                                        } else {
                                                                            const match = opts.find(o => o.label === responses[f.id] || o === responses[f.id]);
                                                                            if (match && match.price) extraFormPrice += Number(match.price);
                                                                        }
                                                                    }
                                                                });
                                                            }
                                                            
                                                            const extra = Number(paymentAmount) || 0;
                                                            if (event?.price_type === 'fixed') return formatCurrency(fixed + extraFormPrice);
                                                            if (event?.price_type === 'hybrid_1') return formatCurrency(fixed + extraFormPrice + extra);
                                                            return formatCurrency(extra + extraFormPrice);"""
                                                            
    old_calc_logic = """let fixed = Number(event?.price_fixed) || 0;
                                                            if (selectedPriceVariation) fixed = Number(selectedPriceVariation.price);
                                                            
                                                            const extra = Number(paymentAmount) || 0;
                                                            if (event?.price_type === 'fixed') return formatCurrency(fixed);
                                                            if (event?.price_type === 'hybrid_1') return formatCurrency(fixed + extra);
                                                            return formatCurrency(extra);"""
    
    payment_str = payment_str.replace(old_calc_logic, calc_logic)
    
    # Also update form fields to show prices if applicable
    # We need to change the select/radio mapping to handle objects
    form_str = form_str.replace("""let opts = field.options || [];
                                                                        if (typeof opts === 'string') {
                                                                            try { opts = JSON.parse(opts); } catch (e) { opts = []; }
                                                                        }
                                                                        return Array.isArray(opts) ? opts.map(opt => (
                                                                            <option key={opt} value={opt}>{opt}</option>
                                                                        )) : null;""",
                                """let opts = field.options || [];
                                                                        if (typeof opts === 'string') {
                                                                            try { opts = JSON.parse(opts); } catch (e) { opts = []; }
                                                                        }
                                                                        return Array.isArray(opts) ? opts.map(opt => {
                                                                            const isObj = typeof opt === 'object';
                                                                            const label = isObj ? opt.label : opt;
                                                                            const price = isObj && opt.price ? ` (+ Rp ${formatCurrency(opt.price)})` : '';
                                                                            return <option key={label} value={label}>{label}{price}</option>
                                                                        }) : null;""")
                                                                        
    form_str = form_str.replace("""<span className="text-xs font-bold truncate">{opt}</span>""",
                                """<span className="text-xs font-bold truncate">
                                                                            {typeof opt === 'object' ? opt.label : opt}
                                                                            {typeof opt === 'object' && opt.price ? ` (+ Rp ${formatCurrency(opt.price)})` : ''}
                                                                        </span>""")
                                                                        
    form_str = form_str.replace("""(responses[field.id] || []).includes(opt)""",
                                """(responses[field.id] || []).includes(typeof opt === 'object' ? opt.label : opt)""")
                                
    form_str = form_str.replace("""handleCheckboxChange(field.id, opt, e.target.checked)""",
                                """handleCheckboxChange(field.id, typeof opt === 'object' ? opt.label : opt, e.target.checked)""")
                                
    # Add a check for mapping options
    form_str = form_str.replace("""{(field.options || []).map(opt => (""",
                                """{(field.options || []).map((opt, i) => (""")
                                
    form_str = form_str.replace("""<label key={opt}""", """<label key={typeof opt === 'object' ? opt.label : opt}""")

    # Now replace in content. The blocks are adjacent in the text. We can find the combined block and replace it.
    
    # Safest is just a direct replace.
    content = content.replace(payment_match.group(0), '%%PAYMENT_BLOCK%%')
    content = content.replace(form_match.group(0), '%%FORM_BLOCK%%')
    
    content = content.replace('%%PAYMENT_BLOCK%%', form_str)
    content = content.replace('%%FORM_BLOCK%%', payment_str)
    
    with open('src/pages/EventDetailPage.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Successfully swapped and updated.")
else:
    print("Could not find the blocks.")
