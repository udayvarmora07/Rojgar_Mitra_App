-- The official destination for a notice, so the app never labels a third-party summary
-- "Official Website". FreeJobAlert articles carry an `Official Website`, `Apply Online` or
-- `Official Notification PDF` link; the scraper stores the best of those here.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS official_link TEXT;

-- Only a web address can be opened; a malformed scrape must not become a dead button.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_official_link_http;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_official_link_http
    CHECK (official_link IS NULL OR official_link ~* '^https?://');

-- Some notices genuinely have no age limit: project and contract posts, and deputation posts
-- where only service eligibility applies. The qualification is still a usable requirement, so
-- the column no longer forces a placeholder sentence into every row.
ALTER TABLE public.job_details ALTER COLUMN age_limit DROP NOT NULL;
