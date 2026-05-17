import re

with open('src/pages/admin/EventRegistrationSubmissionPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add "No" column header
header_pattern = r'(<th className="p-5 text-\[10px\] font-black text-gray-400 uppercase tracking-widest cursor-pointer hover:text-green-700 transition" onClick=\{.*?handleSort\(\'created_at\'\).*?>)'
content = re.sub(header_pattern, r'<th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-10">No</th>\n                                    \1', content)

# Add "Pesanan Selesai" header
status_header_pattern = r'(<th className="p-5 text-\[10px\] font-black text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:text-green-700 transition" onClick=\{.*?handleSort\(\'status\'\).*?>)'
content = re.sub(status_header_pattern, r'<th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Pesanan Selesai</th>\n                                    \1', content)

# 2. Add "No" column row and map index
map_pattern = r'sortedRegistrations\.map\(\(reg\) => \{'
content = content.replace(map_pattern, 'sortedRegistrations.map((reg, index) => {')

checkbox_td_pattern = r'(<td className="p-5">\s*<input\s*type="checkbox"\s*className="w-4 h-4 rounded border-gray-300 text-green-700 focus:ring-green-500"\s*checked=\{selectedIds\.includes\(reg\.id\)\}\s*onChange=\{.*?handleSelectOne\(reg\.id\).*?\}\s*/>\s*</td>)'

content = re.sub(checkbox_td_pattern, r'\1\n                                                <td className="p-5 text-xs text-gray-500 font-bold text-center">\n                                                    {sortedRegistrations.length - index}\n                                                </td>', content)

# Add "Pesanan Selesai" checkbox row
aksi_td_pattern = r'(<td className="p-5 text-right">\s*<div className="flex flex-col items-end gap-1\.5">)'

pesanan_td = """<td className="p-5 text-center">
                                                    <label className="flex items-center justify-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={reg.is_order_completed || false}
                                                            onChange={async (e) => {
                                                                const checked = e.target.checked;
                                                                try {
                                                                    await toggleOrderCompleted(reg.id);
                                                                    setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, is_order_completed: checked } : r));
                                                                } catch(err) {
                                                                    console.error(err);
                                                                    alert('Gagal mengupdate status pesanan.');
                                                                }
                                                            }}
                                                            className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500 transition-all cursor-pointer"
                                                        />
                                                    </label>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <div className="flex flex-col items-end gap-1.5">"""
                                                    
content = re.sub(aksi_td_pattern, pesanan_td, content)

# 3. Format form responses to dash list
response_pattern = r'Array\.isArray\(value\) \?\s*\(\s*<div className="flex flex-wrap gap-1">\s*\{value\.map\(v => <span key=\{v\} className="px-2 py-0\.5 bg-gray-100 rounded text-\[10px\] font-medium">\{v\}</span>\)\}\s*</div>\s*\)\s*:\s*\(\s*<span className="line-clamp-2 italic">\{value \|\| \'-\'\}</span>\s*\)'

new_response = """Array.isArray(value) ? (
                                                                <ul className="list-none space-y-0.5">
                                                                    {value.map(v => <li key={v} className="text-[10px] font-medium">- {v}</li>)}
                                                                </ul>
                                                            ) : (
                                                                (typeof value === 'string' && value.includes(',')) ? (
                                                                    <ul className="list-none space-y-0.5">
                                                                        {value.split(',').map(v => <li key={v.trim()} className="text-[10px] font-medium">- {v.trim()}</li>)}
                                                                    </ul>
                                                                ) : (
                                                                    <span className="line-clamp-2 italic text-[11px]">- {value || '-'}</span>
                                                                )
                                                            )"""

content = re.sub(response_pattern, new_response, content)

with open('src/pages/admin/EventRegistrationSubmissionPage.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updates applied to EventRegistrationSubmissionPage.js")
