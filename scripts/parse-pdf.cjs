const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = '/Users/venkatarjun/Library/Mobile Documents/iCloud~md~obsidian/Documents/MCQ for INISS /mcq_csvs/Harrison_Categorized_Notes/Cardiology/infective endocarditis notes harrison 22 .pdf';
const outPath = '/Users/venkatarjun/work /medical-game.nosync/scratch/infective_endocarditis_raw.txt';

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    fs.mkdirSync('/Users/venkatarjun/work /medical-game.nosync/scratch', { recursive: true });
    fs.writeFileSync(outPath, data.text);
    console.log("PDF parsed successfully to", outPath);
}).catch(e => {
    console.error("Error parsing PDF:", e);
});
