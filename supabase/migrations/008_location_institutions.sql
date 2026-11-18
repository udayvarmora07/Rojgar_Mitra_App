-- Known Gujarat institutions whose acronym alone does not say where they are. Each mapping
-- below was checked against the institution's own contact page before being added:
--   BKNMU  -> Bhakta Kavi Narsinh Mehta University, Junagadh
--   SDAU   -> Sardarkrushinagar Dantiwada Agricultural University, Banaskantha
--   BAOU   -> Dr. Babasaheb Ambedkar Open University, Ahmedabad
--   GNLU   -> Gujarat National Law University, Gandhinagar
--   ISRO SAC -> Space Applications Centre, Ahmedabad
--   ICAR CMFRI -> Central Marine Fisheries Research Institute, Veraval
--   KU     -> Kutch University, Bhuj
--   Deendayal Port Authority -> Gandhidham
--   Dholera Port Authority -> Dholera

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
        WHEN s ~ '(^|[^a-z])(sardarkrushinagar|dantiwada)([^a-z]|$)' THEN 'Sardarkrushinagar'
        WHEN s ~ '(^|[^a-z])(dholera)([^a-z]|$)' THEN 'Dholera'
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
        WHEN s ~ '(^|[^a-z])(devbhumi dwarka)([^a-z]|$)' THEN 'Devbhumi Dwarka'
        WHEN s ~ '(^|[^a-z])(sardarkrushinagar|dantiwada|sdau)([^a-z]|$)' THEN 'Sardarkrushinagar'
        WHEN s ~ '(^|[^a-z])(dholera)([^a-z]|$)' THEN 'Dholera'
        WHEN s ~ '(^|[^a-z])(gandhidham)([^a-z]|$)' THEN 'Gandhidham'
        WHEN s ~ '(^|[^a-z])(ahmedabad|amc|baou|isro sac)([^a-z]|$)' THEN 'Ahmedabad'
        WHEN s ~ '(^|[^a-z])(surat|smc|vnsgu|svnit)([^a-z]|$)' THEN 'Surat'
        WHEN s ~ '(^|[^a-z])(vadodara|vmc)([^a-z]|$)' THEN 'Vadodara'
        WHEN s ~ '(^|[^a-z])(rajkot|rmc)([^a-z]|$)' THEN 'Rajkot'
        WHEN s ~ '(^|[^a-z])(bhavnagar|bmc)([^a-z]|$)' THEN 'Bhavnagar'
        WHEN s ~ '(^|[^a-z])(jamnagar|jmc)([^a-z]|$)' THEN 'Jamnagar'
        WHEN s ~ '(^|[^a-z])(gandhinagar|gmc|gmrc|inflibnet|gnlu)([^a-z]|$)' THEN 'Gandhinagar'
        WHEN s ~ '(^|[^a-z])(junagadh|bknmu)([^a-z]|$)' THEN 'Junagadh'
        WHEN s ~ '(^|[^a-z])(navsari|nau)([^a-z]|$)' THEN 'Navsari'
        WHEN s ~ '(^|[^a-z])(bharuch)([^a-z]|$)' THEN 'Bharuch'
        WHEN s ~ '(^|[^a-z])(narmada)([^a-z]|$)' THEN 'Narmada'
        WHEN s ~ '(^|[^a-z])(tapi)([^a-z]|$)' THEN 'Tapi'
        WHEN s ~ '(^|[^a-z])(godhra|panchmahal|sggu)([^a-z]|$)' THEN 'Godhra'
        WHEN s ~ '(^|[^a-z])(anand|spu|irma|iseed)([^a-z]|$)' THEN 'Anand'
        WHEN s ~ '(^|[^a-z])(veraval|icar cmfri)([^a-z]|$)' THEN 'Veraval'
        WHEN s ~ '(^|[^a-z])(bhuj|kutch|ku)([^a-z]|$)' THEN 'Bhuj'
        WHEN s ~ '(income tax department gujarat)([^a-z]|$)' THEN 'Gujarat'
        WHEN s ~ '(gujarat public service commission|gpsc|gujarat subordinate service selection board|gsssb|gujarat panchayat service selection board|gpssb|gujarat police recruitment board|gprb|gujarat high court|director general of police|gujarat state road transport corporation|gsrtc|spipa)([^a-z]|$)' THEN 'Gujarat'
        ELSE NULL
    END
    FROM d;
$$;

-- Fill locations for rows the first pass could not resolve.
UPDATE public.jobs
SET location = public.location_for(department)
WHERE location IS NULL AND public.location_for(department) IS NOT NULL;
