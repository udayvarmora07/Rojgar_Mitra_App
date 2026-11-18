-- Each advertisement URL may appear only once, so a scraper retry or an overlapping
-- run can never insert the same job twice.
CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_link_key
    ON public.jobs (source_link)
    WHERE source_link IS NOT NULL;
