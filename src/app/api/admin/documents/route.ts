import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getEmbedding } from '@/lib/rag';

export async function POST(req: Request) {
  try {
    const { title, department, content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Create document record
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({ title, department, content })
      .select()
      .single();

    if (docError) throw docError;

    // 2. Chunk content (simple sentence/paragraph based chunking for now)
    const chunks = content.split(/\n\n+/).filter((c: string) => c.trim().length > 0);

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

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
