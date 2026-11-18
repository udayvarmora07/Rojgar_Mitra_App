#!/usr/bin/env python3
"""
Rojgar Mitra job scraper.

Collects current Gujarat government job advertisements and inserts new ones into Supabase.

Sources (both server-rendered HTML - no headless browser needed):
  * OJAS home page  - "current advertisements" block. Each link text carries the
    organisation, the post and the last date, e.g.
    "GSSSB - Food Safety Officer ( અંતિમ તારીખ 10-November-2026 )".
  * GPSC "Apply Online" page - table: Advt. No. | Description | Total Posts | Last Apply Date.

Design (patterns borrowed from mature scrapers such as Scrapy):
  * One requests.Session with urllib3 Retry (exponential backoff on 429/5xx).
  * robots.txt is checked before every fetch; a polite delay separates requests.
  * Parsing is pure (HTML in -> dicts out) so it is unit-tested against fixtures.
  * Dry-run by default; --no-dry-run writes with the service-role key (server-side only).

Usage:
  python scraper/scraper.py                 # dry run, prints what would be inserted
  python scraper/scraper.py --no-dry-run    # insert into Supabase
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.robotparser
from datetime import date, datetime
from typing import Iterable, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

try:  # Optional: lets `scraper/.env` provide credentials for local runs.
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
except ImportError:  # pragma: no cover
    pass

OJAS_HOME = 'https://ojas.gujarat.gov.in/'
GPSC_OPEN = 'https://gpsc.gujarat.gov.in/RecruitmentOpen'
# Aggregated listing: one server-rendered table covering Gujarat boards (GSSSB, GPSSB, GPSC,
# municipal corporations, universities). Unlike the individual boards it is stable HTML and
# carries vacancies, qualification and advertisement number in separate columns.
FREEJOBALERT_GUJARAT = 'https://www.freejobalert.com/gujarat-government-jobs/'

USER_AGENT = 'RojgarMitraBot/1.0 (Gujarat government job aggregator)'
REQUEST_DELAY_SECONDS = 2.0
REPORT_PATH = os.path.join(os.path.dirname(__file__), 'scrape_report.json')

# Short codes used on OJAS -> full names a rural user can recognise.
ORGANISATIONS = {
    'GSSSB': 'Gujarat Subordinate Service Selection Board (GSSSB)',
    'GPSC': 'Gujarat Public Service Commission (GPSC)',
    'GPRB': 'Gujarat Police Recruitment Board (GPRB)',
    'GPSSB': 'Gujarat Panchayat Service Selection Board (GPSSB)',
    'GSEB': 'Gujarat Secondary and Higher Secondary Education Board (GSEB)',
    'GHC': 'Gujarat High Court',
    'SPIPA': 'Sardar Patel Institute of Public Administration (SPIPA)',
    'AMC': 'Ahmedabad Municipal Corporation (AMC)',
    'SMC': 'Surat Municipal Corporation (SMC)',
    'VMC': 'Vadodara Municipal Corporation (VMC)',
    'RMC': 'Rajkot Municipal Corporation (RMC)',
    'BMC': 'Bhavnagar Municipal Corporation (BMC)',
    'JMC': 'Jamnagar Municipal Corporation (JMC)',
    'GMC': 'Gandhinagar Municipal Corporation (GMC)',
    'DPA': 'Dholera Port Authority',
    'GSRTC': 'Gujarat State Road Transport Corporation (GSRTC)',
    'GMB': 'Gujarat Maritime Board (GMB)',
    'GIDC': 'Gujarat Industrial Development Corporation (GIDC)',
    'GWSSB': 'Gujarat Water Supply and Sewerage Board (GWSSB)',
    'GUVNL': 'Gujarat Urja Vikas Nigam Limited (GUVNL)',
    'MGVCL': 'Madhya Gujarat Vij Company Limited (MGVCL)',
    'PGVCL': 'Paschim Gujarat Vij Company Limited (PGVCL)',
    'UGVCL': 'Uttar Gujarat Vij Company Limited (UGVCL)',
    'DGVCL': 'Dakshin Gujarat Vij Company Limited (DGVCL)',
    'GETCO': 'Gujarat Energy Transmission Corporation (GETCO)',
}

MONTHS = {
    m: i
    for i, m in enumerate(
        ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'], start=1
    )
}

# Gujarati / Devanagari digits -> ASCII, so "૧૦-૧૧-૨૦૨૬" parses too.
_DIGITS = str.maketrans('૦૧૨૩૪૫૬૭૮૯०१२३४५६७८९', '01234567890123456789')

# "ORG - Post title ( અંતિમ તારીખ 10-November-2026 )"  (also tolerates "Last Date").
OJAS_LINK_RE = re.compile(
    r'^\s*(?P<org>[^-]+?)\s+-\s+(?P<title>.+?)\s*\(\s*(?:અંતિમ\s*તારીખ|Last\s*Date)\s*:?\s*(?P<date>[^)]+?)\s*\)\s*$',
    re.I,
)


# --------------------------------------------------------------------------- parsing


def parse_date(text: str) -> Optional[str]:
    """Parse an Indian (day-first) date into YYYY-MM-DD. Returns None if nothing valid is found."""
    if not text:
        return None
    text = str(text).translate(_DIGITS)

    patterns = [
        (r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', False),
        (r'(\d{1,2})[\s,-]*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?[\s,-]*(\d{4})', True),
        (r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})\b', False),
    ]
    for pattern, named_month in patterns:
        for match in re.finditer(pattern, text, re.I):
            day, month, year = match.groups()
            month_num = MONTHS[month[:3].lower()] if named_month else int(month)
            year_num = int(year) + 2000 if len(year) == 2 else int(year)
            try:
                return date(year_num, month_num, int(day)).isoformat()
            except ValueError:
                continue
    return None


def _clean(text: str) -> str:
    return ' '.join((text or '').split())


def _department(code: str) -> str:
    code = _clean(code)
    return ORGANISATIONS.get(code.upper(), code)


def parse_ojas_home(html: bytes | str, base_url: str = OJAS_HOME, today: Optional[date] = None) -> list[dict]:
    """Current advertisements from the OJAS home page."""
    today = today or date.today()
    soup = BeautifulSoup(html, 'lxml')
    jobs = []
    for link in soup.select('a[href*="AdvtDetails"]'):
        match = OJAS_LINK_RE.match(_clean(link.get_text(' ')))
        if not match:
            continue
        jobs.append(
            {
                'title': match['title'][:200],
                'department': _department(match['org']),
                'source_link': urljoin(base_url, link['href'].strip()),
                'post_date': today.isoformat(),
                'deadline': parse_date(match['date']),
                'salary': None,
            }
        )
    return jobs


def parse_gpsc_open(html: bytes | str, base_url: str = GPSC_OPEN, today: Optional[date] = None) -> list[dict]:
    """Open recruitments from GPSC's table (Advt. No. | Description | Total Posts | Last Apply Date | ...)."""
    today = today or date.today()
    soup = BeautifulSoup(html, 'lxml')
    jobs = []
    for table in soup.find_all('table'):
        headers = [_clean(th.get_text(' ')).lower() for th in table.find_all('th')]
        if not any('advt' in h for h in headers) or not any('date' in h for h in headers):
            continue
        idx_advt = next(i for i, h in enumerate(headers) if 'advt' in h)
        idx_desc = next((i for i, h in enumerate(headers) if 'desc' in h or 'title' in h), idx_advt + 1)
        idx_date = next(i for i, h in enumerate(headers) if 'date' in h)

        for row in table.find_all('tr'):
            cells = row.find_all('td')
            if len(cells) <= max(idx_advt, idx_desc, idx_date):
                continue
            advt_no = _clean(cells[idx_advt].get_text(' '))
            title = _clean(cells[idx_desc].get_text(' '))
            if not title:
                continue
            link = row.find('a', href=True)
            # A stable unique link is needed for de-duplication even when the row has no anchor.
            source = urljoin(base_url, link['href'].strip()) if link else f'{base_url}#advt-{advt_no}'
            jobs.append(
                {
                    'title': (f'{title} (Advt. {advt_no})' if advt_no else title)[:200],
                    'department': ORGANISATIONS['GPSC'],
                    'source_link': source,
                    'post_date': today.isoformat(),
                    'deadline': parse_date(cells[idx_date].get_text(' ')),
                    'salary': None,
                }
            )
    return jobs


