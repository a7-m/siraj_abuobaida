-- ============================================================
-- Migration 05: Participants System & Guest Tracking
-- ============================================================

-- 1. Add email column to profiles and backfill from auth.users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Update profile trigger to save email on registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, grade, section, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email,
    new.raw_user_meta_data->>'grade', 
    new.raw_user_meta_data->>'section', 
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Competitions: Add guest columns to competition_attempts
ALTER TABLE public.competition_attempts
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_grade TEXT,
  ADD COLUMN IF NOT EXISTS guest_section TEXT,
  ADD COLUMN IF NOT EXISTS guest_session_id TEXT;

-- Update RLS policies for competition_attempts
DROP POLICY IF EXISTS "Students view own attempts" ON public.competition_attempts;
CREATE POLICY "Students view own attempts" ON public.competition_attempts FOR
SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  OR get_user_role() = 'teacher'
);

DROP POLICY IF EXISTS "Students insert attempts" ON public.competition_attempts;
CREATE POLICY "Students insert attempts" ON public.competition_attempts FOR
INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  OR (student_id IS NULL)
);

DROP POLICY IF EXISTS "Students update attempts" ON public.competition_attempts;
CREATE POLICY "Students update attempts" ON public.competition_attempts FOR
UPDATE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  OR (student_id IS NULL)
);

-- Update RLS policy for attempt_answers to allow guest answers
DROP POLICY IF EXISTS "Students insert answers" ON public.attempt_answers;
CREATE POLICY "Students insert answers" ON public.attempt_answers FOR
INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.competition_attempts ca
    WHERE ca.id = attempt_answers.attempt_id
    AND (ca.student_id = auth.uid() OR ca.student_id IS NULL)
  )
);

DROP POLICY IF EXISTS "Students update answers" ON public.attempt_answers;
CREATE POLICY "Students update answers" ON public.attempt_answers FOR
UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.competition_attempts ca
    WHERE ca.id = attempt_answers.attempt_id
    AND (ca.student_id = auth.uid() OR ca.student_id IS NULL)
  )
);


-- 3. Reading Challenges: Update student_progress for guest & registered tracking
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.student_progress'::regclass 
    AND conname = 'student_progress_pkey'
  ) THEN
    ALTER TABLE public.student_progress DROP CONSTRAINT student_progress_pkey;
  END IF;
END $$;

ALTER TABLE public.student_progress ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.student_progress'::regclass 
    AND contype = 'p'
  ) THEN
    ALTER TABLE public.student_progress ADD PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.student_progress ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE public.student_progress
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_grade TEXT,
  ADD COLUMN IF NOT EXISTS guest_section TEXT,
  ADD COLUMN IF NOT EXISTS guest_session_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.student_progress'::regclass 
    AND conname = 'student_progress_student_level_key'
  ) THEN
    ALTER TABLE public.student_progress 
      ADD CONSTRAINT student_progress_student_level_key 
      UNIQUE (student_id, challenge_level_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "Students insert progress" ON public.student_progress;
CREATE POLICY "Students insert progress" ON public.student_progress FOR
INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  OR (student_id IS NULL)
);

DROP POLICY IF EXISTS "Students update progress" ON public.student_progress;
CREATE POLICY "Students update progress" ON public.student_progress FOR
UPDATE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  OR (student_id IS NULL)
);

DROP POLICY IF EXISTS "Students read own progress" ON public.student_progress;
CREATE POLICY "Students read own progress" ON public.student_progress FOR
SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  OR get_user_role() = 'teacher'
);


-- 4. Scientific Research: Add guest columns to research_submissions
ALTER TABLE public.research_submissions
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_grade TEXT,
  ADD COLUMN IF NOT EXISTS guest_section TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_session_id TEXT;

DROP POLICY IF EXISTS "Students insert submission" ON public.research_submissions;
CREATE POLICY "Students insert submission" ON public.research_submissions FOR
INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  OR (student_id IS NULL)
);

DROP POLICY IF EXISTS "Students update own submission" ON public.research_submissions;
CREATE POLICY "Students update own submission" ON public.research_submissions FOR
UPDATE USING (
  ((auth.uid() IS NOT NULL AND auth.uid() = student_id) OR (student_id IS NULL))
  AND status = 'submitted'
);

DROP POLICY IF EXISTS "Students view own submission" ON public.research_submissions;
CREATE POLICY "Students view own submission" ON public.research_submissions FOR
SELECT USING (
  (auth.uid() IS NOT NULL AND auth.uid() = student_id)
  OR get_user_role() = 'teacher'
);


-- 5. Seed default Reading Challenge if none exists
INSERT INTO public.challenges (id, title, description, status)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  'برنامج القراءة المتدرج – إشراقات عُمانية',
  'رحلة معرفية متدرجة عبر تاريخ عُمان وحضارتها؛ اقرأ، استوعب، وأثبت فهمك.',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.challenge_levels (id, challenge_id, level_number, title, paragraph)
