import requests
import json

URL = "https://use.api.co.id/regional/indonesia/provinces"
HEADERS = {"x-api-co-id": "q4joEsDR64zm4Bz4yl7C5lhFVU7ZytkUC4nJcDPRrNo8AtP5mc"}

try:
    response = requests.get(URL, headers=HEADERS, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
