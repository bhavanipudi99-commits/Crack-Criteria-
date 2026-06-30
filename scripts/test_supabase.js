import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oymebajxxevwshtebfaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bWViYWp4eGV2d3NodGViZmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTk0MDEsImV4cCI6MjA5NTczNTQwMX0.YyZLquOAQLHvHcpZqev_rNIgO5cat7pxST1Vo5Ls488';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing Supabase connection...");
    
    // Test Read
    const { data: readData, error: readError } = await supabase.from('mcqs').select('id').limit(1);
    if (readError) {
        console.error("Read Error:", readError);
    } else {
        console.log("Read Success:", readData);
    }
    
    // Test Insert
    const payload = {
        subject: "Test Subject",
        chapter: "Test Chapter",
        question: "Test Question",
        options: ["A", "B", "C", "D"],
        correct_answer: "A",
        explanation: "Test Explanation"
    };
    
    const { data: insertData, error: insertError } = await supabase.from('mcqs').insert([payload]).select();
    if (insertError) {
        console.error("Insert Error (Possible RLS):", insertError);
    } else {
        console.log("Insert Success!");
        console.log(insertData);
        // Clean up
        await supabase.from('mcqs').delete().eq('id', insertData[0].id);
    }
}

test();
