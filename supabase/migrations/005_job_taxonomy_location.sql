-- Two facts the browse surface needs but the listing never gives consistently:
--   * education_level - the lowest study level the advertisement accepts, so a 10th-pass
--     reader can ask for the notices they can actually apply for.
--   * location - the office or exam location, when the source states it.
--
-- Both are derived in one place. The app never parses qualification free text, and the
-- scraper cannot accidentally publish a level that disagrees with the qualification column.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS location TEXT;

-- Minimum level present in a free-text qualification list. "Diploma, ITI, 12TH, 10TH"
-- is 10th because a 10th-pass candidate is accepted; "B.Tech/B.E, Diploma" is Diploma.
-- "Post Graduate" must not count as "Graduate", and "PG Diploma" must not count as a
-- plain Diploma, so both phrases are removed before the lower-level probes run.
CREATE OR REPLACE FUNCTION public.education_level_for(qualification TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
    WITH normalized AS (
        SELECT
            lower(coalesce(qualification, '')) AS raw,
            regexp_replace(lower(coalesce(qualification, '')), 'post[ -]?graduate', ' ', 'g') AS graduate_probe,
            regexp_replace(lower(coalesce(qualification, '')), 'pg[[:space:]]*diploma', ' ', 'g') AS diploma_probe
    ),
    flags AS (
        SELECT
            raw ~ '(^|[^a-z0-9])(10th|ssc|matric|matriculation)([^a-z0-9]|$)' AS has10,
            raw ~ '(^|[^a-z0-9])(12th|hsc|higher secondary|intermediate|mphw)([^a-z0-9]|$)' AS has12,
            raw ~ '(^|[^a-z0-9])(iti|apprentice|apprenticeship|trade certificate)([^a-z0-9]|$)' AS hasiti,
            diploma_probe ~ '(^|[^a-z0-9])(diploma|polytechnic|dmlt|gnm|anm|d\.?pharm)([^a-z0-9]|$)' AS hasdiploma,
            graduate_probe ~ '(^|[^a-z0-9])(graduate|graduation|bachelor|bachelors|b\.?tech|b\.?e|b\.?sc|b\.?com|b\.?a|bca|mbbs|bds|bams|bhms|bums|bpt|baslp|llb|b\.?ed|b\.?p\.?ed|b\.?arch|b\.?plan|b\.?pharm|b\.?pharma|b\.?des|bfsc|bmlt|ca|cs|icwa)([^a-z0-9]|$)' AS hasgraduate,
            raw ~ '(^|[^a-z0-9])(post graduate|postgraduate|master|masters|m\.?phil|ph\.?d|m\.?sc|m\.?com|m\.?a|mba|pgdm|mca|m\.?e|m\.?tech|m\.?arch|m\.?plan|m\.?lib|m\.?pharm|m\.?pharma|m\.?ed|m\.?p\.?ed|msw|m\.?f\.?sc|m\.?fsc|ms|m\.?d|dnb|d\.?m|m\.?ch|llm|pg diploma)([^a-z0-9]|$)' AS haspg
        FROM normalized
    )
    SELECT CASE
        WHEN has10 THEN '10th'
        WHEN has12 THEN '12th'
        WHEN hasiti THEN 'ITI'
        WHEN hasdiploma THEN 'Diploma'
        WHEN hasgraduate THEN 'Graduate'
        WHEN haspg THEN 'PostGraduate'
        ELSE NULL
    END
    FROM flags;
$$;

-- A conservative fallback for rows whose detail page is not available. A city that is
-- written in the department name is safe; a statewide board is "Gujarat"; anything else
-- stays NULL rather than guessing.
CREATE OR REPLACE FUNCTION public.location_for(department TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
    WITH d AS (SELECT lower(coalesce(department, '')) AS s)
    SELECT CASE
        WHEN s = '' THEN NULL
        WHEN s ~ '(^|[^a-z])(ahmedabad|amc)([^a-z]|$)' THEN 'Ahmedabad'
        WHEN s ~ '(^|[^a-z])(surat|smc|vnsgu|svnit)([^a-z]|$)' THEN 'Surat'
        WHEN s ~ '(^|[^a-z])(vadodara|vmc)([^a-z]|$)' THEN 'Vadodara'
        WHEN s ~ '(^|[^a-z])(rajkot|rmc|aiims rajkot)([^a-z]|$)' THEN 'Rajkot'
        WHEN s ~ '(^|[^a-z])(bhavnagar|bmc)([^a-z]|$)' THEN 'Bhavnagar'
        WHEN s ~ '(^|[^a-z])(jamnagar|jmc)([^a-z]|$)' THEN 'Jamnagar'
        WHEN s ~ '(^|[^a-z])(gandhinagar|gmc|gmrc|inflibnet|iit gandhinagar)([^a-z]|$)' THEN 'Gandhinagar'
        WHEN s ~ '(^|[^a-z])(junagadh)([^a-z]|$)' THEN 'Junagadh'
        WHEN s ~ '(^|[^a-z])(navsari|nau)([^a-z]|$)' THEN 'Navsari'
        WHEN s ~ '(^|[^a-z])(bharuch)([^a-z]|$)' THEN 'Bharuch'
        WHEN s ~ '(^|[^a-z])(narmada)([^a-z]|$)' THEN 'Narmada'
        WHEN s ~ '(^|[^a-z])(tapi)([^a-z]|$)' THEN 'Tapi'
        WHEN s ~ '(^|[^a-z])(godhra|panchmahal|sggu)([^a-z]|$)' THEN 'Godhra'
        WHEN s ~ '(^|[^a-z])(anand|spu|irma|iseed)([^a-z]|$)' THEN 'Anand'
        WHEN s ~ '(^|[^a-z])(gujarat public service commission|gpsc|gujarat subordinate service selection board|gsssb|gujarat panchayat service selection board|gpssb|gujarat police recruitment board|gprb|gujarat high court|director general of police|gujarat state road transport corporation|gsrtc|spipa)([^a-z]|$)' THEN 'Gujarat'
        ELSE NULL
    END
    FROM d;
$$;

-- One trigger keeps both derived columns consistent with their source columns. A parsed
-- location from the scraper wins; the department fallback only fills an empty value.
CREATE OR REPLACE FUNCTION public.jobs_derive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.education_level := public.education_level_for(NEW.qualification);
    NEW.location := COALESCE(NULLIF(btrim(NEW.location), ''), public.location_for(NEW.department));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_derive_fields ON public.jobs;
CREATE TRIGGER jobs_derive_fields
    BEFORE INSERT OR UPDATE OF qualification, department, location ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.jobs_derive_fields();

-- Existing rows get the same treatment as new ones.
UPDATE public.jobs
SET education_level = public.education_level_for(qualification)
WHERE education_level IS DISTINCT FROM public.education_level_for(qualification);

UPDATE public.jobs
SET location = public.location_for(department)
WHERE location IS NULL AND public.location_for(department) IS NOT NULL;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_education_level_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_education_level_check
    CHECK (education_level IS NULL OR education_level IN ('10th', '12th', 'ITI', 'Diploma', 'Graduate', 'PostGraduate'));

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_location_not_blank;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_location_not_blank
    CHECK (location IS NULL OR btrim(location) <> '');

CREATE INDEX IF NOT EXISTS idx_jobs_education_level ON public.jobs (education_level);
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs (location);
