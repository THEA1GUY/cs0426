-- Update match_document_chunks to return document title and department
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding VECTOR(384),
  match_threshold FLOAT,
  match_count INT,
  target_department TEXT
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content_chunk TEXT,
  metadata JSONB,
  similarity FLOAT,
  document_title TEXT,
  document_department TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.content_chunk,
    de.metadata,
    1 - (de.embedding <=> query_embedding) AS similarity,
    d.title as document_title,
    d.department as document_department
  FROM document_embeddings de
  JOIN documents d ON de.document_id = d.id
  WHERE (
    d.department = target_department     -- exact department match
    OR d.department = 'General'          -- general documents accessible to all
    OR d.department IS NULL              -- legacy null-department documents
  )
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
