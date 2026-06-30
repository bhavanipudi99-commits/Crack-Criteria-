import re
import os

input_file = "/Users/venkatarjun/work /medical-game.nosync/scratch/harrison_14_2.txt"
output_file = "/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison MCQ/Harrison Cardiology MCQ/Harrison MCQ HTML/Infective endocarditis.md"

with open(input_file, "r") as f:
    text = f.read()

# Extract only the Infective Endocarditis section
# It starts at "Infective endocarditis" and ends at the next major section "Rheumatic fever" (if there is one).
if "Infective endocarditis" in text:
    text = text.split("Infective endocarditis")[1]
if "Rheumatic fever" in text:
    text = text.split("Rheumatic fever")[0]

lines = [l.strip() for l in text.split("\n") if l.strip()]

mcqs = []
current_mcq = {"question": "", "options": [], "answer": "", "explanation": ""}
state = "question"

for line in lines:
    if line.startswith("Answer.") or line.startswith("Answer "):
        current_mcq["answer"] = line.replace("Answer.", "").replace("Answer ", "").strip()
        state = "explanation"
    elif re.match(r"^[A-E]\.\s", line):
        if state == "question":
            state = "options"
        current_mcq["options"].append(line)
    else:
        if state == "question":
            if current_mcq["question"]:
                current_mcq["question"] += " " + line
            else:
                current_mcq["question"] = line
        elif state == "options":
            # Sometimes an option wraps to the next line
            current_mcq["options"][-1] += " " + line
        elif state == "explanation":
            # If we hit a new question (which is typically just text since they are not numbered),
            # wait, how do we know a new question started?
            # A new question starts if the next lines eventually lead to A., B.
            # It's better to split the text by "Answer. [A-E]" first!
            pass

# Let's use a more robust regex-based splitting by finding all "Answer."
# Actually, let's just split by "Answer."

blocks = re.split(r"(Answer\.\s*[A-E].*?)\n", text)
# blocks will have [Q1+options, Answer1, Exp1+Q2+options, Answer2, ...]

parsed_mcqs = []

# Find all answer indices in the text
matches = list(re.finditer(r"Answer\.\s*([A-E])(.*?)\n", text))
start = 0

for i, match in enumerate(matches):
    ans_letter = match.group(1)
    ans_citation = match.group(2).strip()
    ans_full = ans_letter + " " + ans_citation
    
    # Text before the answer is the question + options (and explanation of previous if i > 0)
    chunk = text[start:match.start()].strip()
    
    if i == 0:
        q_and_opt = chunk
        explanation = ""
    else:
        # The chunk contains the explanation of the PREVIOUS question, followed by the current question + options
        # How to separate explanation from the new question?
        # A new question usually starts after a blank line, or ends before A. B. C.
        # But wait, we can just look back from the options A. B. C. D.
        # The first option is A.
        opt_start = re.search(r"\bA\.\s", chunk)
        if opt_start:
            # We assume everything before the sentence containing A. is explanation, or question.
            # Let's just find the first "A." in this chunk. But wait, "A." could be in the explanation!
            # Let's search from the end for the options block.
            # The options are usually A., B., C., D.
            # Let's find the last occurrence of A. followed by B. C. D.
            pass

def extract_from_text(t):
    # Let's split by Answer. [A-E]
    mcqs = []
    # Split text into segments based on Answer. X or Answer X
    pattern = re.compile(r"Answer\.?\s*([A-E])(.*?)(?=\n|$)")
    
    last_idx = 0
    segments = []
    for m in pattern.finditer(t):
        segments.append({
            "before": t[last_idx:m.start()].strip(),
            "answer": m.group(1),
            "citation": m.group(2).strip()
        })
        last_idx = m.end()
    
    # the last segment has explanation
    tail = t[last_idx:].strip()
    
    for i in range(len(segments)):
        before_text = segments[i]["before"]
        ans = segments[i]["answer"]
        cit = segments[i]["citation"]
        
        # The before_text contains Explanation (from prev) + Question + Options
        # If i == 0, it's just Question + Options
        
        # Find where options start: look for the LAST "\nA."
        last_a_idx = before_text.rfind('\nA. ')
        if last_a_idx == -1:
            last_a_idx = before_text.rfind('\nA.')
        if last_a_idx == -1 and before_text.startswith('A.'):
            last_a_idx = 0

        if last_a_idx != -1:
            q_part = before_text[:last_a_idx].strip()
            opt_part = before_text[last_a_idx:].strip()
            
            # Now, if i > 0, q_part contains prev explanation + current question
            # The previous explanation and current question might be separated by \n\n or some pattern.
            # In our dump, questions usually start with a capitalized letter, but so do explanations.
            # Let's check the previous item's explanation.
            # Actually, since we don't have delimiters, we can split q_part by checking if there is a double newline.
            # Or we can just assign all of q_part to the current question if i == 0.
            # If i > 0, we can assign the first paragraph to the previous explanation, and the rest to the current question?
            # Let's just split by double newline.
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
            # Fallback
            if i > 0:
                mcqs[i-1]["explanation"] = before_text
            mcqs.append({"question": "PARSE ERROR", "options": "", "answer": ans, "citation": cit, "explanation": ""})
            
    if mcqs:
        mcqs[-1]["explanation"] = tail
        
    return mcqs

final_mcqs = extract_from_text(text)

md_lines = ["# Infective endocarditis MCQs\n"]
for i, m in enumerate(final_mcqs):
    md_lines.append(f"### {i+1}. {m['question'].replace(chr(10), ' ')}")
    md_lines.append("")
    # Options
    for opt in m['options'].split("\n"):
        if re.match(r"^[A-E]\.", opt):
            md_lines.append(f"- {opt}")
        else:
            md_lines.append(f"  {opt}")
    md_lines.append("")
    md_lines.append(f"**Answer:** {m['answer']} {m['citation']}")
    md_lines.append("")
    md_lines.append(f"**Explanation:**\n{m['explanation']}")
    md_lines.append("\n---\n")

with open(output_file, "w") as f:
    f.write("\n".join(md_lines))

print(f"Successfully wrote {len(final_mcqs)} MCQs to {output_file}")
