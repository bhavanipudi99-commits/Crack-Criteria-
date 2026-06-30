const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// REPLACE WITH YOUR SUPABASE URL AND SERVICE ROLE KEY
const SUPABASE_URL = 'https://oymebajxxevwshtebfaa.supabase.co';
const SUPABASE_KEY = 'YOUR_SERVICE_ROLE_KEY'; // IMPORTANT: Use Service Role Key for bulk inserts to bypass RLS

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JSON_PATH = '/Users/venkatarjun/Downloads/Text books and work /telegram_bot/mcq_database.json';

async function importData() {
  console.log("Loading JSON...");
  const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
  const db = JSON.parse(rawData);

  let allQuestions = [];

  for (const [subject, chapters] of Object.entries(db)) {
    for (const [chapter, questions] of Object.entries(chapters)) {
      for (const q of questions) {
        // Ensure options array always has exactly 4 strings
        const options = Array(4).fill("");
        if (q.options && Array.isArray(q.options)) {
          for (let i = 0; i < 4; i++) {
            if (q.options[i]) options[i] = q.options[i];
          }
        }

        allQuestions.push({
          subject: subject,
          chapter: chapter,
          question: q.question || "Unknown Question",
          options: options,
          correct_answer: q.answer || "A",
          explanation: q.explanation || ""
        });
      }
    }
  }

  console.log(`Found ${allQuestions.length} total questions. Beginning insert...`);

  // Insert in chunks of 500 to avoid request size limits
  const CHUNK_SIZE = 500;
  for (let i = 0; i < allQuestions.length; i += CHUNK_SIZE) {
    const chunk = allQuestions.slice(i, i + CHUNK_SIZE);
    console.log(`Inserting chunk ${i} to ${i + chunk.length}...`);
    
    const { error } = await supabase.from('mcqs').insert(chunk);
    
    if (error) {
      console.error("Error inserting chunk:", error);
      break;
    }
  }

  console.log("Migration complete!");
}

importData();
