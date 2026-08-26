const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://maahwymvereyofrhrytx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWh3eW12ZXJleW9mcmhyeXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTEwMTksImV4cCI6MjEwMDk2NzAxOX0.9LYS14a2SZAf57Uy-VpDtR3b728gRJcFYJnibW9RVbM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .limit(1);

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  console.log('students table:', students ? 'EXISTS' : studentsError);
  console.log('users table:', users ? 'EXISTS' : usersError);
}

check();
