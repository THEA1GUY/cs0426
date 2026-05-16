import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lipaoxkalejwkfcqdoqf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcGFveGthbGVqd2tmY3Fkb3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkxOTE4OCwiZXhwIjoyMDk0NDk1MTg4fQ.flHRd6bleCC7fFd8iWsi12m8nfhKC780kVVZZwSJSYM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const HR_DOC_CONTENT = `
Global Employee Handbook
Version: 2026.1
Department: Human Resources (HR)
Classification: Public (All Employees)

1. Welcome to the Team
Welcome! This handbook is designed to introduce you to our culture, your benefits, and the expectations we have for all team members. Whether you are in the office or remote, these policies ensure a consistent and fair experience for everyone.

2. Our Mission and Values
● Mission: To accelerate human potential through innovative technology.
● Core Values: * Radical Transparency: We share information openly.
○ User First: We build for the human on the other side of the screen.
○ Iteration: We value progress over perfection.

3. Employment Basics
3.1 Work Hours and Attendance
● Standard Hours: Our core business hours are 9:00 AM to 5:00 PM local time.
● Flexibility: We support asynchronous work; however, all employees must be available for "Core Sync Hours" between 11:00 AM and 2:00 PM EST for cross-team collaboration.
● Reporting Absence: If you are unable to work due to illness or an emergency, please notify your manager via Slack and log the absence in the HR Portal before 9:30 AM.

3.2 Employee Classifications
● Full-Time: Employees scheduled to work at least 40 hours per week.
● Part-Time: Employees scheduled for fewer than 30 hours per week.
● Contractors: Individuals engaged for specific projects (refer to your specific contract for benefit eligibility).

4. Paid Time Off (PTO) & Leave
4.1 Vacation Policy
Full-time employees receive 20 days of Flexible PTO per calendar year.
● Approval: PTO requests must be submitted via the HR Portal at least two weeks in advance.
● Rollover: Up to 5 days of unused PTO can be carried over to the next calendar year.

4.2 Sick Leave
We offer unlimited sick leave for short-term illnesses. We trust our employees to use this time to recover so they can return to work at 100% capacity. If sick leave exceeds 3 consecutive days, a doctor’s note may be requested.

4.3 Paid Parental Leave
New parents (including birth, adoption, or foster care) are eligible for 16 weeks of 100% paid leave after 6 months of continuous employment.

5. Technology & Data Privacy
5.1 Use of Company Equipment
Laptops and mobile devices provided by the company are for professional use. Personal use is permitted but should be kept to a minimum. All data stored on company devices is the property of the company.

5.2 AI Usage Policy
Employees are encouraged to use AI tools to increase productivity. However:
● Do not input sensitive customer data or proprietary source code into unapproved third-party LLMs.
● Verification: All AI-generated output must be reviewed by a human for accuracy before being shared externally or implemented in production.

6. Code of Conduct
We are committed to a harassment-free workplace. Discrimination or harassment based on race, gender, religion, age, or disability is strictly prohibited.
Reporting: If you witness or experience misconduct, contact HR immediately or use the anonymous reporting link on the internal portal.
`;

async function testUpload() {
  console.log('Testing HR Document Upload...');
  
  const title = 'Global Employee Handbook';
  const department = 'HR';
  const content = HR_DOC_CONTENT;

  try {
    // 1. Create document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({ title, department, content })
      .select()
      .single();

    if (docError) throw docError;
    console.log('Document created:', document.id);

    // 2. Chunk and embed
    const chunks = content.split(/\n\n+/).filter(c => c.trim().length > 0);
    console.log(`Embedding ${chunks.length} chunks...`);

    for (const chunk of chunks) {
      // Get embedding from Edge Function
      const { data: embedData, error: embedError } = await supabase.functions.invoke('embed', {
        body: { input: chunk }
      });
      if (embedError) throw embedError;

      const { error: dbError } = await supabase.from('document_embeddings').insert({
        document_id: document.id,
        content_chunk: chunk,
        embedding: embedData.embedding,
      });
      if (dbError) throw dbError;
    }

    console.log('HR Document seeded successfully!');
    
    // 3. Test Retrieval
    console.log('Testing Chat Retrieval...');
    const testQuery = 'What is the vacation policy?';
    
    const { data: embedQuery, error: qError } = await supabase.functions.invoke('embed', {
      body: { input: testQuery }
    });
    if (qError) throw qError;

    const { data: results, error: searchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: embedQuery.embedding,
      match_threshold: 0.1,
      match_count: 2,
      target_department: 'HR'
    });

    if (searchError) throw searchError;
    console.log('Search Results Found:', results.length);
    results.forEach((r: any, i: number) => {
      console.log(`Match ${i+1} (Similarity: ${r.similarity.toFixed(4)}):`);
      console.log(r.content_chunk.substring(0, 100) + '...');
    });
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testUpload();
