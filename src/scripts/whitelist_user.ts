import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lipaoxkalejwkfcqdoqf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcGFveGthbGVqd2tmY3Fkb3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkxOTE4OCwiZXhwIjoyMDk0NDk1MTg4fQ.flHRd6bleCC7fFd8iWsi12m8nfhKC780kVVZZwSJSYM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function whitelist(email: string, name: string, role: string) {
  console.log(`Whitelisting ${name} (${email}) as ${role}...`);

  const { data, error } = await supabase
    .from('pre_registered_staff')
    .upsert({
      email: email.toLowerCase().trim(),
      name,
      department: 'Admin',
      job_title: 'System Administrator',
      role,
      status: 'active'
    })
    .select();

  if (error) {
    console.error('Error whitelisting user:', error);
  } else {
    console.log('Success! User whitelisting complete:', data);
  }
}

const email = process.argv[2] || 'admin@company.com';
const name = process.argv[3] || 'System Administrator';
const role = process.argv[4] || 'admin';

whitelist(email, name, role);
