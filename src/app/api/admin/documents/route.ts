import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getEmbedding } from '@/lib/rag';

// We require pdf-parse dynamically on the server side
const pdf = require('pdf-parse');

// High-quality sliding text chunker
function chunkText(text: string, chunkSize: number = 800, overlap: number = 100): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;
  
  while (i < words.length) {
    const chunkWords = words.slice(i, i + Math.floor(chunkSize / 6)); // Rough estimate of 6 chars per word
    if (chunkWords.length === 0) break;
    chunks.push(chunkWords.join(' '));
    i += Math.floor((chunkSize - overlap) / 6) || 10;
  }
  return chunks.filter(c => c.trim().length > 10);
}

export async function POST(req: Request) {
  try {
    let title = '';
    let department = 'General';
    let content = '';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      title = formData.get('title') as string || '';
      department = formData.get('department') as string || 'General';

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      if (!title) {
        title = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      }

      // Convert file stream to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (file.name.endsWith('.pdf')) {
        const parsedData = await pdf(buffer);
        content = parsedData.text;
      } else if (file.name.endsWith('.txt')) {
        content = buffer.toString('utf-8');
      } else {
        return NextResponse.json({ error: 'Unsupported file type. Please upload a .pdf or .txt file.' }, { status: 400 });
      }
    } else {
      // Handle standard JSON payload
      const json = await req.json();
      title = json.title;
      department = json.department || 'General';
      content = json.content;
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Document has no text content.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({ title, department, content })
      .select()
      .single();

    if (docError) throw docError;

    // 2. Chunk content
    const chunks = chunkText(content, 800, 100);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'Failed to split document text into chunks.' }, { status: 400 });
    }

    // 3. Generate embeddings and save chunks
    const embeddingPromises = chunks.map(async (chunk: string) => {
      const embedding = await getEmbedding(chunk);
      return {
        document_id: document.id,
        content_chunk: chunk,
        embedding,
      };
    });

    const embeddingsToInsert = await Promise.all(embeddingPromises);

    const { error: embedError } = await supabase
      .from('document_embeddings')
      .insert(embeddingsToInsert);

    if (embedError) throw embedError;

    return NextResponse.json({ success: true, documentId: document.id, chunksCount: chunks.length });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, title, department, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ documents: docs || [] });
  } catch (error: any) {
    console.error('List documents error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true, message: 'Document and associated vector chunks purged successfully.' });
  } catch (error: any) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

