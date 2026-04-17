import time
import requests
from dotenv import load_dotenv
import os
import logging

from azure_blob_helper import BlobHelper
public_blob = BlobHelper('public')
private_blob = BlobHelper('private')

load_dotenv()

my_var = os.getenv('MY_VAR')
#read and load .env file

CLIENT_ID = os.getenv('STRAVA_CLIENT_ID')
CLIENT_SECRET = os.getenv('STRAVA_CLIENT_SECRET')

logging.basicConfig(level=logging.INFO)

def update_access_tokens():

    credentials = private_blob.load_data("strava_credentials.json")
    access_token = credentials["access_token"]
    athlete_id = credentials["athlete"]["id"]
    expires_at = credentials["expires_at"]
    
    if expires_at < int(time.time()):
        logging.info("Short-lived access token has expired. Refreshing...")

        url = "https://www.strava.com/oauth/token"

        params = {
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": credentials["refresh_token"],
        }

        response = requests.post(url, data=params)
        if response.status_code == 200:
            logging.info("Token refreshed successfully.")
            #update credentials.json with new token data, selectively updating only the relevant fields
            new_data = response.json()
            credentials["access_token"] = new_data["access_token"]
            credentials["refresh_token"] = new_data["refresh_token"]
            credentials["expires_at"] = new_data["expires_at"]
            private_blob.save_data(credentials, "strava_credentials.json")

        else:
            logging.error("Failed to refresh token.")
            logging.error(response.text)
            return None
    else:
        logging.info("Access token is still valid.")
    
    return credentials["access_token"]

def retrieve_activities():
    access_token = update_access_tokens()

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
                logging.info("No more activities found.")
                break

            all_activities.extend(data)
            logging.info(f"Retrieved page {page} with {len(data)} activities.")
        
        else:
            logging.error(f"Failed to retrieve activities: {response.status_code}")
            logging.error(response.text)
            return None
        
    #write to blob storage as json
    public_blob.save_data(all_activities, "strava_raw_data.json")
    logging.info(f"Total activities retrieved and saved to blob: {len(all_activities)}")
    return

if __name__ == "__main__":
    retrieve_activities()