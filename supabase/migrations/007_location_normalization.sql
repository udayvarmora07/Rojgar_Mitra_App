-- A source's "Job Location" cell is sometimes a sentence ("selected consultants may be
-- placed at any campus"). The app needs a place name, not an essay. This function reduces
-- a detail-page value to the first recognised Gujarat place, or to a short literal value,
-- and returns NULL for genuinely vague wording. The department fallback then fills that.

CREATE OR REPLACE FUNCTION public.location_name(raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
    WITH normalized AS (
        SELECT
            btrim(coalesce(raw, '')) AS cleaned,
            lower(btrim(coalesce(raw, ''))) AS s
    )
    SELECT CASE
        WHEN s = '' THEN NULL
        WHEN s ~ '(^|[^a-z])(devbhumi dwarka)([^a-z]|$)' THEN 'Devbhumi Dwarka'
        WHEN s ~ '(^|[^a-z])(gandhidham)([^a-z]|$)' THEN 'Gandhidham'
        WHEN s ~ '(^|[^a-z])(khambhaliya)([^a-z]|$)' THEN 'Khambhaliya'
        WHEN s ~ '(^|[^a-z])(ahmedabad|amc)([^a-z]|$)' THEN 'Ahmedabad'
        WHEN s ~ '(^|[^a-z])(surat|smc|vnsgu|svnit)([^a-z]|$)' THEN 'Surat'
        WHEN s ~ '(^|[^a-z])(vadodara|vmc)([^a-z]|$)' THEN 'Vadodara'
        WHEN s ~ '(^|[^a-z])(rajkot|rmc)([^a-z]|$)' THEN 'Rajkot'
        WHEN s ~ '(^|[^a-z])(bhavnagar|bmc)([^a-z]|$)' THEN 'Bhavnagar'
        WHEN s ~ '(^|[^a-z])(jamnagar|jmc)([^a-z]|$)' THEN 'Jamnagar'
        WHEN s ~ '(^|[^a-z])(gandhinagar|gmc|gmrc|inflibnet)([^a-z]|$)' THEN 'Gandhinagar'
        WHEN s ~ '(^|[^a-z])(junagadh)([^a-z]|$)' THEN 'Junagadh'
        WHEN s ~ '(^|[^a-z])(navsari|nau)([^a-z]|$)' THEN 'Navsari'
        WHEN s ~ '(^|[^a-z])(bharuch)([^a-z]|$)' THEN 'Bharuch'
        WHEN s ~ '(^|[^a-z])(narmada)([^a-z]|$)' THEN 'Narmada'
        WHEN s ~ '(^|[^a-z])(tapi)([^a-z]|$)' THEN 'Tapi'
        WHEN s ~ '(^|[^a-z])(godhra|panchmahal|sggu)([^a-z]|$)' THEN 'Godhra'
        WHEN s ~ '(^|[^a-z])(anand|spu|irma|iseed)([^a-z]|$)' THEN 'Anand'
        WHEN s ~ '(^|[^a-z])(veraval)([^a-z]|$)' THEN 'Veraval'
        WHEN s ~ '(^|[^a-z])(bhuj|kutch)([^a-z]|$)' THEN 'Bhuj'
        WHEN s ~ '(to be determined|any campus|any tsu|as required|any other|various|multiple|liable to be posted)' THEN NULL
        WHEN s ~ '(^|[^a-z])gujarat([^a-z]|$)' THEN 'Gujarat'
        WHEN length(cleaned) <= 40 THEN cleaned
        ELSE NULL
    END
    FROM normalized;
$$;

CREATE OR REPLACE FUNCTION public.jobs_derive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.education_level := public.education_level_for(NEW.qualification);
    NEW.location := COALESCE(public.location_name(NEW.location), public.location_for(NEW.department));
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jobs_derive_fields ON public.jobs;
CREATE TRIGGER jobs_derive_fields
    BEFORE INSERT OR UPDATE OF qualification, department, location ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION public.jobs_derive_fields();

-- Clean values already stored by an earlier run, falling back to the department mapping.
UPDATE public.jobs
SET location = COALESCE(public.location_name(location), public.location_for(department))
WHERE location IS DISTINCT FROM COALESCE(public.location_name(location), public.location_for(department));
