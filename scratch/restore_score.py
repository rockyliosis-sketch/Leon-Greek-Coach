import urllib.request
import json

url = "https://firestore.googleapis.com/v1/projects/leon-greek-coach/databases/(default)/documents/leon_greek_coach/shared_state?updateMask.fieldPaths=score"

# In Firestore REST API, PATCH updates specific fields using updateMask
body = {
    "fields": {
        "score": {
            "integerValue": "535"
        }
    }
}

req = urllib.request.Request(
    url,
    data=json.dumps(body).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='PATCH'
)

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print("Successfully restored score in Firestore!")
        print("Updated fields:", res.get("fields", {}).get("score"))
except Exception as e:
    print("Error updating Firestore score:", e)
