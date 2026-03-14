import json
import time
import requests
from dotenv import load_dotenv
import os

load_dotenv()

my_var = os.getenv('MY_VAR')
#read and load .env file

CLIENT_ID = os.getenv('STRAVA_CLIENT_ID')
CLIENT_SECRET = os.getenv('STRAVA_CLIENT_SECRET')

credentials = json.load(open("strava_credentials.json"))

access_token = credentials["access_token"]
athlete_id = credentials["athlete"]["id"]
expires_at = credentials["expires_at"]

def update_access_tokens():
    if expires_at < int(time.time()):
        print("Short-lived access token has expired. Refreshing...")

        url = "https://www.strava.com/oauth/token"

        params = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": credentials["refresh_token"],
        }

        response = requests.post(url, data=params)
        if response.status_code == 200:
            print("Token refreshed successfully.")
            #update credentials.json with new token data, selectively updating only the relevant fields
            new_data = response.json()
            credentials["access_token"] = new_data["access_token"]
            credentials["refresh_token"] = new_data["refresh_token"]
            credentials["expires_at"] = new_data["expires_at"]
            with open("strava_credentials.json", "w") as f:
                json.dump(credentials, f)

        else:
            print("Failed to refresh token.")
            print(response.text)

update_access_tokens()

def retrieve_activities():
    url = f"https://www.strava.com/api/v3/athlete/activities"

    headers = {
        "accept": "application/json",
        "Authorization": f"Bearer {access_token}"
    }

    all_activities = []

    for page in range(1, 100):

        params = {
            "page": page,
            "per_page": 200
        }

        response = requests.get(url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            if not data:
                print("No more activities found.")
                break

            all_activities.extend(data)
            print(f"Retrieved page {page} with {len(data)} activities.")
        
        else:
            print(f"Failed to retrieve activities: {response.status_code}")
            print(response.text)
            return None
        
    return all_activities

activities = retrieve_activities()

#write to json
with open("activities.json", "w") as f:
    json.dump(activities, f)