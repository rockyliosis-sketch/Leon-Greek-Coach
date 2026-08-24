import urllib.request
import json

url = "https://firestore.googleapis.com/v1/projects/leon-greek-coach/databases/(default)/documents/leon_greek_coach/shared_state"

try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        print("Success! Data fetched.")
        fields = data.get("fields", {})
        
        # Parse custom_vocab
        custom_vocab_val = fields.get("custom_vocab", {}).get("arrayValue", {}).get("values", [])
        print(f"Number of custom vocab words: {len(custom_vocab_val)}")
        a2_36_words = []
        for w in custom_vocab_val:
            wd = w.get("mapValue", {}).get("fields", {})
            book_id = wd.get("book_id", {}).get("stringValue", "")
            unit = wd.get("unit", {}).get("integerValue", "0")
            note_date = wd.get("note_date", {}).get("stringValue", "")
            if book_id.upper() == "A2" and str(unit) == "36":
                a2_36_words.append((wd.get("word_greek", {}).get("stringValue"), note_date))
        print(f"A2_36 words: {a2_36_words}")
        
        # Parse unit_study_dates
        unit_study_dates_map = fields.get("unit_study_dates", {}).get("mapValue", {}).get("fields", {})
        print(f"A2_36 study date: {unit_study_dates_map.get('A2_36', {}).get('stringValue', 'NOT_FOUND')}")
        print(f"A2_35 study date: {unit_study_dates_map.get('A2_35', {}).get('stringValue', 'NOT_FOUND')}")
            
except Exception as e:
    print(f"Error: {e}")