def parse_freejobalert_gujarat(
    html: bytes | str, base_url: str = FREEJOBALERT_GUJARAT, today: Optional[date] = None
) -> list[dict]:
    """Gujarat rows from the aggregated freejobalert table.

    Columns: Post Date | Recruitment Board | Job Title | Post Name | Vacancies |
             Qualification | Advt No | Last Date | More Information

    This is the richest free source: it carries the closing date, the vacancy count, the
    required study level and the advertisement number, all server-rendered.
    """
    today = today or date.today()
    soup = BeautifulSoup(html, 'lxml')
    jobs: list[dict] = []

    for table in soup.find_all('table'):
        headers = [_clean(th.get_text(' ')).lower() for th in table.find_all('th')]
        # Identify the recruitment table by its distinctive columns.
        if not any('last date' in h for h in headers):
            continue
        if not any('board' in h or 'recruitment' in h for h in headers):
            continue

        def col(*names: str) -> Optional[int]:
            for name in names:
                for i, h in enumerate(headers):
                    if name in h:
                        return i
            return None

        idx_board = col('board')
        idx_post = col('post name')
        idx_title = col('job title')
        idx_vac = col('vacanc')
        idx_qual = col('qualification')
        idx_advt = col('advt')
        idx_last = col('last date')
        if idx_board is None or idx_last is None:
            continue

        for row in table.find_all('tr'):
            cells = row.find_all('td')
            if len(cells) <= max(idx_board, idx_last):
                continue

            def cell(i: Optional[int]) -> str:
                return _clean(cells[i].get_text(' ')) if i is not None and i < len(cells) else ''

            board = cell(idx_board)
            post = cell(idx_post)
            title = cell(idx_title)
            if not board or not (post or title):
                continue

            link = row.find('a', href=True)
            if not link:
                continue
            source = urljoin(base_url, link['href'].strip())
            if urlparse(source).scheme not in ('http', 'https'):
                continue

            # The "Post Name" cell reads "Apprentice – 3047 Posts"; drop the trailing count.
            post_clean = re.sub(r'\s*[–-]\s*\d[\d,]*\s+Posts?\s*$', '', post, flags=re.I)
            label = post_clean or title

            vac_text = cell(idx_vac)
            vac_match = re.search(r'([\d,]+)', vac_text)
            vacancies = int(vac_match.group(1).replace(',', '')) if vac_match else None

            # The listing uses "–" for "not applicable"; store NULL instead of a dash.
            advertisement_no = cell(idx_advt)[:80]
            if advertisement_no in ('–', '-', '—', ''):
                advertisement_no = None
            qualification = cell(idx_qual)[:200]
            if qualification in ('–', '-', '—', ''):
                qualification = None

            jobs.append(
                {
                    'title': label[:200],
                    'department': _department(board),
                    'source_link': source,
                    'post_date': today.isoformat(),
                    'deadline': parse_date(cell(idx_last)),
                    'salary': None,
                    'vacancies': vacancies,
                    'qualification': qualification,
                    'advertisement_no': advertisement_no,
                }
            )
    return jobs


