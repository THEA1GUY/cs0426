-- ===========================================================
-- Migration: Fix RAG retrieval, add email to profiles,
--            create avatars storage bucket, seed first admin
-- ===========================================================

-- 1. Add email column to profiles (used by admin user sync)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Patch handle_new_user_profile to also store the email
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    r_staff RECORD;
BEGIN
    SELECT * INTO r_staff 
    FROM public.pre_registered_staff 
    WHERE email = NEW.email;

    IF r_staff IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, name, department, job_title, role, status)
        VALUES (
            NEW.id,
            NEW.email,
            r_staff.name,
            r_staff.department,
            r_staff.job_title,
            r_staff.role,
            r_staff.status
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            department = EXCLUDED.department,
            job_title = EXCLUDED.job_title,
            role = EXCLUDED.role,
            status = EXCLUDED.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix match_document_chunks: include 'General' department docs for all users
--    Previous bug: only matched exact department OR NULL, so documents stored as
--    department='General' were invisible to Engineering/HR/Support/Sales users.
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

-- 4. Create avatars storage bucket (referenced by chat/page.tsx avatar upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage RLS: Users can upload/update their own avatar
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 6. Seed all pre-registered staff for testing
INSERT INTO public.pre_registered_staff (email, name, department, job_title, role, status)
VALUES
  -- Admin
  ('sivenverse@gmail.com', 'Siven Verse', 'General', 'IT Administrator', 'admin', 'active'),
  -- Department Head (HR)
  ('prisinct@gmail.com', 'Prisinct Manager', 'HR', 'HR Manager', 'department_head', 'active'),
  -- New Employee (Engineering)
  ('itzdaade1@gmail.com', 'Daade Engineer', 'Engineering', 'Software Developer', 'new_employee', 'active'),
  -- New Employee (Customer Support)
  ('prisinct7@gmail.com', 'Prisinct Support', 'Support', 'Customer Support Specialist', 'new_employee', 'active')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  department = EXCLUDED.department,
  job_title = EXCLUDED.job_title,
  role = EXCLUDED.role,
  status = EXCLUDED.status;
