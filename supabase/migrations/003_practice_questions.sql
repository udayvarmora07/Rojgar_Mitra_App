-- Pre-generated practice questions. A daily job (generator/generate_questions.py) fills this
-- table; the app picks random questions through get_practice_questions(). The app never
-- calls an LLM, so the public key cannot be used to spend AI credit.

CREATE TABLE IF NOT EXISTS public.practice_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL CHECK (topic IN ('gk', 'math', 'reasoning', 'gujarati', 'english', 'current')),
    language TEXT NOT NULL CHECK (language IN ('en', 'gu', 'hi')),
    subtopic TEXT,
    question TEXT NOT NULL CHECK (length(question) BETWEEN 3 AND 1000),
    options JSONB NOT NULL CHECK (
        jsonb_typeof(options) = 'object'
        AND options ?& ARRAY['A', 'B', 'C', 'D']
    ),
    correct TEXT NOT NULL CHECK (correct IN ('A', 'B', 'C', 'D')),
    explanation TEXT NOT NULL DEFAULT '',
    model TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- The same question text may not be stored twice for one topic + language.
    CONSTRAINT practice_questions_unique_question UNIQUE (topic, language, question)
);

CREATE INDEX IF NOT EXISTS idx_practice_questions_topic_language
    ON public.practice_questions (topic, language);

ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read practice_questions" ON public.practice_questions;
CREATE POLICY "Public can read practice_questions" ON public.practice_questions
    FOR SELECT TO anon, authenticated USING (true);

-- Random sample for one test. SECURITY INVOKER: runs with the caller's (read-only) rights.
CREATE OR REPLACE FUNCTION public.get_practice_questions(
    p_topic TEXT,
    p_language TEXT,
    p_count INT DEFAULT 10
)
RETURNS SETOF public.practice_questions
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT *
    FROM public.practice_questions
    WHERE topic = p_topic AND language = p_language
    ORDER BY random()
    LIMIT least(greatest(coalesce(p_count, 10), 1), 20);
$$;

REVOKE ALL ON FUNCTION public.get_practice_questions(TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_practice_questions(TEXT, TEXT, INT) TO anon, authenticated;
