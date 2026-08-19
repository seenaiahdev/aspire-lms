const { createClient } = require(require('path').join(process.cwd(), 'node_modules', '@supabase', 'supabase-js'));

const supabaseUrl = 'https://maahwymvereyofrhrytx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYWh3eW12ZXJleW9mcmhyeXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzOTEwMTksImV4cCI6MjEwMDk2NzAxOX0.9LYS14a2SZAf57Uy-VpDtR3b728gRJcFYJnibW9RVbM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLessonStructure() {
  const { data, error } = await supabase
    .from('milestones_data')
    .select('*')
    .eq('id', 'ml-python-full-stack')
    .single();

  if (!error) {
    const firstLesson = data.stages[0].modules[0].lessons[0];
    console.log("First Lesson Complete Object:\n", JSON.stringify(firstLesson, null, 2));
  } else {
    console.error(error);
  }
}

checkLessonStructure();
