import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lipaoxkalejwkfcqdoqf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcGFveGthbGVqd2tmY3Fkb3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkxOTE4OCwiZXhwIjoyMDk0NDk1MTg4fQ.flHRd6bleCC7fFd8iWsi12m8nfhKC780kVVZZwSJSYM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('documents').select('count', { count: 'exact', head: true });
  
  if (error) {
    console.error('Connection Error:', error);
  } else {
    console.log('Success! Connection established.');
  }

  console.log('Testing Edge Function (embed)...');
  const { data: embedData, error: embedError } = await supabase.functions.invoke('embed', {
    body: { input: 'Hello world' }
  });

  if (embedError) {
    console.error('Edge Function Error:', embedError);
  } else {
    console.log('Edge Function Success! Embedding received.');
    console.log('Embedding length:', embedData.embedding?.length);
  }
}

test();
