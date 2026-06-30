import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://oymebajxxevwshtebfaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bWViYWp4eGV2d3NodGViZmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTk0MDEsImV4cCI6MjA5NTczNTQwMX0.YyZLquOAQLHvHcpZqev_rNIgO5cat7pxST1Vo5Ls488';
const supabase = createClient(supabaseUrl, supabaseKey);

const dbPath = '/Users/venkatarjun/work /Interactive_app.nosync/MCQ Arcade Data/database.json';

function chunkArray(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

function uid(prefix = 'id') { 
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; 
}

async function run() {
    console.log("Reading database.json for Cardiology Upload...");
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    
    let allPayloads = [];
    let newAppSubjects = [];
    let newAppChapters = [];
    
    // Find ONLY the Cardiology folder
    const cardioSystem = db.systems.find(s => s.name.includes('Cardiovascular System'));
    
    if (!cardioSystem) {
        console.error("Could not find Cardiology folder in the database!");
        return;
    }
    
    console.log(`Found: ${cardioSystem.name}`);

    let cleanSubject = cardioSystem.name;
    if (cleanSubject.includes('- ')) {
        cleanSubject = cleanSubject.split('- ')[1].trim();
    }
    
    newAppSubjects.push(cleanSubject);
    
    for (const lesson of cardioSystem.lessons) {
        const cleanChapter = lesson.name;
        
        newAppChapters.push({
            id: uid('ch'),
            name: cleanChapter,
            subject: cleanSubject
        });
        
        for (const q of lesson.questions) {
            const cleanOptions = q.options.map(opt => opt.replace(/^[A-Z]\.\s*/, '').trim());
            
            allPayloads.push({
                subject: cleanSubject,
                chapter: cleanChapter,
                subchapter_id: null,
                question: q.question.replace(/\n/g, '<br/>'),
                options: cleanOptions,
                correct_answer: q.answer,
                explanation: q.explanation.replace(/\n/g, '<br/>')
            });
        }
    }
    
    console.log(`Prepared ${allPayloads.length} Cardiology MCQs for upload.`);
    
    // Update mams_app_state
    const { data: stateData, error: stateError } = await supabase.from('mams_app_state').select('data').eq('id', 'main').single();
    
    let existingState = { appSubjects: [], appChapters: [], appSubChapters: [], criteriaTables: [], canvasConfigs: [] };
    if (stateData && stateData.data) { existingState = stateData.data; }
    
    for (const sub of newAppSubjects) {
        if (!existingState.appSubjects.includes(sub)) existingState.appSubjects.push(sub);
    }
    
    for (const chap of newAppChapters) {
        const exists = existingState.appChapters.find(c => c.name === chap.name && c.subject === chap.subject);
        if (!exists) existingState.appChapters.push(chap);
    }
    
    const { error: upsertError } = await supabase.from('mams_app_state').upsert({
        id: 'main', data: existingState, updated_at: new Date().toISOString()
    });
    
    if (upsertError) {
        console.error("Failed to update mams_app_state:", upsertError.message);
    } else {
        console.log("Successfully updated mams_app_state with Cardiology chapters!");
    }
    
    // Batch Upload MCQs
    const batches = chunkArray(allPayloads, 100);
    console.log(`Starting upload of Cardiology MCQs in ${batches.length} batches of 100...`);
    
    let successCount = 0;
    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const { error } = await supabase.from('mcqs').insert(batch);
        
        if (error) {
            console.error(`Error uploading batch ${i+1}:`, error.message);
            if (error.message.includes('row-level security')) {
                console.error("CRITICAL: RLS Policy blocked the insertion.");
                break;
            }
        } else {
            successCount += batch.length;
            console.log(`✅ Uploaded batch ${i+1}/${batches.length} (${successCount}/${allPayloads.length} total)`);
        }
    }
    
    console.log(`Upload complete! Total uploaded: ${successCount}`);
}

run();
