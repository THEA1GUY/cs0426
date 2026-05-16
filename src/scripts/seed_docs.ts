import { getSupabaseAdmin } from '../lib/supabase';
import { getEmbedding } from '../lib/rag';
import * as fs from 'fs';
import * as path from 'path';

// This is a simple script to seed the initial PRD document
// In a real app, this would be done via the Admin UI

const PRD_CONTENT = `
PRODUCT REQUIREMENTS DOCUMENT
AI Employee Onboarding Assistant
Intelligent 24/7 Support System for New Workers

1. Executive Summary
New employee onboarding is a resource-intensive process...
(Truncated for script)
...
`;

async function seed() {
  console.log('Seeding PRD document...');
  
  const supabase = getSupabaseAdmin();
  
  const title = 'AI Onboarding Assistant PRD';
  const department = 'General';
  const content = PRD_CONTENT;

  // 1. Create document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({ title, department, content })
    .select()
    .single();

  if (docError) {
    console.error('Error creating document:', docError);
    return;
  }

  console.log('Document created:', document.id);

  // 2. Chunk and embed
  const chunks = content.split(/\n\n+/).filter(c => c.trim().length > 0);
  console.log(`Generating embeddings for ${chunks.length} chunks...`);

  for (const chunk of chunks) {
    try {
      const embedding = await getEmbedding(chunk);
      await supabase.from('document_embeddings').insert({
        document_id: document.id,
        content_chunk: chunk,
        embedding,
      });
      console.log('Chunk embedded.');
    } catch (err) {
      console.error('Error embedding chunk:', err);
    }
  }

  console.log('Seeding complete!');
}

// Note: This script needs to be run in a Node environment with env vars loaded
// For now, I'll just provide it.
