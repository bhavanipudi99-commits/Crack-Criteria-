import fitz # PyMuPDF
import re

pdf_path = "/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison_Categorized_Notes/Cardiology/infective endocarditis notes harrison 22 .pdf"
doc = fitz.open(pdf_path)
text = ""
for page in doc:
    text += page.get_text("text")

print("First 1000 chars of raw PDF text:")
print(text[:1000])

# Just saving it for inspection
with open("/Users/venkatarjun/work /medical-game.nosync/scratch_pdf.txt", "w", encoding="utf-8") as f:
    f.write(text)
