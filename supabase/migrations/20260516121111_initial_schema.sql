-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    department TEXT,
    job_title TEXT,
    role TEXT CHECK (role IN ('new_employee', 'department_head', 'admin')) DEFAULT 'new_employee',
    skill_set TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department TEXT,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.profiles(id)
);

-- Document Embeddings Table
CREATE TABLE IF NOT EXISTS public.document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    content_chunk TEXT NOT NULL,
    embedding VECTOR(384),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    input_type TEXT DEFAULT 'text' CHECK (input_type IN ('text', 'voice')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Escalations Table
CREATE TABLE IF NOT EXISTS public.escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    dept_head_id UUID REFERENCES public.profiles(id),
    summary TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'awaiting_response', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Escalation Messages Table
CREATE TABLE IF NOT EXISTS public.escalation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escalation_id UUID REFERENCES public.escalations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS (Row Level Security)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalation_messages ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Documents RLS
CREATE POLICY "Users can view documents in their department" ON public.documents 
FOR SELECT USING (department = (SELECT department FROM public.profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Conversations RLS
CREATE POLICY "Users can manage their own conversations" ON public.conversations 
FOR ALL USING (user_id = auth.uid());

-- Messages RLS
CREATE POLICY "Users can manage messages in their conversations" ON public.messages 
FOR ALL USING (EXISTS (SELECT 1 FROM public.conversations WHERE id = conversation_id AND user_id = auth.uid()));

-- Escalations RLS
CREATE POLICY "Employees can manage their own escalations" ON public.escalations 
FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Dept heads can see escalations assigned to them" ON public.escalations 
FOR SELECT USING (dept_head_id = auth.uid());

-- Functions

-- Semantic Search Function
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
  similarity FLOAT
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
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  JOIN documents d ON de.document_id = d.id
  WHERE (d.department = target_department OR d.department IS NULL)
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