# Every row sent to PostgREST in one bulk insert must carry the same key set, or the API
# rejects the whole batch with PGRST102 "All object keys must match". Sources fill different
# subsets (the aggregated listing has vacancies, OJAS does not), so normalise before sending.
JOB_FIELDS = (
    'title',
    'department',
    'source_link',
    'post_date',
    'deadline',
    'salary',
    'vacancies',
    'qualification',
    'advertisement_no',
)


def normalize_job(job: dict) -> dict:
    return {field: job.get(field) for field in JOB_FIELDS}


def select_insertable(jobs: Iterable[dict], today: Optional[date] = None) -> tuple[list[dict], list[tuple[dict, str]]]:
    """Split jobs into (valid, rejected-with-reason). De-duplicates by source_link within the run."""
    today = today or date.today()
    valid, rejected, seen = [], [], set()
    for job in jobs:
        link = job.get('source_link')
        if not link or urlparse(link).scheme not in ('http', 'https'):
            rejected.append((job, 'no http(s) source link'))
        elif link in seen:
            rejected.append((job, 'duplicate in this run'))
        elif not job.get('deadline'):
            # `deadline` is NOT NULL, and a job with no last date would mislead users.
            rejected.append((job, 'no deadline found'))
        elif job['deadline'] < today.isoformat():
            rejected.append((job, 'deadline already passed'))
        else:
            seen.add(link)
            valid.append(normalize_job(job))
    return valid, rejected


# --------------------------------------------------------------------------- fetching


def build_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=2,  # exponential backoff between retries
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=('GET', 'HEAD'),
        respect_retry_after_header=True,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    session.headers.update(
        {
            'User-Agent': USER_AGENT,
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-IN,en;q=0.9,gu;q=0.8',
        }
    )
    return session


