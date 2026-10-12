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

  -- 2. Research Evaluations: Full management by teachers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'research_evaluations' AND policyname = 'Teachers insert evaluations') THEN
    CREATE POLICY "Teachers insert evaluations" ON public.research_evaluations FOR INSERT 
      WITH CHECK (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'research_evaluations' AND policyname = 'Teachers update evaluations') THEN
    CREATE POLICY "Teachers update evaluations" ON public.research_evaluations FOR UPDATE 
      USING (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'research_evaluations' AND policyname = 'Teachers delete evaluations') THEN
    CREATE POLICY "Teachers delete evaluations" ON public.research_evaluations FOR DELETE 
      USING (get_user_role() = 'teacher');
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

  -- 5. Content pages: Teacher management
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'content_pages' AND policyname = 'Teachers insert pages') THEN
    CREATE POLICY "Teachers insert pages" ON public.content_pages FOR INSERT 
      WITH CHECK (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'content_pages' AND policyname = 'Teachers update pages') THEN
    CREATE POLICY "Teachers update pages" ON public.content_pages FOR UPDATE 
      USING (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'content_pages' AND policyname = 'Teachers delete pages') THEN
    CREATE POLICY "Teachers delete pages" ON public.content_pages FOR DELETE 
      USING (get_user_role() = 'teacher');
  END IF;

  -- 6. Competitions: Teacher insert and update
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'competitions' AND policyname = 'Teachers insert competitions') THEN
    CREATE POLICY "Teachers insert competitions" ON public.competitions FOR INSERT 
      WITH CHECK (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'competitions' AND policyname = 'Teachers update competitions') THEN
    CREATE POLICY "Teachers update competitions" ON public.competitions FOR UPDATE 
      USING (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'competitions' AND policyname = 'Teachers delete competitions') THEN
    CREATE POLICY "Teachers delete competitions" ON public.competitions FOR DELETE 
      USING (get_user_role() = 'teacher');
  END IF;

  -- 7. Questions: Teacher insert and update
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'Teachers insert questions') THEN
    CREATE POLICY "Teachers insert questions" ON public.questions FOR INSERT 
      WITH CHECK (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'Teachers update questions') THEN
    CREATE POLICY "Teachers update questions" ON public.questions FOR UPDATE 
      USING (get_user_role() = 'teacher');
  END IF;

  -- 8. Challenges: Teacher manage
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenges' AND policyname = 'Teachers insert challenges') THEN
    CREATE POLICY "Teachers insert challenges" ON public.challenges FOR INSERT 
      WITH CHECK (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenges' AND policyname = 'Teachers update challenges') THEN
    CREATE POLICY "Teachers update challenges" ON public.challenges FOR UPDATE 
      USING (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenges' AND policyname = 'Teachers delete challenges') THEN
    CREATE POLICY "Teachers delete challenges" ON public.challenges FOR DELETE 
      USING (get_user_role() = 'teacher');
  END IF;

  -- 9. Challenge levels: Teacher manage
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenge_levels' AND policyname = 'Teachers insert levels') THEN
    CREATE POLICY "Teachers insert levels" ON public.challenge_levels FOR INSERT 
      WITH CHECK (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenge_levels' AND policyname = 'Teachers update levels') THEN
    CREATE POLICY "Teachers update levels" ON public.challenge_levels FOR UPDATE 
      USING (get_user_role() = 'teacher');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'challenge_levels' AND policyname = 'Teachers delete levels') THEN
    CREATE POLICY "Teachers delete levels" ON public.challenge_levels FOR DELETE 
      USING (get_user_role() = 'teacher');
  END IF;

END $$;
