-- Learning resources become a first-class surface instead of an unused table.
--
-- A resource is either general (job_id NULL) or attached to one advertisement. General
-- rows let the Practice tab publish study material even when no job carries a document.
-- `topic` links an AI_Test row to the practice topic it opens.

ALTER TABLE public.learning_resources ALTER COLUMN job_id DROP NOT NULL;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

UPDATE public.learning_resources
SET title = left(link_or_content, 160)
WHERE title IS NULL OR btrim(title) = '';

ALTER TABLE public.learning_resources ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.learning_resources DROP CONSTRAINT IF EXISTS learning_resources_language_check;
ALTER TABLE public.learning_resources ADD CONSTRAINT learning_resources_language_check
    CHECK (language IS NULL OR language IN ('en', 'gu', 'hi'));

ALTER TABLE public.learning_resources DROP CONSTRAINT IF EXISTS learning_resources_topic_check;
ALTER TABLE public.learning_resources ADD CONSTRAINT learning_resources_topic_check
    CHECK (topic IS NULL OR topic IN ('gk', 'math', 'reasoning', 'gujarati', 'english', 'current'));

ALTER TABLE public.learning_resources DROP CONSTRAINT IF EXISTS learning_resources_link_not_blank;
ALTER TABLE public.learning_resources ADD CONSTRAINT learning_resources_link_not_blank
    CHECK (btrim(link_or_content) <> '');

-- A URL is unique among general resources, and unique within one job. NULL job_id would
-- otherwise be distinct in a normal UNIQUE constraint, so both cases use partial indexes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_resources_global_link
    ON public.learning_resources (link_or_content)
    WHERE job_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_resources_job_link
    ON public.learning_resources (job_id, link_or_content)
    WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_learning_resources_order
    ON public.learning_resources (sort_order, created_at);

-- The six practice topics are always available, even offline. `link_or_content` is an
-- internal key here (`practice:<topic>`), never opened as a browser URL.
INSERT INTO public.learning_resources
    (job_id, resource_type, link_or_content, title, description, language, topic, sort_order)
VALUES
    (NULL, 'AI_Test', 'practice:gk', 'General Knowledge practice test', '10 free questions in your language', NULL, 'gk', 10),
    (NULL, 'AI_Test', 'practice:math', 'Mathematics practice test', '10 free questions in your language', NULL, 'math', 11),
    (NULL, 'AI_Test', 'practice:reasoning', 'Reasoning practice test', '10 free questions in your language', NULL, 'reasoning', 12),
    (NULL, 'AI_Test', 'practice:gujarati', 'Gujarati language practice test', '10 free questions in your language', NULL, 'gujarati', 13),
    (NULL, 'AI_Test', 'practice:english', 'English practice test', '10 free questions in your language', NULL, 'english', 14),
    (NULL, 'AI_Test', 'practice:current', 'Current Affairs practice test', '10 free questions in your language', NULL, 'current', 15),
    (NULL, 'Link', 'https://gpsc.gujarat.gov.in/StageDocument?name=syllabus', 'GPSC syllabus and schemes', 'Official Gujarat Public Service Commission syllabus page', NULL, NULL, 20),
    (NULL, 'Link', 'https://ojas.gujarat.gov.in/', 'OJAS online application portal', 'Official portal for Gujarat government job applications', NULL, NULL, 21),
    (NULL, 'Link', 'https://gsssb.gujarat.gov.in/SyllabusSchemes', 'GSSSB syllabus and schemes', 'Official Gujarat Subordinate Service Selection Board page', NULL, NULL, 22),
    (NULL, 'Link', 'https://gpssb.gujarat.gov.in/previous-year-question-paper-with-answer.htm', 'GPSSB previous year question papers', 'Official Gujarat Panchayat Service Selection Board papers', NULL, NULL, 23)
ON CONFLICT DO NOTHING;
