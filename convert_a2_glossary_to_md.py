import os
import re
import time
import fitz
import google.generativeai as genai
from dotenv import load_dotenv

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/KLIK_A2_Ef_Glossary.pdf"
MD_OUTPUT_1 = "/Users/johnsmacbook/Documents/antigravity IDE/Greek book/KLIK_A2_Ef_Glossary.md"
MD_OUTPUT_2 = os.path.join(PROJECT_DIR, "materials", "KLIK_A2_Ef_Glossary.md")

# Load API Key
load_dotenv(os.path.join(PROJECT_DIR, ".env"))
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    load_dotenv(os.path.join(PROJECT_DIR, "backend", ".env"))
    api_key = os.getenv("GEMINI_API_KEY")

if not api_key or api_key == "YOUR_GEMINI_API_KEY_HERE":
    raise ValueError("GEMINI_API_KEY is not configured in .env.")

genai.configure(api_key=api_key)

def convert_page_to_md(page_idx, text):
    prompt = f"""
You are an AI assistant formatting a Greek-English Glossary page to clean Markdown.
The source text is extracted from page {page_idx+1} of a PDF glossary. 

Please format the vocabulary entries into a clean Markdown list.
Ensure that:
1. Greek words, articles, and English translations are kept exactly.
2. Standard items are formatted as bullet points:
   * **Greek word, article** = English translation
3. Remove page numbers or running page header ranges (like "αβγό, το – αποφασίζω") from the main list, but start with a header at the top of the page section like:
   ## Page {page_idx+1} (Physical PDF Page {page_idx+1})
4. Keep alphabet letters (like "Α, α = άλφα") separate and clear.

Return ONLY the Markdown content for this page. Do not include markdown code block backticks or fences.

Here is the source text from the PDF:
{text}
"""
    for i in range(3):
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            print(f"Error converting page {page_idx} (attempt {i+1}/3): {e}")
            time.sleep(3)
    return f"## Page {page_idx+1} (Physical PDF Page {page_idx+1})\n\n[Error converting page text]\n\n"

def main():
    if not os.path.exists(PDF_PATH):
        print(f"PDF not found at {PDF_PATH}")
        return

    print(f"Opening PDF glossary from {PDF_PATH}...")
    doc = fitz.open(PDF_PATH)
    total_pages = len(doc)
    print(f"Total pages to process: {total_pages}")

    md_content = []
    md_content.append("# KLIK_A2_Ef_Glossary\n")
    md_content.append(f"*Note: This document was auto-generated via Gemini 2.5 Flash from {os.path.basename(PDF_PATH)}.*\n\n---\n\n")

    for idx in range(total_pages):
        print(f"Processing page {idx+1}/{total_pages}...")
        page_text = doc[idx].get_text()
        
        # If it's a cover or introductory page and has very little text, we can convert it normally
        page_md = convert_page_to_md(idx, page_text)
        md_content.append(page_md)
        md_content.append("\n\n---\n\n")
        time.sleep(1) # rate limiting protection

    full_md = "".join(md_content)

    # Save to both locations
    print(f"Saving Markdown to {MD_OUTPUT_1}...")
    os.makedirs(os.path.dirname(MD_OUTPUT_1), exist_ok=True)
    with open(MD_OUTPUT_1, "w", encoding="utf-8") as f:
        f.write(full_md)

    print(f"Saving Markdown to {MD_OUTPUT_2}...")
    os.makedirs(os.path.dirname(MD_OUTPUT_2), exist_ok=True)
    with open(MD_OUTPUT_2, "w", encoding="utf-8") as f:
        f.write(full_md)

    print("Successfully converted PDF to MD and saved in both locations.")

if __name__ == "__main__":
    main()
