import http.server
import webbrowser
import urllib.parse
import requests
import threading

import json

CLIENT_ID = "209627"
CLIENT_SECRET = "459105eed445bdc936d365c26fc3d8c9dbe10cf3"
REDIRECT_URI = "http://localhost:8000/callback"
PORT = 8000

auth_code = None  # Will be set by the callback handler

class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code

        # Parse the query string from the redirect URL
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"Authorization successful! You can close this tab.")
        else:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b"Authorization failed.")

    def log_message(self, format, *args):
        pass  # Suppress server logs


def get_authorization_code():
    # Build the Strava authorization URL
    params = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "approval_prompt": "auto",  # Use "force" to always show the consent screen
        "scope": "read,activity:read_all",
    })
    auth_url = f"https://www.strava.com/oauth/authorize?{params}"

    # Start the local callback server in a background thread
    server = http.server.HTTPServer(("localhost", PORT), CallbackHandler)
    thread = threading.Thread(target=server.handle_request)  # handle just ONE request
    thread.start()

    # Open the browser for the user to authorize
    print(f"Opening browser for Strava authorization...")
    webbrowser.open(auth_url)

    # Wait for the callback to be received
    thread.join()
    server.server_close()

    return auth_code


def exchange_code_for_token(code):
    response = requests.post("https://www.strava.com/oauth/token", data={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
    })
    return response.json()


def main():
    code = get_authorization_code()

    if code:
        print(f"Got authorization code: {code}")
        token_data = exchange_code_for_token(code)
        print(f"Access token: {token_data['access_token']}")
        print(f"Refresh token: {token_data['refresh_token']}")
        print(f"Expires at: {token_data['expires_at']}")

        with open("credentials.json", "w") as f:
            json.dump(token_data, f)
    else:
        print("Failed to get authorization code.")

    return

if __name__ == "__main__":
    main()