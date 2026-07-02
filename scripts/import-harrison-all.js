import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';

const supabaseUrl = 'https://oymebajxxevwshtebfaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bWViYWp4eGV2d3NodGViZmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTk0MDEsImV4cCI6MjA5NTczNTQwMX0.YyZLquOAQLHvHcpZqev_rNIgO5cat7pxST1Vo5Ls488';
const supabase = createClient(supabaseUrl, supabaseKey);

const OBSIDIAN_PATH = '/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison MCQ';

function getAllMdFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    
    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllMdFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.md')) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });
    return arrayOfFiles;
}

async function uploadImageIfPresent(imagePathRaw, basePath) {
    let imageName = imagePathRaw.replace('![[', '').replace(']]', '').trim();
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
        return null; 
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

async function parseAndSyncFile(filePath, subjectName, chapterName) {
    console.log(`\nParsing file: ${chapterName}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split by horizontal rule
    const blocks = content.split(/^---$/m);
    
    let mcqsToInsert = [];

    for (let block of blocks) {
        if (!block.match(/###\s*Question/i)) continue;
        
        const parsed = await processMcqBlock(block.trim(), path.dirname(filePath), subjectName, chapterName);
        if (parsed) mcqsToInsert.push(parsed);
    }

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
    // Convert Obsidian image tags
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

    // Extract options
    const aMatch = processedText.match(/(?:^|\n)\s*(?:A\.|A\)|A)\s+(.*)/);
    const bMatch = processedText.match(/(?:^|\n)\s*(?:B\.|B\)|B)\s+(.*)/);
    const cMatch = processedText.match(/(?:^|\n)\s*(?:C\.|C\)|C)\s+(.*)/);
    const dMatch = processedText.match(/(?:^|\n)\s*(?:D\.|D\)|D)\s+(.*)/);
    
    // Extract answer and explanation from the callout
    const answerMatch = processedText.match(/>\s*Answer:\s*([A-D])/i);
    const expMatch = processedText.match(/>\s*Explanation:\s*\n([\s\S]*)/i);

    if (!aMatch || !answerMatch) {
        return null; // Skip if invalid format
    }

    // Question text is between "### Question X" and option A
    let questionRaw = '';
    const qStartMatch = processedText.match(/###\s*Question\s*\d+\s*\n([\s\S]*?)(?=(?:^|\n)\s*(?:A\.|A\)|A)\s+)/i);
    if (qStartMatch) {
        questionRaw = qStartMatch[1].trim();
    } else {
        return null;
    }
    
    // Clean up explanation (remove leading ">" characters)
    let cleanExp = '';
    if (expMatch) {
        cleanExp = expMatch[1].split('\n').map(line => line.replace(/^>\s?/, '')).join('\n').trim();
    }

    return {
        subject: subjectName,
        chapter: chapterName,
        question: marked.parse(questionRaw), 
        options: [
            aMatch ? aMatch[1].trim() : '',
            bMatch ? bMatch[1].trim() : '',
            cMatch ? cMatch[1].trim() : '',
            dMatch ? dMatch[1].trim() : ''
        ],
        correct_answer: answerMatch[1].toUpperCase(),
        explanation: cleanExp ? marked.parse(cleanExp) : ''
    };
}

async function run() {
    console.log(`Starting Bulk Sync from: ${OBSIDIAN_PATH}`);
    if (!fs.existsSync(OBSIDIAN_PATH)) {
        console.error(`Directory not found! Please check OBSIDIAN_PATH.`);
        process.exit(1);
    }

    const folders = fs.readdirSync(OBSIDIAN_PATH).filter(f => fs.statSync(path.join(OBSIDIAN_PATH, f)).isDirectory());
    
    const subjectName = "Medicine"; 
    
    for (const folder of folders) {
        if (folder === 'Harrison Cardiology MCQ') {
            console.log(`Skipping ${folder} (already uploaded)`);
            continue;
        }

        let cleanChapter = folder;
        if (cleanChapter.endsWith(' MCQ')) {
            cleanChapter = cleanChapter.substring(0, cleanChapter.length - 4);
        }
        if (cleanChapter.startsWith('Harrison ')) {
            cleanChapter = cleanChapter.substring(9);
        }

        console.log(`\n========================================`);
        console.log(`Processing Folder: ${folder} -> Chapter: ${cleanChapter}`);
        console.log(`========================================\n`);

        const mdFiles = getAllMdFiles(path.join(OBSIDIAN_PATH, folder));

        for (const filePath of mdFiles) {
            const lessonName = path.basename(filePath, '.md');
            const chapterFormatted = `${cleanChapter}|||${lessonName}`;
            await parseAndSyncFile(filePath, subjectName, chapterFormatted);
        }
    }
    
    console.log('🎉 Bulk Sync Complete!');
}

run();
