-- 1. Setup Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Permissions Helper Structure
CREATE OR REPLACE FUNCTION get_user_role() RETURNS text AS $$
DECLARE
  u_role text;
BEGIN
  SELECT role INTO u_role FROM public.profiles WHERE id = auth.uid();
  RETURN u_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Trigger Support Function
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PROFILES (Users)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    full_name TEXT,
    grade TEXT,
    section TEXT,
    role TEXT DEFAULT 'student' CHECK (
        role IN ('student', 'teacher')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto create profile on user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', 'student');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON profiles FOR
SELECT USING (auth.uid () = id);

CREATE POLICY "Teachers view all profiles" ON profiles FOR
SELECT USING (get_user_role () = 'teacher');

CREATE POLICY "Users update own profile" ON profiles FOR
UPDATE USING (auth.uid () = id);

-- ============================================
-- GLOBAL QUESTIONS REPOSITORY
-- ============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    type TEXT NOT NULL CHECK (
        type IN (
            'mcq',
            'tf',
            'multi',
            'order',
            'match'
        )
    ),
    text TEXT NOT NULL,
    image_url TEXT,
    points INTEGER DEFAULT 1,
    metadata JSONB, -- stores options, correct answer, etc
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
-- For now, read all active questions
CREATE POLICY "Everyone reads questions" ON questions FOR
SELECT USING (true);

CREATE POLICY "Teachers insert questions" ON questions FOR
INSERT
WITH
    CHECK (get_user_role () = 'teacher');

CREATE POLICY "Teachers update questions" ON questions FOR
UPDATE USING (get_user_role () = 'teacher');

CREATE POLICY "Teachers delete questions" ON questions FOR DELETE USING (get_user_role () = 'teacher');

-- ============================================
-- "DEVELOP YOURSELF" CHALLENGES
-- ============================================
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'active' CHECK (
        status IN ('active', 'inactive')
    ),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read active challenges" ON challenges FOR
SELECT USING (
        status = 'active'
        OR get_user_role () = 'teacher'
    );

CREATE POLICY "Teachers manage challenges" ON challenges FOR ALL USING (get_user_role () = 'teacher');

CREATE TABLE challenge_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    challenge_id UUID REFERENCES challenges (id) ON DELETE CASCADE,
    level_number INT NOT NULL,
    title TEXT NOT NULL,
    paragraph TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE challenge_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read levels" ON challenge_levels FOR
SELECT USING (true);

CREATE POLICY "Teachers manage levels" ON challenge_levels FOR ALL USING (get_user_role () = 'teacher');

CREATE TABLE challenge_questions (
    challenge_level_id UUID REFERENCES challenge_levels (id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions (id) ON DELETE CASCADE,
    order_num INT DEFAULT 0,
    PRIMARY KEY (
        challenge_level_id,
        question_id
    )
);

ALTER TABLE challenge_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read challenge_questions" ON challenge_questions FOR
SELECT USING (true);

CREATE POLICY "Teachers manage challenge_questions" ON challenge_questions FOR ALL USING (get_user_role () = 'teacher');

CREATE TABLE student_progress (
    student_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
    challenge_level_id UUID REFERENCES challenge_levels (id) ON DELETE CASCADE,
    status TEXT DEFAULT 'in_progress',
    score INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (
        student_id,
        challenge_level_id
    )
);

ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own progress" ON student_progress FOR
SELECT USING (
        auth.uid () = student_id
        OR get_user_role () = 'teacher'
    );

CREATE POLICY "Students insert progress" ON student_progress FOR
INSERT
WITH
    CHECK (auth.uid () = student_id);

CREATE POLICY "Students update progress" ON student_progress FOR
UPDATE USING (auth.uid () = student_id);

CREATE POLICY "Teachers all progress" ON student_progress FOR ALL USING (get_user_role () = 'teacher');

-- ============================================
-- COMPETITIONS (Limited time events)
-- ============================================
CREATE TABLE competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone reads competitions" ON competitions FOR
SELECT USING (true);

CREATE POLICY "Teachers manage competitions" ON competitions FOR ALL USING (get_user_role () = 'teacher');

CREATE TABLE competition_questions (
    competition_id UUID REFERENCES competitions (id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions (id) ON DELETE CASCADE,
    order_num INT DEFAULT 0,
    PRIMARY KEY (competition_id, question_id)
);

ALTER TABLE competition_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read comp questions" ON competition_questions FOR
SELECT USING (true);

CREATE POLICY "Teachers manage comp questions" ON competition_questions FOR ALL USING (get_user_role () = 'teacher');

CREATE TABLE competition_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    student_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
    competition_id UUID REFERENCES competitions (id) ON DELETE CASCADE,
    status TEXT DEFAULT 'started',
    total_score INT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

ALTER TABLE competition_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own attempts" ON competition_attempts FOR
SELECT USING (
        auth.uid () = student_id
        OR get_user_role () = 'teacher'
    );

CREATE POLICY "Students insert attempts" ON competition_attempts FOR
INSERT
WITH
    CHECK (auth.uid () = student_id);

CREATE POLICY "Students update attempts" ON competition_attempts FOR
UPDATE USING (auth.uid () = student_id);

CREATE TABLE attempt_answers (
    attempt_id UUID REFERENCES competition_attempts (id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions (id) ON DELETE CASCADE,
    answer_data JSONB,
    score INT DEFAULT 0,
    PRIMARY KEY (attempt_id, question_id)
);

ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;
-- Using a subquery for policy check can be expensive but ensures RLS integrity securely.
CREATE POLICY "Students view own answers" ON attempt_answers FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM competition_attempts ca
            WHERE
                ca.id = attempt_answers.attempt_id
                AND ca.student_id = auth.uid ()
        )
        OR get_user_role () = 'teacher'
    );

CREATE POLICY "Students insert answers" ON attempt_answers FOR
INSERT
WITH
    CHECK (
        EXISTS (
            SELECT 1
            FROM competition_attempts ca
            WHERE
                ca.id = attempt_answers.attempt_id
                AND ca.student_id = auth.uid ()
        )
    );

CREATE POLICY "Students update answers" ON attempt_answers FOR
UPDATE USING (
    EXISTS (
        SELECT 1
        FROM competition_attempts ca
        WHERE
            ca.id = attempt_answers.attempt_id
            AND ca.student_id = auth.uid ()
    )
);

-- ============================================
-- SCIENTIFIC RESEARCH SUBMISSIONS
-- ============================================
CREATE TABLE research_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    student_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    field TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'submitted' CHECK (
        status IN (
            'submitted',
            'under_review',
            'evaluated'
        )
    ),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER submission_updated_at BEFORE UPDATE ON research_submissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE research_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own submission" ON research_submissions FOR
SELECT USING (
        auth.uid () = student_id
        OR get_user_role () = 'teacher'
    );

CREATE POLICY "Students insert submission" ON research_submissions FOR
INSERT
WITH
    CHECK (auth.uid () = student_id);

CREATE POLICY "Students update own submission" ON research_submissions FOR
UPDATE USING (
    auth.uid () = student_id
    AND status = 'submitted'
);

CREATE POLICY "Teachers manage submissions" ON research_submissions FOR ALL USING (get_user_role () = 'teacher');

CREATE TABLE research_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    submission_id UUID REFERENCES research_submissions (id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES profiles (id) ON DELETE CASCADE,
    criteria_scores JSONB,
    total_score INT,
    notes TEXT,
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE research_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own evaluation" ON research_evaluations FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM research_submissions rs
            WHERE
                rs.id = submission_id
                AND rs.student_id = auth.uid ()
        )
        OR get_user_role () = 'teacher'
    );

CREATE POLICY "Teachers insert evaluations" ON research_evaluations FOR
INSERT
WITH
    CHECK (
        get_user_role () = 'teacher'
        AND auth.uid () = teacher_id
    );

CREATE POLICY "Teachers update evaluations" ON research_evaluations FOR
UPDATE USING (
    get_user_role () = 'teacher'
    AND auth.uid () = teacher_id
);

-- ============================================
-- CONTENT PAGES (Identity & Future pages)
-- ============================================
CREATE TABLE content_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4 (),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    cover_image TEXT,
    status TEXT DEFAULT 'published',
    author_id UUID REFERENCES profiles (id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER content_pages_updated_at BEFORE UPDATE ON content_pages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE content_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read published pages" ON content_pages FOR
SELECT USING (
        status = 'published'
        OR get_user_role () = 'teacher'
    );

CREATE POLICY "Teachers manage pages" ON content_pages FOR ALL USING (get_user_role () = 'teacher');

-- ============================================
-- SUPABASE STORAGE BUCKETS
-- ============================================
-- Safe creation script. Usually storage.buckets requires service key to insert if not via UI, but since we're using migration, auth.uid is bypassed.
INSERT INTO
    storage.buckets (id, name, public)
VALUES (
        'public_assets',
        'public_assets',
        true
    ) ON CONFLICT DO NOTHING;

INSERT INTO
    storage.buckets (id, name, public)
VALUES (
        'research_files',
        'research_files',
        false
    ) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read assets" ON storage.objects FOR
SELECT USING (bucket_id = 'public_assets');

CREATE POLICY "Teachers upload assets" ON storage.objects FOR
INSERT
WITH
    CHECK (
        bucket_id = 'public_assets'
        AND get_user_role () = 'teacher'
    );

-- Research files RLS: Student reads/writes own. Teacher reads all.
CREATE POLICY "Students view research files" ON storage.objects FOR
SELECT USING (
        bucket_id = 'research_files'
        AND (
            auth.uid () = owner
            OR get_user_role () = 'teacher'
        )
    );

CREATE POLICY "Students upload research files" ON storage.objects FOR
INSERT
WITH
    CHECK (
        bucket_id = 'research_files'
        AND auth.uid () = owner
    );

CREATE POLICY "Students update research files" ON storage.objects FOR
UPDATE USING (
    bucket_id = 'research_files'
    AND auth.uid () = owner
);