import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
const pdf = require('pdf-parse');

const supabaseUrl = 'https://lipaoxkalejwkfcqdoqf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcGFveGthbGVqd2tmY3Fkb3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODkxOTE4OCwiZXhwIjoyMDk0NDk1MTg4fQ.flHRd6bleCC7fFd8iWsi12m8nfhKC780kVVZZwSJSYM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Split text into chunks of roughly ~800 characters with 100 char overlap
function chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentWords: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    currentWords.push(word);
    currentLength += word.length + 1; // +1 for space

    if (currentLength >= chunkSize) {
      chunks.push(currentWords.join(' '));
      // Overlap: keep the last N words
      const overlapWordsCount = Math.floor(words.length * (overlap / chunkSize)) || 5;
      currentWords = currentWords.slice(-overlapWordsCount);
      currentLength = currentWords.join(' ').length;
    }
  }

  if (currentWords.length > 0) {
    chunks.push(currentWords.join(' '));
  }

  return chunks.filter(c => c.trim().length > 30); // Ignore tiny fragments
}

async function ingestSupportDocs() {
  console.log('🚀 Starting Customer Support Document Ingestion...');
  const docsDir = path.join(process.cwd(), 'docs');
  
  if (!fs.existsSync(docsDir)) {
    console.error('Docs directory not found at:', docsDir);
    return;
  }

  const files = fs.readdirSync(docsDir);
  const supportFiles = files.filter(f => f.toLowerCase().startsWith('customer success'));

  if (supportFiles.length === 0) {
    console.log('No Customer Success documents found.');
    return;
  }

  console.log(`Found ${supportFiles.length} Customer Success documents to ingest.`);

  for (const file of supportFiles) {
    const filePath = path.join(docsDir, file);
    console.log(`\n📄 Processing: "${file}"...`);

    try {
      // 1. Read and parse PDF
      const dataBuffer = fs.readFileSync(filePath);
      const parser = new pdf.PDFParse({ data: dataBuffer });
      const textResult = await parser.getText();
      const textContent = textResult.text.replace(/\r\n/g, '\n').replace(/\n+/g, '\n');

      if (!textContent.trim()) {
        console.warn(`⚠️ Warning: Parsed empty text from ${file}. Skipping.`);
        continue;
      }

      console.log(`   Parsed text length: ${textContent.length} characters.`);

      // 2. Create document entry
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          title: file.replace('.pdf', ''),
          department: 'Support', // Standardized department
          content: textContent
        })
        .select()
        .single();

      if (docError) throw docError;
      console.log(`   ✅ Document created in database with ID: ${document.id}`);

      // 3. Chunk text
      const chunks = chunkText(textContent);
      console.log(`   Generated ${chunks.length} chunks. Generating embeddings...`);

      // 4. Generate embeddings and store in pgvector
      let embeddedCount = 0;
      for (const chunk of chunks) {
        try {
          // Invoke the native gte-small Embedding Edge Function
          const { data: embedData, error: embedError } = await supabase.functions.invoke('embed', {
            body: { input: chunk }
          });

          if (embedError) throw embedError;

          const { error: dbError } = await supabase
            .from('document_embeddings')
            .insert({
              document_id: document.id,
              content_chunk: chunk,
              embedding: embedData.embedding
            });

          if (dbError) throw dbError;
          embeddedCount++;
        } catch (chunkErr) {
          console.error(`   ❌ Failed to embed chunk:`, chunkErr);
        }
      }

      console.log(`   🎉 Finished processing "${file}". Embedded ${embeddedCount}/${chunks.length} chunks.`);

    } catch (err) {
      console.error(`❌ Error processing file "${file}":`, err);
    }
  }

  console.log('\n🌟 Customer Support Ingestion Complete!');
}

ingestSupportDocs();
