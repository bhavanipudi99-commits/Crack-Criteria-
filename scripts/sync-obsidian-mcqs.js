import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in .env');
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// CONFIGURATION: CHANGE THIS PATH TO YOUR OBSIDIAN FOLDER
// ==========================================
const OBSIDIAN_PATH = '/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /New Harrison Notes/';

// ==========================================
// HELPER: UPLOAD IMAGES TO SUPABASE
// ==========================================
async function uploadImageIfPresent(imagePathRaw, basePath) {
    // Clean up Obsidian's image link format: ![[my_image.png]] -> my_image.png
    let imageName = imagePathRaw.replace('![[', '').replace(']]', '').trim();
    
    // Look for the image file in the Obsidian vault or attachments folder
    // Obsidian often saves images in an 'attachments' folder or same directory.
    // For safety, we will do a simple search in the directory tree.
    const searchDirs = [basePath, path.join(basePath, 'attachments'), path.join(basePath, 'images')];
    let foundPath = null;
    
    for (const dir of searchDirs) {
        const potentialPath = path.join(dir, imageName);
        if (fs.existsSync(potentialPath)) {
            foundPath = potentialPath;
            break;
        }
    }

    if (!foundPath) {
        console.warn(`⚠️ Warning: Could not find image file: ${imageName}`);
        return null; // Return null if not found
    }

    const fileBuffer = fs.readFileSync(foundPath);
    const fileName = `${Date.now()}_${imageName.replace(/\s+/g, '_')}`;
    
    console.log(`Uploading image: ${fileName}...`);
    const { data, error } = await supabase.storage
        .from('mcq_images')
        .upload(fileName, fileBuffer, {
            contentType: 'image/png',
            upsert: true
        });

    if (error) {
        console.error('Error uploading image:', error.message);
        return null;
    }

    const { data: publicUrlData } = supabase.storage.from('mcq_images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
}

// ==========================================
// HELPER: PARSE OBSIDIAN CALLOUTS TO MCQS
// ==========================================
async function parseAndSyncFile(filePath, subjectName, chapterName) {
    console.log(`\nParsing file: ${chapterName}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    let inCallout = false;
    let currentQuestionLines = [];
    let mcqsToInsert = [];

    // Simple parser looking for > [!Question]
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.match(/^>\s*\[!Question\]/i) || line.match(/^>\s*\[!info\]/i) || line.match(/^>\s*\[!faq\]/i) || line.match(/^>\s*\[!example\]/i)) {
            inCallout = true;
            currentQuestionLines = [];
            continue;
        }

        if (inCallout) {
            if (line.trim().startsWith('>')) {
                currentQuestionLines.push(line.substring(line.indexOf('>') + 1).trim());
            } else if (line.trim() === '') {
                // End of callout
                inCallout = false;
                if (currentQuestionLines.length > 0) {
                    const parsed = await processMcqBlock(currentQuestionLines.join('\n'), path.dirname(filePath), subjectName, chapterName);
                    if (parsed) mcqsToInsert.push(parsed);
                }
            } else {
                inCallout = false;
                if (currentQuestionLines.length > 0) {
                    const parsed = await processMcqBlock(currentQuestionLines.join('\n'), path.dirname(filePath), subjectName, chapterName);
                    if (parsed) mcqsToInsert.push(parsed);
                }
            }
        }
    }

    // Flush last if ending on callout
    if (inCallout && currentQuestionLines.length > 0) {
        const parsed = await processMcqBlock(currentQuestionLines.join('\n'), path.dirname(filePath), subjectName, chapterName);
        if (parsed) mcqsToInsert.push(parsed);
    }

    // Insert to DB
    if (mcqsToInsert.length > 0) {
        const { error } = await supabase.from('mcqs').upsert(mcqsToInsert);
        if (error) {
            console.error(`❌ Error inserting MCQs for ${chapterName}:`, error.message);
        } else {
            console.log(`✅ Synced ${mcqsToInsert.length} MCQs to Supabase for ${chapterName}`);
        }
    } else {
        console.log(`No MCQs found in ${chapterName}`);
    }
}

async function processMcqBlock(blockText, dirPath, subjectName, chapterName) {
    // 1. Convert Obsidian image tags ![[image.png]] to real HTML img tags with uploaded Supabase URLs
    const imageRegex = /!\[\[(.*?)\]\]/g;
    let match;
    let processedText = blockText;
    
    while ((match = imageRegex.exec(blockText)) !== null) {
        const rawTag = match[0];
        const imageUrl = await uploadImageIfPresent(rawTag, dirPath);
        if (imageUrl) {
            processedText = processedText.replace(rawTag, `<img src="${imageUrl}" alt="MCQ Image" class="rounded-lg shadow-sm my-4 max-w-full h-auto max-h-64 object-contain mx-auto" />`);
        }
    }

    // 2. We expect the format to roughly have A), B), C), D), and Answer: A, Explanation: ...
    // This is a simple regex extractor. You can adjust this to fit your exact Obsidian writing style!
    
    // Convert the whole thing to HTML first to preserve tables, bolding, etc!
    const htmlContent = marked.parse(processedText);

    // To parse out the question vs options from the HTML, it's easier to parse the raw text first,
    // then run `marked` on the specific chunks.
    
    // We'll extract raw options using A), B), C), D) patterns
    const aMatch = processedText.match(/(?:A\)|a\))\s*(.*)/);
    const bMatch = processedText.match(/(?:B\)|b\))\s*(.*)/);
    const cMatch = processedText.match(/(?:C\)|c\))\s*(.*)/);
    const dMatch = processedText.match(/(?:D\)|d\))\s*(.*)/);
    const answerMatch = processedText.match(/Answer:\s*([A-D])/i);
    const expMatch = processedText.match(/Explanation:\s*([\s\S]*)/i);

    if (!aMatch || !answerMatch) {
        // If it doesn't match standard MCQ format, treat the whole block as the Question text 
        // with dummy options so you can edit it later in the UI.
        return {
            subject: subjectName,
            chapter: chapterName,
            question: marked.parse(processedText.trim()),
            options: ['Edit Option A', 'Edit Option B', 'Edit Option C', 'Edit Option D'],
            correct_answer: 'A',
            explanation: ''
        };
    }

    // Isolate the question part (everything before A))
    const questionRaw = processedText.substring(0, processedText.indexOf(aMatch[0])).trim();
    
    return {
        subject: subjectName,
        chapter: chapterName,
        question: marked.parse(questionRaw), // Beautiful HTML (tables, bold, lists, images)
        options: [
            aMatch ? aMatch[1].trim() : '',
            bMatch ? bMatch[1].trim() : '',
            cMatch ? cMatch[1].trim() : '',
            dMatch ? dMatch[1].trim() : ''
        ],
        correct_answer: answerMatch[1].toUpperCase(),
        explanation: expMatch ? marked.parse(expMatch[1].trim()) : ''
    };
}

// ==========================================
// RUNNER
// ==========================================
async function run() {
    console.log(`Starting Obsidian Sync from: ${OBSIDIAN_PATH}`);
    if (!fs.existsSync(OBSIDIAN_PATH)) {
        console.error(`Directory not found! Please check the OBSIDIAN_PATH inside this script.`);
        process.exit(1);
    }

    const files = fs.readdirSync(OBSIDIAN_PATH).filter(f => f.endsWith('.md'));
    
    // Defaulting Subject to Medicine, but you can parse it from folder names if you want!
    const subjectName = "Medicine"; 
    
    for (const file of files) {
        const chapterName = file.replace('.md', '');
        await parseAndSyncFile(path.join(OBSIDIAN_PATH, file), subjectName, chapterName);
    }
    
    console.log('🎉 Sync Complete!');
}

run();
