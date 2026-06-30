const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const inputDir = '/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison MCQ/Harrison Cardiology MCQ/Harrison MCQ CSV';
const outputDir = '/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison MCQ/Harrison Cardiology MCQ/Harrison MCQ HTML';

function extractQuestionsFromText(text) {
    const questions = [];
    
    // Find all occurrences of " A. " or "^A. "
    const regex = /(?:^|\s)(.*?)\s+A\.\s+(.*?)\s+B\.\s+(.*?)\s+C\.\s+(.*?)\s+D\.\s+(.*?)(?=\s+[A-Z].*?\s+A\.|$)/gsi;
    
    let match;
    let lastIndex = 0;
    while ((match = regex.exec(text)) !== null) {
        // match[1] = Question
        // match[2] = A
        // match[3] = B
        // match[4] = C
        // match[5] = D + Explanation
        
        // D + Explanation might contain another question if the regex lookahead failed, but the lookahead (?=...\sA\.) should catch it.
        // Let's refine the matching:
        // Actually, sometimes the next question doesn't perfectly match the lookahead.
        
        let qText = match[1].trim();
        let A = match[2].trim();
        let B = match[3].trim();
        let C = match[4].trim();
        let D_and_rest = match[5].trim();
        
        // If the question text starts with a previous explanation's remnant, we need to split it.
        // E.g., "Echocardiography confirms... All are true except"
        // It's hard to distinguish where explanation ends and next question begins. We'll just take the last sentence as the question if it's too long, or take the whole thing.
        // Actually, if we just output it as is, the user can read it. 
        
        questions.push({
            q: qText,
            options: { A, B, C, D: D_and_rest } // We'll clean up D_and_rest later
        });
    }
    
    return questions;
}

function processFile(filename) {
    const filePath = path.join(inputDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, { columns: false, skip_empty_lines: true, relax_column_count: true });
    
    let mdContent = `# ${filename.replace('.csv', '')}\n\n`;
    let qCount = 1;

    for (let row of records) {
        const rowText = row.join(' \n ');
        
        // Try to find hidden MCQs
        // Look for pattern: A. ... B. ... C. ... D. ...
        const mcqRegex = /(.*?)\s*A\.\s+(.*?)\s+B\.\s+(.*?)\s+C\.\s+(.*?)\s+D\.\s+(.*?)(?=(?:.*?)\s*A\.\s+|$)/gs;
        
        let matches = [...rowText.matchAll(mcqRegex)];
        
        if (matches.length > 0) {
            for (let m of matches) {
                let qText = m[1].trim();
                
                // If qText is very long, it might contain the explanation of the PREVIOUS question.
                // We can't perfectly split them, but we'll output them sequentially.
                // Usually the answer to the previous question is right before this.
                let A = m[2].trim();
                let B = m[3].trim();
                let C = m[4].trim();
                let D_and_rest = m[5].trim();
                
                // Separate D from explanation if possible by looking for "Answer: " or similar?
                // Often there is no "Answer: " because the PDF merger stripped it, or it's buried.
                
                mdContent += `### Question ${qCount++}\n\n`;
                mdContent += `${qText}\n\n`;
                mdContent += `A. ${A}\n`;
                mdContent += `B. ${B}\n`;
                mdContent += `C. ${C}\n`;
                mdContent += `D. ${D_and_rest}\n\n`;
                mdContent += `---\n\n`;
            }
        } else {
            // No A. B. C. D. found, just a standard flashcard
            const col1 = row[0] ? row[0].trim() : '';
            const col2 = row[1] ? row[1].trim() : '';
            
            if (col1 || col2) {
                mdContent += `### Question ${qCount++}\n\n`;
                mdContent += `${col1}\n\n`;
                if (col2) {
                    mdContent += `> [!success]- **Reveal Answer & Explanation**\n`;
                    col2.split('\n').forEach(line => {
                        mdContent += `> ${line}\n`;
                    });
                }
                mdContent += `\n---\n\n`;
            }
        }
    }
    
    const outPath = path.join(outputDir, filename.replace('.csv', '.md'));
    fs.writeFileSync(outPath, mdContent);
    console.log(`Processed ${filename}`);
}

processFile('Infective endocarditis.csv');
