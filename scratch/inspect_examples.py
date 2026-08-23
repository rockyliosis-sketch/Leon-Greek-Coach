import json
import sqlite3
import re

with open("frontend/src/data/vocabulary.json", "r", encoding="utf-8") as f:
    data = json.load(f)

vocab = data.get("textbook_vocabulary", [])
print(f"Total vocab: {len(vocab)}")

auto_einai_count = 0
sentence_words = 0
for w in vocab:
    ex_gr = w.get("example_greek") or ""
    ex_zh = w.get("example_chinese") or ""
    w_gr = w.get("word_greek") or ""
    w_zh = w.get("word_chinese") or ""
    
    if "Αυτό είναι" in ex_gr:
        auto_einai_count += 1
    
    # Check if word_greek is already a sentence (contains punctuation or > 3 words)
    if any(p in w_gr for p in [".", ",", ";", "!", "·"]) or len(w_gr.split()) >= 4:
        sentence_words += 1

print(f"Entries with 'Αυτό είναι' in example_greek: {auto_einai_count}")
print(f"Entries where word_greek is already a full sentence/phrase: {sentence_words}")

# Show examples of bad pseudo-examples where word_greek is a sentence
print("\nSamples of corrupted sentence examples:")
count = 0
for w in vocab:
    ex_gr = w.get("example_greek") or ""
    ex_zh = w.get("example_chinese") or ""
    w_gr = w.get("word_greek") or ""
    w_zh = w.get("word_chinese") or ""
    if "Αυτό είναι" in ex_gr and len(w_gr.split()) >= 3:
        print(f"ID {w['id']}:")
        print(f"  word_greek: {w_gr}")
        print(f"  word_chinese: {w_zh}")
        print(f"  example_greek: {ex_gr}")
        print(f"  example_chinese: {ex_zh}")
        count += 1
        if count >= 10:
            break
