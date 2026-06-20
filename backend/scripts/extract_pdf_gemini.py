import os
import sys
import time
import fitz  # PyMuPDF
from google import genai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
    sys.exit(1)

client = genai.Client(api_key=api_key)

PDF_DIR = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book"

FILES_TO_PROCESS = [
    {
        "filename": "（已压缩）LEON_S GREEK TEXTBOOK A1-A.pdf",
        "reverse": True,
        "out_md": "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md"
    },
    {
        "filename": "（已压缩）LEON_S GREEK TEXTBOOK A1-B.pdf",
        "reverse": True,
        "out_md": "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md"
    },
    {
        "filename": "（已压缩）LEON_S GREEK TEXTBOOK A2.pdf",
        "reverse": True,
        "out_md": "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md"
    },
    {
        "filename": "Glossary_A1_kids.pdf",
        "reverse": False,
        "out_md": "Glossary_A1_kids.md"
    }
]

PROMPT = """You are an expert Greek language OCR and transcription assistant.
I have uploaded a scanned PDF of a Greek language learning textbook.
Your task is to extract ALL the text from this document and format it strictly as Markdown.

Instructions:
1. Extract the text with ABSOLUTE ACCURACY. Pay special attention to Greek characters, especially the accents (Tonos, like ά, έ, ή, ί, ό, ύ, ώ).
2. Preserve the structure of the document: use headers (#, ##), lists, bold text, and tables where appropriate.
3. If there are dialogues, format them clearly.
4. If there are fill-in-the-blank questions, keep the blank lines (e.g. "________").
5. If there is English text, transcribe it exactly as well.
6. Do NOT add any conversational filler. ONLY output the extracted Markdown content.
7. Retain the page logical order as it appears in the provided file.
"""

def reverse_pdf_and_save(input_path, output_path):
    print(f"Reversing pages for {input_path}...")
    doc = fitz.open(input_path)
    new_doc = fitz.open()
    
    for page_num in range(len(doc) - 1, -1, -1):
        new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
        
    new_doc.save(output_path)
    doc.close()
    new_doc.close()
    print("Reversed PDF saved.")

for item in FILES_TO_PROCESS:
    pdf_path = os.path.join(PDF_DIR, item["filename"])
    out_md_path = os.path.join(PDF_DIR, item["out_md"])
    
    if not os.path.exists(pdf_path):
        print(f"Skipping {pdf_path}, file not found.")
        continue
        
    print(f"\n--- Processing {item['filename']} ---")
    
    upload_path = pdf_path
    
    if item["reverse"]:
        temp_reversed_path = os.path.join(PDF_DIR, "temp_reversed.pdf")
        reverse_pdf_and_save(pdf_path, temp_reversed_path)
        upload_path = temp_reversed_path
        
    print(f"Uploading {upload_path} to Gemini...")
    try:
        uploaded_file = client.files.upload(file=upload_path, config={'display_name': item["filename"]})
        print(f"Uploaded file '{uploaded_file.display_name}' as: {uploaded_file.name}")
        
        time.sleep(5)
        
        print("Sending generation request to Gemini (with retries)...")
        max_retries = 5
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[uploaded_file, PROMPT]
                )
                break
            except Exception as api_err:
                if '503' in str(api_err) or '429' in str(api_err):
                    if attempt < max_retries - 1:
                        sleep_time = (attempt + 1) * 30
                        print(f"API busy or rate limited ({api_err}). Retrying in {sleep_time} seconds (attempt {attempt + 1}/{max_retries})...")
                        time.sleep(sleep_time)
                    else:
                        raise api_err
                else:
                    raise api_err
        
        print("Writing response to markdown...")
        with open(out_md_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
            
        print(f"Successfully wrote {out_md_path}")
        
    except Exception as e:
        print(f"Error processing {item['filename']}: {e}")
        
    finally:
        try:
            if 'uploaded_file' in locals():
                client.files.delete(name=uploaded_file.name)
                print(f"Deleted remote file {uploaded_file.name}")
        except Exception as cleanup_err:
            print(f"Cleanup error: {cleanup_err}")
            
        if item["reverse"] and os.path.exists(temp_reversed_path):
            os.remove(temp_reversed_path)
            print("Cleaned up temporary local reversed PDF.")
            
        # Wait 15 seconds before the next file to respect free tier RPM limits
        print("Waiting 15 seconds before next file to avoid rate limits...")
        time.sleep(15)

print("\nAll processing complete.")
