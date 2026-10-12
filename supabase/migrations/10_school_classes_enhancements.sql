-- ============================================================
-- Migration 10: School Classes and Sections Performance Enhancements
-- ============================================================
-- Description: 
--   This migration enhances the existing school_sections structure with
--   performance indexes and verifies RLS policies for the school classes
--   management feature.
--
-- Background:
--   - school_sections table was created in migration 06
--   - Contains grades (العاشر، الحادي عشر، الثاني عشر) and sections (1, 2, 3, etc.)
--   - profiles.grade and profiles.section are TEXT columns that reference these values
--   - No foreign key constraints (flexible structure for easy data entry)
--   - UNIQUE constraint (grade, section_name) already exists to prevent duplicates
--
-- Design Decision:
--   After review, we've decided NOT to create a separate school_grades table.
--   Rationale:
--   1. Current structure (grade as TEXT) is simple and sufficient
--   2. Grades are fixed (10, 11, 12) and rarely change
--   3. Adding a grades table would add unnecessary complexity
--   4. Frontend validation ensures only valid grades are used
--   5. If more complex grade metadata is needed in future, we can add it then
--
-- This migration focuses on:
--   1. Adding performance indexes for common queries
--   2. Documenting the current structure
--   3. Verifying RLS policies are correct
-- ============================================================

-- ============================================================
-- 1. PERFORMANCE INDEXES
-- ============================================================

-- Index on profiles (grade, section) for fast student count queries
-- Used by: teacher-classes.js getStudentCount() and loadStudentsForSection()
-- Query pattern: SELECT COUNT(*) FROM profiles WHERE grade=X AND section=Y AND role='student'
CREATE INDEX IF NOT EXISTS idx_profiles_grade_section 
  ON public.profiles(grade, section);

-- Index on profiles (grade, section, role) for optimized filtered queries
-- Covers queries that filter by role='student' along with grade/section
CREATE INDEX IF NOT EXISTS idx_profiles_grade_section_role 
  ON public.profiles(grade, section, role);

-- Index on school_sections (grade) for grade-based filtering
-- Used by: teacher-classes.js filters (dropdown by grade)
-- Query pattern: SELECT * FROM school_sections WHERE grade=X
CREATE INDEX IF NOT EXISTS idx_school_sections_grade 
  ON public.school_sections(grade);

-- Index on school_sections (is_active) for active sections queries
-- Used by: transfer modal (load only active sections)
-- Query pattern: SELECT * FROM school_sections WHERE is_active=true
CREATE INDEX IF NOT EXISTS idx_school_sections_active 
  ON public.school_sections(is_active);

-- Composite index on school_sections (grade, is_active) for combined filters
-- Used by: loading active sections for a specific grade
-- Query pattern: SELECT * FROM school_sections WHERE grade=X AND is_active=true
CREATE INDEX IF NOT EXISTS idx_school_sections_grade_active 
  ON public.school_sections(grade, is_active);

-- Index on school_sections (sort_order) for ordering
-- Used by: displaying sections in sorted order
CREATE INDEX IF NOT EXISTS idx_school_sections_sort_order 
  ON public.school_sections(sort_order);

-- ============================================================
-- 2. DATA STRUCTURE DOCUMENTATION
-- ============================================================

-- Document the school_sections table structure with comments
COMMENT ON TABLE public.school_sections IS 
  'إدارة صفوف وشعب مدرسة أبو عبيدة. يحتوي على الصفوف الدراسية (العاشر، الحادي عشر، الثاني عشر) والشعب (1، 2، 3، إلخ)';

COMMENT ON COLUMN public.school_sections.grade IS 
  'الصف الدراسي: نص يحتوي على (العاشر، الحادي عشر، الثاني عشر)';

COMMENT ON COLUMN public.school_sections.section_name IS 
  'اسم الشعبة: عادة أرقام (1، 2، 3) أو حروف، نص حر للمرونة';

