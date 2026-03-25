# Strava Ride Tracker

![Preview](/docs/assets/preview.png)
A simple web app to analyze my Strava history and compare against regional bike networks in Metro Vancouver/Greater Victoria.

link: https://markedwardson.com/strava-ride-tracker/

## Development - Requirements:
1. Create a `.env` file at the project root with the required environment variables:

```env
STRAVA_CLIENT_ID="<your-strava-client-id>"
STRAVA_CLIENT_SECRET="<your-strava-client-secret>"
VITE_STRAVA_MAPBOX_TOKEN="<your-mapbox-public-token>"
VITE_BLOB_BASE="https://<your-storage-account>.blob.core.windows.net"
AZURE_STORAGE_CONNECTION_STRING="<your-blob-connection-string>"
```

2. Create a [Strava API app](https://developers.strava.com/) and add your `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` values to `.env`.