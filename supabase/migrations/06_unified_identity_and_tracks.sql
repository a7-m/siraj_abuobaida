-- ============================================================
-- Migration 06: Unified Identity, School Sections, Categories, and Competition Tracks
-- ============================================================

-- 1. Table for Abu Obaida School Sections Management
CREATE TABLE IF NOT EXISTS public.school_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL,
  section_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (grade, section_name)
);

ALTER TABLE public.school_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active sections" ON public.school_sections;
CREATE POLICY "Anyone can read active sections" ON public.school_sections
  FOR SELECT USING (is_active = true OR get_user_role() = 'teacher');

DROP POLICY IF EXISTS "Teachers manage sections" ON public.school_sections;
CREATE POLICY "Teachers manage sections" ON public.school_sections
  FOR ALL USING (get_user_role() = 'teacher');

-- Seed Abu Obaida default sections (Grades 10, 11, 12)
INSERT INTO public.school_sections (grade, section_name, sort_order) VALUES
  ('العاشر', '1', 1),
  ('العاشر', '2', 2),
  ('العاشر', '3', 3),
  ('العاشر', '4', 4),
  ('العاشر', '5', 5),
  ('العاشر', '6', 6),
  ('الحادي عشر', '1', 1),
  ('الحادي عشر', '2', 2),
  ('الحادي عشر', '3', 3),
  ('الحادي عشر', '4', 4),
  ('الحادي عشر', '5', 5),
  ('الثاني عشر', '1', 1),
  ('الثاني عشر', '2', 2),
  ('الثاني عشر', '3', 3),
  ('الثاني عشر', '4', 4)
ON CONFLICT (grade, section_name) DO NOTHING;

-- 2. Educational Categories for "Develop Yourself"
CREATE TABLE IF NOT EXISTS public.challenge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.challenge_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read categories" ON public.challenge_categories;
CREATE POLICY "Anyone can read categories" ON public.challenge_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers manage categories" ON public.challenge_categories;
CREATE POLICY "Teachers manage categories" ON public.challenge_categories
  FOR ALL USING (get_user_role() = 'teacher');

-- Seed initial categories
INSERT INTO public.challenge_categories (name, description, icon, color, sort_order) VALUES
  ('النحو وقواعد اللغة', 'تحديات إتقان قواعد النحو والإعراب والأساليب البلاغية', '📜', '#127547', 1),
  ('الفهم والاستيعاب', 'نصوص مثرية وأسئلة تفاعلية لقياس الفهم القرائي العميق', '📖', '#2563eb', 2),
  ('الإبداع والتعبير', 'مهام إبداعية وفكرية لتنمية التفكير النقدي واللغوي', '💡', '#d97706', 3),
  ('التاريخ والتراث العماني', 'محطات تاريخية وشخصيات عمانية بارزة عبر العصور', '🏰', '#7c3aed', 4)
ON CONFLICT (name) DO NOTHING;

-- 3. Enhance challenges with category and sorting
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.challenge_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_name TEXT,
  ADD COLUMN IF NOT EXISTS order_num INTEGER DEFAULT 1;

-- 4. Enhance challenge_levels with passing score
ALTER TABLE public.challenge_levels
  ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 1;

-- 5. Enhance competitions with track_config
ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS track_config JSONB DEFAULT NULL;

-- 6. Enhance profiles with school details and verification timestamp
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_type TEXT DEFAULT 'abu_obaida',
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;

-- 7. Enhance attempts and progress with guest school metadata
ALTER TABLE public.competition_attempts
  ADD COLUMN IF NOT EXISTS guest_school_type TEXT,
  ADD COLUMN IF NOT EXISTS guest_school_name TEXT;

ALTER TABLE public.student_progress
  ADD COLUMN IF NOT EXISTS guest_school_type TEXT,
  ADD COLUMN IF NOT EXISTS guest_school_name TEXT;

-- 8. Drop and Recreate all_participants_view cleanly
DROP VIEW IF EXISTS public.all_participants_view CASCADE;

CREATE VIEW public.all_participants_view
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
  ca.guest_session_id AS guest_session_id,
  COALESCE(p.school_type, ca.guest_school_type, 'abu_obaida') AS school_type,
  COALESCE(p.school_name, ca.guest_school_name, CASE WHEN COALESCE(p.school_type, ca.guest_school_type, 'abu_obaida') = 'abu_obaida' THEN 'مدرسة أبو عبيدة' ELSE 'مدرسة أخرى' END) AS school_name
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
  sp.guest_session_id AS guest_session_id,
  COALESCE(p.school_type, sp.guest_school_type, 'abu_obaida') AS school_type,
  COALESCE(p.school_name, sp.guest_school_name, CASE WHEN COALESCE(p.school_type, sp.guest_school_type, 'abu_obaida') = 'abu_obaida' THEN 'مدرسة أبو عبيدة' ELSE 'مدرسة أخرى' END) AS school_name
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
  rs.guest_session_id AS guest_session_id,
  COALESCE(p.school_type, 'abu_obaida') AS school_type,
  COALESCE(p.school_name, 'مدرسة أبو عبيدة') AS school_name
FROM public.research_submissions rs
LEFT JOIN public.profiles p ON p.id = rs.student_id
LEFT JOIN public.research_evaluations re ON re.submission_id = rs.id
WHERE get_user_role() = 'teacher';

GRANT SELECT ON public.all_participants_view TO authenticated, anon;
