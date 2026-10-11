-- ============================================================
-- Migration 09: Teacher Admin RLS & Storage Permissions
-- Ensures teacher has complete management rights across all admin domains
-- ============================================================

DO $$
BEGIN
  -- 1. Storage Objects for public_assets & research_files
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Teachers update assets') THEN
    CREATE POLICY "Teachers update assets" ON storage.objects FOR UPDATE 
      USING (bucket_id = 'public_assets' AND get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Teachers delete assets') THEN
    CREATE POLICY "Teachers delete assets" ON storage.objects FOR DELETE 
      USING (bucket_id = 'public_assets' AND get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Teachers upload research files') THEN
    CREATE POLICY "Teachers upload research files" ON storage.objects FOR INSERT 
      WITH CHECK (bucket_id = 'research_files' AND get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Teachers delete research files') THEN
    CREATE POLICY "Teachers delete research files" ON storage.objects FOR DELETE 
      USING (bucket_id = 'research_files' AND get_user_role() = 'teacher');
  END IF;

  -- 2. Research Evaluations: Delete policy for teacher
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'research_evaluations' AND policyname = 'Teachers delete evaluations') THEN
    CREATE POLICY "Teachers delete evaluations" ON public.research_evaluations FOR DELETE 
      USING (get_user_role() = 'teacher' AND auth.uid() = teacher_id);
  END IF;

  -- 3. Competition attempts & answers cleanup by teacher
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'competition_attempts' AND policyname = 'Teachers delete attempts') THEN
    CREATE POLICY "Teachers delete attempts" ON public.competition_attempts FOR DELETE 
      USING (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attempt_answers' AND policyname = 'Teachers delete attempt_answers') THEN
    CREATE POLICY "Teachers delete attempt_answers" ON public.attempt_answers FOR DELETE 
      USING (get_user_role() = 'teacher');
  END IF;

  -- 4. Student profile updates by teachers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Teachers update student profiles') THEN
    CREATE POLICY "Teachers update student profiles" ON public.profiles FOR UPDATE 
      USING (get_user_role() = 'teacher' AND role = 'student');
  END IF;
END $$;
