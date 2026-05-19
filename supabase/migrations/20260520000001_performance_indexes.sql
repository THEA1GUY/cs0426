-- Add indexes for performance optimization

-- Conversations table indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_department ON public.documents(department);

-- Document embeddings table indexes
-- Note: pgvector already uses specialized indexes (like HNSW),
-- but we should ensure standard B-tree for document_id lookups if needed
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON public.document_embeddings(document_id);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

-- HNSW index for vector similarity search (if not already present and if data size warrants)
-- We use cosine similarity (<=>) so we should use vector_cosine_ops
CREATE INDEX IF NOT EXISTS idx_document_embeddings_embedding_cosine ON public.document_embeddings
USING hnsw (embedding vector_cosine_ops);
