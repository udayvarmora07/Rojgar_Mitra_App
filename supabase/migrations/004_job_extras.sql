-- Extra facts that the aggregated Gujarat listing provides and rural users care about:
-- how many posts there are, what study level is required, and the advertisement number
-- they must quote on the application form.
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS vacancies INT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS advertisement_no TEXT;

-- Non-negative counts only; a scraper typo must not publish "0 vacancies".
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_vacancies_positive;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_vacancies_positive
    CHECK (vacancies IS NULL OR vacancies >= 0);
