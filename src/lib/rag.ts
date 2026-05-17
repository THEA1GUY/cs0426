import { getSupabaseAdmin } from './supabase';

/**
 * SEARCH LOGIC (Retrieval)
 * This function performs a "Semantic Search" using PostgreSQL's pgvector extension.
 * Instead of looking for exact words, it calculates the "Cosine Similarity" 
 * between the user's query and our stored document chunks.
 */
export async function searchDocuments(queryEmbedding: number[], department: string, matchCount = 5) {
  const supabase = getSupabaseAdmin();
  // We call a stored procedure (RPC) we defined in our Supabase database
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5, // 0.5 is a balanced threshold for similarity
    match_count: matchCount,
    target_department: department
  });

  if (error) {
    console.error('Error searching documents:', error);
    return [];
  }

  return data;
}

/**
 * EMBEDDING LOGIC (Generation)
 * This converts a string of text into a mathematical vector (an array of 384 numbers).
 * These numbers represent the "meaning" of the text in a high-dimensional space.
 */
export async function getEmbedding(text: string) {
  const supabase = getSupabaseAdmin();
  // We call our Supabase Edge Function which runs the 'gte-small' AI model
  const { data, error } = await supabase.functions.invoke('embed', {
    body: { input: text }
  });

  if (error) {
    console.error('Error calling embedding function:', error);
    throw error;
  }

  return data.embedding;
}