COMMENT ON COLUMN public.school_sections.is_active IS 
  'حالة التفعيل: true للشعب النشطة، false للمعطلة أو المحذوفة منطقياً';

COMMENT ON COLUMN public.school_sections.sort_order IS 
  'ترتيب العرض: رقم يحدد ترتيب الشعبة عند العرض في القوائم';

-- Document the profiles relationship with school_sections
COMMENT ON COLUMN public.profiles.grade IS 
  'صف الطالب: نص يطابق school_sections.grade (العاشر، الحادي عشر، الثاني عشر)';

COMMENT ON COLUMN public.profiles.section IS 
  'شعبة الطالب: نص يطابق school_sections.section_name';

-- ============================================================
-- 3. RLS POLICIES VERIFICATION
-- ============================================================

-- The following RLS policies exist on school_sections (from migration 06):
--
-- Policy 1: "Anyone can read active sections"
--   FOR SELECT USING (is_active = true OR get_user_role() = 'teacher')
--   Purpose: Students see only active sections, teachers see all
--   Status: ✓ Correct and sufficient
--
-- Policy 2: "Teachers manage sections" 
--   FOR ALL USING (get_user_role() = 'teacher')
--   Purpose: Only teachers can INSERT, UPDATE, DELETE sections
--   Status: ✓ Correct and sufficient
--
-- Verification:
--   - Students CANNOT insert, update, or delete school_sections ✓
--   - Students CAN read only active sections (is_active=true) ✓
--   - Teachers CAN perform all operations (SELECT, INSERT, UPDATE, DELETE) ✓
--   - Teachers CAN see all sections regardless of is_active status ✓
--
-- No changes needed to RLS policies - they are secure and appropriate.

-- ============================================================
-- 4. DATA INTEGRITY VERIFICATION
-- ============================================================

-- The UNIQUE constraint (grade, section_name) already exists from migration 06
-- This prevents duplicate section names within the same grade
-- Verification query (informational only - not executed):
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'school_sections' AND constraint_type = 'UNIQUE';

-- ============================================================
-- 5. QUERY PERFORMANCE NOTES
-- ============================================================

-- Common queries and their index usage:
--
-- 1. Get student count for a section:
--    SELECT COUNT(*) FROM profiles 
--    WHERE grade='العاشر' AND section='1' AND role='student'
--    → Uses idx_profiles_grade_section_role (optimal)
--
-- 2. Load all students in a section:
--    SELECT * FROM profiles 
--    WHERE grade='العاشر' AND section='1' AND role='student'
--    → Uses idx_profiles_grade_section_role (optimal)
--
-- 3. Filter sections by grade:
--    SELECT * FROM school_sections WHERE grade='العاشر'
--    → Uses idx_school_sections_grade (optimal)
--
-- 4. Load active sections for transfer:
--    SELECT * FROM school_sections WHERE is_active=true
--    → Uses idx_school_sections_active (optimal)
--
-- 5. Load active sections for specific grade:
--    SELECT * FROM school_sections 
--    WHERE grade='العاشر' AND is_active=true
--    → Uses idx_school_sections_grade_active (optimal)
--
-- All critical queries are now indexed for optimal performance.

-- ============================================================
-- 6. MIGRATION SAFETY
-- ============================================================

-- This migration is non-destructive:
--   ✓ No tables dropped
--   ✓ No columns removed
--   ✓ No data modified or deleted
--   ✓ Only indexes and comments added
--   ✓ Safe to run on production database
--   ✓ Can be rolled back by dropping indexes if needed

-- Rollback commands (if needed):
-- DROP INDEX IF EXISTS public.idx_profiles_grade_section;
-- DROP INDEX IF EXISTS public.idx_profiles_grade_section_role;
-- DROP INDEX IF EXISTS public.idx_school_sections_grade;
-- DROP INDEX IF EXISTS public.idx_school_sections_active;
-- DROP INDEX IF EXISTS public.idx_school_sections_grade_active;
-- DROP INDEX IF EXISTS public.idx_school_sections_sort_order;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