VALUES 
(
  'b1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  1,
  'القلاع والحصون في سلطنة عُمان',
  'تُعدّ القلاع والحصون في سلطنة عُمان شواهد حيّة على عبقرية العمارة الدفاعية وتاريخ البلاد العريق.'
),
(
  'b1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000001',
  2,
  'نظام الأفلاج العُماني وهندسة الري',
  'يمثّل نظام الأفلاج في سلطنة عُمان واحداً من أقدم وأعظم أنظمة هندسة الري التقليدية في العالم.'
),
(
  'b1000000-0000-0000-0000-000000000003',
  'c1000000-0000-0000-0000-000000000001',
  3,
  'رواد العلوم واللغة من أرض عُمان',
  'أنجبت سلطنة عُمان عبر تاريخها الطويل نخبة من العلماء الأفذاذ الذين تركوا بصمات راسخة في صرح الحضارة العربية والإسلامية.'
) ON CONFLICT (id) DO NOTHING;


-- 6. Create Unified View: all_participants_view
CREATE OR REPLACE VIEW public.all_participants_view
WITH (security_invoker = true) AS
SELECT 
  ca.id AS id,
  'competition' AS activity_type,
  c.title AS activity_name,
  c.id AS activity_id,
  CASE WHEN ca.student_id IS NOT NULL THEN 'registered' ELSE 'guest' END AS participant_type,
  ca.student_id AS student_id,
  COALESCE(p.full_name, ca.guest_name, 'مشارك زائر') AS full_name,
  p.email AS email,
  COALESCE(p.grade, ca.guest_grade) AS grade,
  COALESCE(p.section, ca.guest_section) AS section,
  ca.status AS status,
  ca.total_score AS score,
  jsonb_build_object(
    'started_at', ca.started_at,
    'submitted_at', ca.submitted_at,
    'competition_title', c.title,
    'competition_status', c.status,
    'duration_seconds', c.duration_seconds
  ) AS details,
  COALESCE(ca.submitted_at, ca.started_at) AS created_at,
  ca.guest_session_id AS guest_session_id
FROM public.competition_attempts ca
LEFT JOIN public.competitions c ON c.id = ca.competition_id
LEFT JOIN public.profiles p ON p.id = ca.student_id
WHERE get_user_role() = 'teacher'

UNION ALL

SELECT 
  sp.id AS id,
  'reading' AS activity_type,
  COALESCE(ch.title || ' — ' || cl.title, cl.title, 'تحدي القراءة') AS activity_name,
  cl.id AS activity_id,
  CASE WHEN sp.student_id IS NOT NULL THEN 'registered' ELSE 'guest' END AS participant_type,
  sp.student_id AS student_id,
  COALESCE(p.full_name, sp.guest_name, 'مشارك زائر') AS full_name,
  p.email AS email,
  COALESCE(p.grade, sp.guest_grade) AS grade,
  COALESCE(p.section, sp.guest_section) AS section,
  sp.status AS status,
  sp.score AS score,
  jsonb_build_object(
    'level_number', cl.level_number,
    'level_title', cl.title,
    'challenge_title', ch.title,
    'completed_at', sp.completed_at
  ) AS details,
  COALESCE(sp.completed_at, NOW()) AS created_at,
  sp.guest_session_id AS guest_session_id
FROM public.student_progress sp
LEFT JOIN public.challenge_levels cl ON cl.id = sp.challenge_level_id
LEFT JOIN public.challenges ch ON ch.id = cl.challenge_id
LEFT JOIN public.profiles p ON p.id = sp.student_id
WHERE get_user_role() = 'teacher'

UNION ALL

SELECT 
  rs.id AS id,
  'research' AS activity_type,
  rs.title AS activity_name,
  rs.id AS activity_id,
  CASE WHEN rs.student_id IS NOT NULL THEN 'registered' ELSE 'guest' END AS participant_type,
  rs.student_id AS student_id,
  COALESCE(p.full_name, rs.guest_name, 'مشارك زائر') AS full_name,
  COALESCE(p.email, rs.guest_email) AS email,
  COALESCE(p.grade, rs.guest_grade) AS grade,
  COALESCE(p.section, rs.guest_section) AS section,
  rs.status AS status,
  re.total_score AS score,
  jsonb_build_object(
    'field', rs.field,
    'summary', rs.summary,
    'file_url', rs.file_url,
    'submitted_at', rs.submitted_at,
    'evaluation_score', re.total_score,
    'evaluation_notes', re.notes,
    'evaluation_criteria', re.criteria_scores,
    'evaluated_at', re.evaluated_at
  ) AS details,
  rs.submitted_at AS created_at,
  rs.guest_session_id AS guest_session_id
FROM public.research_submissions rs
LEFT JOIN public.profiles p ON p.id = rs.student_id
LEFT JOIN public.research_evaluations re ON re.submission_id = rs.id
WHERE get_user_role() = 'teacher';

-- Grant permissions on view
GRANT SELECT ON public.all_participants_view TO authenticated, anon;
