-- Rojgar Mitra database schema - Gujarat govt jobs aggregator.
-- Read-only for the app (anon/authenticated); writes only via the service role (scraper).

-- Jobs: one row per advertisement.
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    post_date DATE NOT NULL,
    deadline DATE NOT NULL,
    salary TEXT,
    source_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Eligibility details per job.
CREATE TABLE IF NOT EXISTS public.job_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    age_limit TEXT NOT NULL,
    required_qualifications TEXT NOT NULL,
    application_fees TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents needed to apply / at the exam centre.
CREATE TABLE IF NOT EXISTS public.documents_required (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('Application', 'Exam Center')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Study material per job.
CREATE TABLE IF NOT EXISTS public.learning_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('PDF', 'AI_Test', 'Video', 'Link')),
    link_or_content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes: deadline ordering for the list, FK lookups for detail screens.
CREATE INDEX IF NOT EXISTS idx_jobs_department ON public.jobs (department);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON public.jobs (deadline);
CREATE INDEX IF NOT EXISTS idx_job_details_job_id ON public.job_details (job_id);
CREATE INDEX IF NOT EXISTS idx_documents_required_job_id ON public.documents_required (job_id);
CREATE INDEX IF NOT EXISTS idx_learning_resources_job_id ON public.learning_resources (job_id);

-- Keep jobs.updated_at current on every update.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_set_updated_at ON public.jobs;
CREATE TRIGGER jobs_set_updated_at
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security: public read, no client writes (service role bypasses RLS).
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents_required ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read jobs" ON public.jobs;
CREATE POLICY "Public can read jobs" ON public.jobs
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read job_details" ON public.job_details;
CREATE POLICY "Public can read job_details" ON public.job_details
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read documents_required" ON public.documents_required;
CREATE POLICY "Public can read documents_required" ON public.documents_required
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read learning_resources" ON public.learning_resources;
CREATE POLICY "Public can read learning_resources" ON public.learning_resources
    FOR SELECT TO anon, authenticated USING (true);
