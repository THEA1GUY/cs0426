import { supabase } from './supabase';

export async function searchDocuments(queryEmbedding: number[], department: string, matchCount = 5) {
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: matchCount,
    target_department: department
  });

  if (error) {
    console.error('Error searching documents:', error);
    return [];
  }

  return data;
}

export async function getEmbedding(text: string) {
  // Call the Supabase Edge Function 'embed'
  const { data, error } = await supabase.functions.invoke('embed', {
    body: { input: text }
  });

  if (error) {
    console.error('Error calling embedding function:', error);
    throw error;
  }

  return data.embedding;
}
