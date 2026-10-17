-- ============================================================
-- Migration 12: Add Username Column for Disambiguation & Guest Sessions
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.competition_attempts ADD COLUMN IF NOT EXISTS guest_username TEXT;
ALTER TABLE public.student_progress ADD COLUMN IF NOT EXISTS guest_username TEXT;

-- Update all_participants_view to expose username
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
  COALESCE(p.username, ca.guest_username, '') AS username,
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
  COALESCE(p.username, sp.guest_username, '') AS username,
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
  COALESCE(p.username, '') AS username,
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
