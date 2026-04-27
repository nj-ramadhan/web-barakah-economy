import base64
import os
import sys

# Mocking the logic from whatsapp_service.py
def detect_mime(file_data_base64):
    mime_type = 'application/pdf'
    if ',' in file_data_base64:
        header, payload = file_data_base64.split(',', 1)
        try:
            mime_type = header.split(':')[1].split(';')[0]
        except: pass
    return mime_type

# Test cases
tests = [
    ("data:image/jpeg;base64,123", "image/jpeg"),
    ("data:image/png;base64,123", "image/png"),
    ("data:application/pdf;base64,123", "application/pdf"),
    ("raw_base64_no_header", "application/pdf"),
]

for input_val, expected in tests:
    result = detect_mime(input_val)
    print(f"Input: {input_val[:20]}... -> Result: {result} (Expected: {expected})")
    assert result == expected

print("All tests passed!")
