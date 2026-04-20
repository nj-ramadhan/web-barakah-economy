import requests

API_URL = "http://localhost:8000/api"
USER_ID = 1 # Assuming user ID 1
ACCESS_TOKEN = "YOUR_ACCESS_TOKEN" # I'll need to use the token from the user's session if I were the user, but I'll check my logs.

def test_profile_update():
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
    }
    data = {
        "address_subdistrict_id": "3216061", # Example subdistrict ID
        "address_subdistrict_name": "Tambun Selatan",
    }
    # Using PATCH
    response = requests.patch(f"{API_URL}/api/profiles/{USER_ID}/", data=data, headers=headers)
    print(response.json())

# Since I can't easily get an access token here, I'll check the views.py for profiles.
