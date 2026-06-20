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

CHUNK_SIZE = 10

PROMPT = """You are a rigorous Quality Control Editor and expert Greek language OCR assistant following the 'impeccable' skill guidelines.
I have uploaded a scanned PDF chunk of a Greek language learning textbook.
Your task is to extract ALL the text from this document and format it strictly as perfect Markdown.

Ensure flawless execution, high-precision logical structures, error-free writing, and premium professional standards:
1. Zero Placeholders & Flawless Accuracy: Extract the text with ABSOLUTE ACCURACY. Pay special attention to Greek characters, especially the accents (Tonos, like ά, έ, ή, ί, ό, ύ, ώ, ϊ, ϋ). 
2. Formatting & Structural Integrity: Use clear, nested Markdown headings (##, ###). Ensure lists and tables are perfectly formatted. If dialogues or exercises are present, make them visually distinct and clean. Keep blank lines for fill-in-the-blank questions (e.g. "________").
3. Logic & Accuracy Review: Cross-check every single page to ensure no content is dropped or skipped. The page order must be correct. Transcribe English text exactly as well.
4. Output: ONLY output the final, corrected, impeccable Markdown text. Do NOT add conversational fillers or explanations.
"""

def split_and_reverse_pdf(input_path, chunk_dir, base_filename, reverse):
    doc = fitz.open(input_path)
    total_pages = len(doc)
    
    # If reverse is True, we want to read from the end to the beginning
    page_order = list(range(total_pages - 1, -1, -1)) if reverse else list(range(total_pages))
    
    chunks = []
    
    for i in range(0, total_pages, CHUNK_SIZE):
        chunk_pages = page_order[i:i + CHUNK_SIZE]
        chunk_doc = fitz.open()
        
        for p in chunk_pages:
            chunk_doc.insert_pdf(doc, from_page=p, to_page=p)
            
        chunk_filename = f"{base_filename}_chunk_{i//CHUNK_SIZE}.pdf"
        chunk_path = os.path.join(chunk_dir, chunk_filename)
        chunk_doc.save(chunk_path)
        chunk_doc.close()
        
        chunks.append(chunk_path)
        
    doc.close()
    return chunks

for item in FILES_TO_PROCESS:
    pdf_path = os.path.join(PDF_DIR, item["filename"])
    out_md_path = os.path.join(PDF_DIR, item["out_md"])
    
    if not os.path.exists(pdf_path):
        print(f"Skipping {pdf_path}, file not found.")
        continue
        
    print(f"\n--- Processing {item['filename']} ---")
    
    chunk_dir = os.path.join(PDF_DIR, f"temp_chunks_{item['filename'].replace('.pdf', '')}")
    os.makedirs(chunk_dir, exist_ok=True)
    
    # Clear the output MD file first to start fresh
    with open(out_md_path, 'w', encoding='utf-8') as f:
        f.write(f"# {item['filename']}\n\n")
    
    try:
        chunks = split_and_reverse_pdf(pdf_path, chunk_dir, "chunk", item["reverse"])
        print(f"Split PDF into {len(chunks)} chunks of max {CHUNK_SIZE} pages.")
        
        for idx, chunk_path in enumerate(chunks):
            print(f"Uploading chunk {idx+1}/{len(chunks)} to Gemini...")
            try:
                uploaded_file = client.files.upload(file=chunk_path, config={'display_name': f"Chunk_{idx}"})
                print(f"Uploaded as: {uploaded_file.name}")
                
                time.sleep(5)
                
                print("Sending generation request to Gemini Pro (with retries)...")
                max_retries = 6
                chunk_markdown = ""
                for attempt in range(max_retries):
                    try:
                        # Use Gemini 2.5 Pro for impeccable accuracy
                        response = client.models.generate_content(
                            model='gemini-2.5-pro',
                            contents=[uploaded_file, PROMPT]
                        )
                        chunk_markdown = response.text
                        break
                    except Exception as api_err:
                        if '503' in str(api_err) or '429' in str(api_err) or '500' in str(api_err) or 'Server disconnected' in str(api_err):
                            if attempt < max_retries - 1:
                                sleep_time = (attempt + 1) * 30
                                print(f"API busy/error ({api_err}). Retrying in {sleep_time}s (attempt {attempt + 1}/{max_retries})...")
                                time.sleep(sleep_time)
                            else:
                                raise api_err
                        else:
                            raise api_err
                
                print("Appending chunk response to markdown...")
                with open(out_md_path, 'a', encoding='utf-8') as f:
                    f.write(f"\n\n<!-- CHUNK {idx+1}/{len(chunks)} START -->\n\n")
                    f.write(chunk_markdown)
                    f.write(f"\n\n<!-- CHUNK {idx+1}/{len(chunks)} END -->\n\n")
                    
                print(f"Successfully appended chunk {idx+1} to {out_md_path}")
                
            except Exception as e:
                print(f"Error processing chunk {idx+1} of {item['filename']}: {e}")
            
            finally:
                try:
                    if 'uploaded_file' in locals():
                        client.files.delete(name=uploaded_file.name)
                        print(f"Deleted remote file {uploaded_file.name}")
                except Exception as cleanup_err:
                    print(f"Cleanup error: {cleanup_err}")
                
                # Clean up local chunk
                if os.path.exists(chunk_path):
                    os.remove(chunk_path)
                    
                print("Waiting 15 seconds before next chunk...")
                time.sleep(15)
                
    finally:
        if os.path.exists(chunk_dir) and not os.listdir(chunk_dir):
            os.rmdir(chunk_dir)

print("\nAll impeccable chunk processing complete.")
