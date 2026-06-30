import re
import os
import fitz
import csv

md_dir = "/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison MCQ/Harrison Cardiology MCQ/Harrison MCQ HTML"
csv_dir = "/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison MCQ/Harrison Cardiology MCQ/Harrison MCQ CSV"

def extract_from_text(t):
    mcqs = []
    # Match Ans., Answer., Answer, Ans, etc.
    pattern = re.compile(r"Ans(?:wer)?\.?\s*([A-E])(.*?)(?=\n|$)")
    
    last_idx = 0
    segments = []
    for m in pattern.finditer(t):
        segments.append({
            "before": t[last_idx:m.start()].strip(),
            "answer": m.group(1),
            "citation": m.group(2).strip()
        })
        last_idx = m.end()
    
    tail = t[last_idx:].strip()
    
    for i in range(len(segments)):
        before_text = segments[i]["before"]
        ans = segments[i]["answer"]
        cit = segments[i]["citation"]
        
        last_a_idx = before_text.rfind('\nA. ')
        if last_a_idx == -1:
            last_a_idx = before_text.rfind('\nA.')
        if last_a_idx == -1 and before_text.startswith('A.'):
            last_a_idx = 0

        if last_a_idx != -1:
            q_part = before_text[:last_a_idx].strip()
            opt_part = before_text[last_a_idx:].strip()
            
            if i > 0:
                parts = re.split(r"\n\s*\n", q_part.strip())
                if len(parts) >= 2:
                    curr_q = parts[-1].strip()
                    prev_exp = "\n\n".join(p.strip() for p in parts[:-1]).strip()
                else:
                    prev_exp = ""
                    curr_q = q_part.strip()
                
                mcqs[i-1]["explanation"] = prev_exp
                mcqs.append({"question": curr_q, "options": opt_part, "answer": ans, "citation": cit, "explanation": ""})
            else:
                mcqs.append({"question": q_part, "options": opt_part, "answer": ans, "citation": cit, "explanation": ""})
        else:
            if i > 0:
                mcqs[i-1]["explanation"] = before_text
            mcqs.append({"question": "PARSE ERROR", "options": "", "answer": ans, "citation": cit, "explanation": ""})
            
    if mcqs:
        mcqs[-1]["explanation"] = tail
        
    return mcqs

for i in range(4):
    pdf_path = f"/tmp/harrison_batch14_{i}.pdf"
    if not os.path.exists(pdf_path):
        continue
    
    doc = fitz.open(pdf_path)
    text = "\n".join([page.get_text("text") for page in doc])
    
    # Title is usually the first non-empty line
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if not lines:
        continue
    title = lines[0]
    
    # Remove title from text to avoid it becoming part of Q1
    text = text.replace(title, "", 1).strip()
    
    # Also sometimes there's a "MCQs BASED ON" line
    if "MCQs BASED ON" in text:
        text = text.replace("MCQs BASED ON", "", 1).strip()
    
    # Handle "Infective endocarditis" which we already perfected manually? No, it's fine to regenerate it, we just lose the table formatting which we can redo.
    
    final_mcqs = extract_from_text(text)
    print(f"Processed {title}: Extracted {len(final_mcqs)} MCQs")
    
    # Write Markdown
    md_file = os.path.join(md_dir, f"{title}.md")
    md_lines = [f"# {title} MCQs\n"]
    for idx, m in enumerate(final_mcqs):
        q_clean = m['question'].replace(chr(10), ' ')
        md_lines.append(f"### Question {idx+1}\n")
        md_lines.append(q_clean)
        md_lines.append("")
        for opt in m['options'].split("\n"):
            md_lines.append(opt.strip())
        md_lines.append("")
        md_lines.append(f"> [!success]- **Reveal Answer & Explanation**")
        md_lines.append(f"> Answer: {m['answer']}")
        md_lines.append(f"> ")
        md_lines.append(f"> Explanation:")
        
        # Add citation if exists
        cit = m.get('citation', '').strip()
        exp = m.get('explanation', '').strip()
        if cit:
            exp_text = f"({cit}) {exp}"
        else:
            exp_text = exp
            
        for line in exp_text.split("\n"):
            md_lines.append(f"> {line.strip()}")
        md_lines.append("\n---\n")

    with open(md_file, "w") as f:
        f.write("\n".join(md_lines))
        
    # Write CSV
    csv_file = os.path.join(csv_dir, f"{title}.csv")
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        for m in final_mcqs:
            q_clean = m['question'].replace(chr(10), ' ')
            front = q_clean + "\n\n" + m['options']
            back = f"Answer: {m['answer']} {m['citation']}"
            if m['explanation']:
                back += "\n\nExplanation:\n" + m['explanation'].replace("\n", " ")
            writer.writerow([front, back])
