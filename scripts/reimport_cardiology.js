const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Database Configuration
const supabaseUrl = 'https://oymebajxxevwshtebfaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bWViYWp4eGV2d3NodGViZmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTk0MDEsImV4cCI6MjA5NTczNTQwMX0.YyZLquOAQLHvHcpZqev_rNIgO5cat7pxST1Vo5Ls488';
const supabase = createClient(supabaseUrl, supabaseKey);

// Folder config
const SUBJECT_NAME = "Harrison MCQ";
const CHAPTER_NAME = "Harrison Cardiology MCQ";
const MCQ_DIR = '/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison MCQ/Harrison Cardiology MCQ/Harrison MCQ HTML';

const parseMD = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  let currentQuestion = null;
  let mcqs = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim().match(/^(###\s+)?(Question\s+)?\d+[:.]?/i)) {
      if (currentQuestion && currentQuestion.questionText) mcqs.push(currentQuestion);
      currentQuestion = {
        questionText: '',
        options: [],
        answer: '',
        explanation: '',
        state: 'question'
      };
      continue;
    }
    
    if (!currentQuestion) continue;
    
    if (line.includes('[!success]')) {
      currentQuestion.state = 'answer_reveal';
      continue;
    }
    
    if (currentQuestion.state === 'question') {
      const optMatch = line.trim().match(/^([A-E])[\.\)]\s+(.*)/i);
      if (optMatch) {
        currentQuestion.options.push(line.trim());
      } else if (line.trim() !== '') {
        if (currentQuestion.options.length === 0) {
            currentQuestion.questionText += (currentQuestion.questionText ? '\n' : '') + line.trim();
        }
      }
    } else if (currentQuestion.state === 'answer_reveal') {
      const ansMatch = line.trim().match(/^\s*>?\s*Answer:\s*\*?\s*([A-E])/i);
      if (ansMatch) {
        currentQuestion.answer = ansMatch[1].toUpperCase();
      } else if (line.trim().match(/^\s*>?\s*Explanation:/i)) {
        // Start of explanation
      } else if (line.trim() !== '' && !line.startsWith('---')) {
        let cleanLine = line.replace(/^\s*>?\s*/, '').trim();
        if (cleanLine) {
            currentQuestion.explanation += (currentQuestion.explanation ? '\n<br>\n' : '') + cleanLine;
        }
      }
    }
  }
  
  if (currentQuestion && currentQuestion.questionText) mcqs.push(currentQuestion);
  
  return mcqs;
};

async function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

async function run() {
    console.log("1. Starting Re-Import Process...");
    
    // Clean up old MCQs
    console.log(`2. Deleting all old MCQs in chapter "${CHAPTER_NAME}"...`);
    const { error: delError } = await supabase.from('mcqs').delete().eq('chapter', CHAPTER_NAME);
    if (delError) {
        console.error("Delete Error:", delError);
        return;
    }
    console.log("   Old MCQs deleted.");

    // Fetch Global State
    console.log("3. Fetching global state to update subchapters...");
    const { data: globalState, error: stateError } = await supabase.from('global_app_state').select('*').eq('id', 1).single();
    if (stateError) {
        console.error("State Error:", stateError);
        return;
    }

    let state = globalState.state_json;
    
    // Ensure Subject & Chapter exist
    if (!state.appSubjects.includes(SUBJECT_NAME)) {
        state.appSubjects.push(SUBJECT_NAME);
    }
    
    if (!state.appChapters.find(c => c.name === CHAPTER_NAME && c.subject === SUBJECT_NAME)) {
        state.appChapters.push({ name: CHAPTER_NAME, subject: SUBJECT_NAME });
    }

    // Remove old subchapters for this chapter
    state.appSubChapters = state.appSubChapters.filter(sc => sc.chapterName !== CHAPTER_NAME);

    // Read the MD files
    console.log("4. Parsing directory for new MCQs...");
    const files = fs.readdirSync(MCQ_DIR).filter(f => f.endsWith('.md'));
    
    let allMcqsToInsert = [];
    
    for (const file of files) {
        const subName = file.replace('.md', '');
        const scId = await generateId();
        
        // Register subchapter
        state.appSubChapters.push({
            id: scId,
            name: subName,
            chapterName: CHAPTER_NAME,
            subjectName: SUBJECT_NAME
        });
        
        // Parse the file
        const mcqs = parseMD(path.join(MCQ_DIR, file));
        
        for (const q of mcqs) {
            allMcqsToInsert.push({
                subject: SUBJECT_NAME,
                chapter: CHAPTER_NAME,
                subchapter_id: scId,
                question: q.questionText,
                options: q.options,
                correct_answer: q.answer,
                explanation: q.explanation || "No explanation provided."
            });
        }
        console.log(`   - Parsed ${subName}: ${mcqs.length} questions`);
    }
    
    // Update global state
    console.log("5. Updating global_app_state...");
    const { error: updateStateError } = await supabase.from('global_app_state').update({ state_json: state }).eq('id', 1);
    if (updateStateError) {
        console.error("State Update Error:", updateStateError);
        return;
    }

    // Insert new MCQs in batches
    console.log(`6. Inserting ${allMcqsToInsert.length} perfectly formatted MCQs...`);
    let success = 0;
    for (let i = 0; i < allMcqsToInsert.length; i += 50) {
        const batch = allMcqsToInsert.slice(i, i + 50);
        const { error: insErr } = await supabase.from('mcqs').insert(batch);
        if (insErr) {
            console.error("Insert Error at batch", i, ":", insErr);
            return;
        }
        success += batch.length;
        console.log(`   - Inserted ${success} / ${allMcqsToInsert.length}`);
    }
    
    console.log("7. ALL DONE!");
}

run();