class PoliteFetcher:
    """Fetches pages while honouring robots.txt and a minimum delay between requests."""

    def __init__(self, session: requests.Session, delay: float = REQUEST_DELAY_SECONDS):
        self.session = session
        self.delay = delay
        self._robots: dict[str, urllib.robotparser.RobotFileParser] = {}
        self._last = 0.0

    def allowed(self, url: str) -> bool:
        origin = '{0.scheme}://{0.netloc}'.format(urlparse(url))
        parser = self._robots.get(origin)
        if parser is None:
            parser = urllib.robotparser.RobotFileParser(origin + '/robots.txt')
            try:
                resp = self.session.get(origin + '/robots.txt', timeout=15)
                parser.parse(resp.text.splitlines() if resp.ok else [])
            except requests.RequestException:
                parser.parse([])  # robots.txt unreachable -> allow-all (standard behaviour)
            self._robots[origin] = parser
        return parser.can_fetch(USER_AGENT, url)

    def get(self, url: str) -> Optional[bytes]:
        if not self.allowed(url):
            print(f'  ✗ robots.txt disallows {url} - skipped')
            return None
        wait = self.delay - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        try:
            resp = self.session.get(url, timeout=30)
            resp.raise_for_status()
            return resp.content
        except requests.RequestException as exc:
            print(f'  ✗ Could not fetch {url}: {exc}')
            return None
        finally:
            self._last = time.monotonic()


# --------------------------------------------------------------------------- database


def supabase_client():
    url = os.environ.get('SUPABASE_URL') or os.environ.get('EXPO_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        raise SystemExit('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for --no-dry-run')
    from supabase import create_client  # lazy import: parsing tests need no DB dependencies

    return create_client(url, key)


def insert_new_jobs(client, jobs: list[dict]) -> dict:
    """Inserts jobs whose source_link is not in the table yet (one lookup query, one insert)."""
    if not jobs:
        return {'inserted': 0, 'already_present': 0}
    links = [j['source_link'] for j in jobs]
    existing = client.table('jobs').select('source_link').in_('source_link', links).execute()
    present = {row['source_link'] for row in existing.data or []}
    new_jobs = [j for j in jobs if j['source_link'] not in present]
    if new_jobs:
        client.table('jobs').insert(new_jobs).execute()
    for job in new_jobs:
        print(f"  ✓ Inserted: {job['title'][:70]}")
    return {'inserted': len(new_jobs), 'already_present': len(present)}


# --------------------------------------------------------------------------- main


def run(dry_run: bool = True) -> dict:
    print('\n🔄 Rojgar Mitra Job Scraper')
    print('=' * 50)
    if dry_run:
        print('⚠️  DRY RUN - nothing will be written to the database\n')

    fetcher = PoliteFetcher(build_session())
    scraped: list[dict] = []
    source_counts = {}
    for url, parser in [
        (OJAS_HOME, parse_ojas_home),
        (GPSC_OPEN, parse_gpsc_open),
        (FREEJOBALERT_GUJARAT, parse_freejobalert_gujarat),
    ]:
        html = fetcher.get(url)
        found = parser(html, url) if html else []
        source_counts[url] = len(found)
        print(f'📥 {url}: {len(found)} advertisements')
        scraped.extend(found)

    valid, rejected = select_insertable(scraped)
    for job, reason in rejected:
        print(f"  - Skipped ({reason}): {job.get('title', '')[:70]}")
    print(f'\n📋 {len(valid)} valid of {len(scraped)} scraped')

    report = {
        'ran_at': datetime.now().isoformat(timespec='seconds'),
        'dry_run': dry_run,
        'sources': source_counts,
        'valid': len(valid),
        'rejected': [{'title': j.get('title'), 'reason': r} for j, r in rejected],
    }

    if dry_run:
        for i, job in enumerate(valid, 1):
            print(f"  {i}. {job['title'][:70]} | {job['department']} | last date {job['deadline']}")
    else:
        report.update(insert_new_jobs(supabase_client(), valid))
        print(f"\n📊 {report['inserted']} inserted, {report['already_present']} already present")

    with open(REPORT_PATH, 'w', encoding='utf-8') as fh:
        json.dump(report, fh, ensure_ascii=False, indent=2)

    # Nothing found anywhere usually means a site changed its layout: fail loudly in CI.
    if sum(source_counts.values()) == 0:
        print('\n❌ No advertisements found on any source - selectors may need updating.')
        report['failed'] = True
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description='Rojgar Mitra job scraper')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--dry-run', dest='dry_run', action='store_true', default=True, help='print only (default)')
    group.add_argument('--no-dry-run', dest='dry_run', action='store_false', help='insert into Supabase')
    args = parser.parse_args()

    report = run(dry_run=args.dry_run)
    if report.get('failed'):
        return 1
    print('\n✅ Done' + (' (dry run)' if args.dry_run else ''))
    return 0


if __name__ == '__main__':
    sys.exit(main())
