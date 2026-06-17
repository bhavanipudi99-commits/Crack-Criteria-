import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://oymebajxxevwshtebfaa.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95bWViYWp4eGV2d3NodGViZmFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNTk0MDEsImV4cCI6MjA5NTczNTQwMX0.YyZLquOAQLHvHcpZqev_rNIgO5cat7pxST1Vo5Ls488';

export const supabase = createClient(supabaseUrl, supabaseKey);
