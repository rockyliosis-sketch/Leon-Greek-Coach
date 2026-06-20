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
        "filename": "Glossary_A1_kids.pdf",
        "reverse": False,
        "md_name": "Glossary_A1_kids.md",
        "out_md": "Glossary_A1_kids_impeccable.md"
    },
    {
        "filename": "（已压缩）LEON_S GREEK TEXTBOOK A1-A.pdf",
        "reverse": True,
        "md_name": "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A.md",
        "out_md": "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-A_impeccable.md"
    },
    {
        "filename": "（已压缩）LEON_S GREEK TEXTBOOK A1-B.pdf",
        "reverse": True,
        "md_name": "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B.md",
        "out_md": "（已压缩）LEON_S_GREEK_TEXTBOOK_A1-B_impeccable.md"
    },
    {
        "filename": "（已压缩）LEON_S GREEK TEXTBOOK A2.pdf",
        "reverse": True,
        "md_name": "（已压缩）LEON_S_GREEK_TEXTBOOK_A2.md",
        "out_md": "（已压缩）LEON_S_GREEK_TEXTBOOK_A2_impeccable.md"
    }
]

PROMPT = """You are a rigorous Quality Control Editor following the 'impeccable' skill guidelines.
Your task is to perform a 'secondary check' (二次核查) on the provided Markdown transcription of a Greek textbook, comparing it strictly to the provided original PDF.

Ensure flawless execution, high-precision logical structures, error-free writing, and premium professional standards:
1. Zero Placeholders & Flawless Accuracy: Fix any OCR misspellings, especially Greek accent marks (ά, έ, ή, ί, ό, ύ, ώ, ϊ, ϋ, ΐ, ΰ). If the first pass produced garbage like `εὔῆηνικά`, correct it completely based on the PDF.
2. Formatting & Structural Integrity: Use clear, nested Markdown headings (##, ###). Ensure lists and tables are perfectly formatted. If dialogues or exercises are present, make them visually distinct and clean.
3. Logic & Accuracy Review: Cross-check every single page to ensure no content is dropped or skipped. The page order must be correct.
4. Output: ONLY output the final, corrected, impeccable Markdown text. Do NOT add conversational fillers or explanations.
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
    md_path = os.path.join(PDF_DIR, item["md_name"])
    out_md_path = os.path.join(PDF_DIR, item["out_md"])
    
    if not os.path.exists(pdf_path) or not os.path.exists(md_path):
        print(f"Skipping {item['filename']}, PDF or MD not found.")
        continue
        
    print(f"\n--- Impeccable Verification for {item['filename']} ---")
    
    upload_path = pdf_path
    temp_reversed_path = os.path.join(PDF_DIR, "temp_reversed_impeccable.pdf")
    if item["reverse"]:
        reverse_pdf_and_save(pdf_path, temp_reversed_path)
        upload_path = temp_reversed_path
        
    print(f"Uploading PDF {upload_path} to Gemini...")
    try:
        uploaded_pdf = client.files.upload(file=upload_path, config={'display_name': item["filename"]})
        print(f"Uploaded PDF as: {uploaded_pdf.name}")
        
        print(f"Uploading MD {md_path} to Gemini...")
        uploaded_md = client.files.upload(file=md_path, config={'display_name': item["md_name"]})
        print(f"Uploaded MD as: {uploaded_md.name}")
        
        time.sleep(5)
        
        print("Sending generation request to Gemini (with retries)...")
        max_retries = 5
        for attempt in range(max_retries):
            try:
                # Using gemini-2.5-pro for the impeccable check as it requires higher precision reasoning
                response = client.models.generate_content(
                    model='gemini-2.5-pro',
                    contents=[uploaded_pdf, uploaded_md, PROMPT]
                )
                break
            except Exception as api_err:
                if '503' in str(api_err) or '429' in str(api_err):
                    if attempt < max_retries - 1:
                        sleep_time = (attempt + 1) * 30
                        print(f"API busy or rate limited ({api_err}). Retrying in {sleep_time} seconds...")
                        time.sleep(sleep_time)
                    else:
                        raise api_err
                else:
                    raise api_err
        
        print("Writing perfect response to markdown...")
        with open(out_md_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
            
        print(f"Successfully wrote {out_md_path}")
        
        # Replace the original MD with the impeccable one
        os.rename(out_md_path, md_path)
        print(f"Replaced {md_path} with the verified flawless version.")
        
    except Exception as e:
        print(f"Error processing {item['filename']}: {e}")
        
    finally:
        try:
            if 'uploaded_pdf' in locals():
                client.files.delete(name=uploaded_pdf.name)
            if 'uploaded_md' in locals():
                client.files.delete(name=uploaded_md.name)
                print("Deleted remote files.")
        except Exception as cleanup_err:
            print(f"Cleanup error: {cleanup_err}")
            
        if item["reverse"] and os.path.exists(temp_reversed_path):
            os.remove(temp_reversed_path)
            
        time.sleep(15)

print("\nAll impeccable verifications complete.")
