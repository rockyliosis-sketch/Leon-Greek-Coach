import urllib.request
import json

url = "https://firestore.googleapis.com/v1/projects/leon-greek-coach/databases/(default)/documents/leon_greek_coach/shared_state"

try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        fields = data.get("fields", {})
        
        # Parse custom_vocab
        custom_vocab_val = fields.get("custom_vocab", {}).get("arrayValue", {}).get("values", [])
        print(f"Total custom vocab words found in Firestore: {len(custom_vocab_val)}")
        
        # Let's count by note_date
        by_date = {}
        for w in custom_vocab_val:
            wd = w.get("mapValue", {}).get("fields", {})
            word_greek = wd.get("word_greek", {}).get("stringValue", "")
            word_chinese = wd.get("word_chinese", {}).get("stringValue", "")
            book_id = wd.get("book_id", {}).get("stringValue", "")
            unit = wd.get("unit", {}).get("integerValue", wd.get("unit", {}).get("doubleValue", 0))
            note_date = wd.get("note_date", {}).get("stringValue", "No Date")
            
            if note_date not in by_date:
                by_date[note_date] = []
            by_date[note_date].append({
                "greek": word_greek,
                "chinese": word_chinese,
                "book": book_id,
                "unit": unit
            })
            
        print("\nBreakdown of custom vocab words by note_date:")
        for date, words in sorted(by_date.items()):
            print(f"\nDate: {date} (Count: {len(words)})")
            for w in words:
                print(f"  - {w['greek']} -> {w['chinese']} (Book: {w['book']}, Unit: {w['unit']})")
                
        # Parse unit_study_dates
        print("\nUnit study dates map:")
        unit_study_dates_map = fields.get("unit_study_dates", {}).get("mapValue", {}).get("fields", {})
        for k, v in sorted(unit_study_dates_map.items()):
            print(f"  {k}: {v.get('stringValue')}")
            
except Exception as e:
    print(f"Error: {e}")
