"""Unit tests for the scraper's pure parsing logic. Run: python -m unittest discover scraper"""

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))

from scraper import (  # noqa: E402
    ORGANISATIONS,
    parse_date,
    parse_gpsc_open,
    parse_ojas_home,
    select_insertable,
)

TODAY = date(2026, 11, 5)

# Mirrors the real OJAS markup: links inside a scrolling div in a <marquee>.
OJAS_HTML = """
<marquee class="ojas-small"><div id="Job_Advt1_rowScrollingNw">
  <a href="AdvtDetails.aspx?sid=K3J&amp;yr=iNS&amp;ano=0Ci">GSSSB - Food Safety Officer ( અંતિમ તારીખ 10-November-2026 )</a>
  <a href="AdvtDetails.aspx?sid=6kB&amp;yr=iNS&amp;ano=9yP">JMC - ગાયનેકોલોજીસ્ટ - 202627 ( અંતિમ તારીખ 17-November-2026 )</a>
  <a href="AdvtDetails.aspx?sid=zzz&amp;ano=1">XYZ - Old Post ( અંતિમ તારીખ 01-October-2026 )</a>
  <a href="AdvtDetails.aspx?sid=no-date">Some notice without a date</a>
  <a href="PreRegistration.aspx">Apply</a>
</div></marquee>
"""

GPSC_HTML = """
<table>
  <tr><th>Advt. No.</th><th>Description</th><th>Total Posts</th><th>Last Apply Date</th><th>Apply Online</th></tr>
  <tr><td>41/2026-27</td><td>Lecturer (Selection Scale)</td><td>12</td><td>20/11/2026 23:59:00</td>
      <td><a href="https://gpsc-ojas.gujarat.gov.in/ApplyOnline.aspx?a=41">Apply</a></td></tr>
  <tr><td>42/2026-27</td><td>Assistant Engineer</td><td>5</td><td>25/11/2026</td><td></td></tr>
</table>
<table><tr><th>Unrelated</th></tr><tr><td>x</td></tr></table>
"""

EMPTY_GPSC_HTML = """
<table><tr><th>Advt. No.</th><th>Description</th><th>Total Posts</th><th>Last Apply Date</th></tr></table>
"""


class ParseDateTests(unittest.TestCase):
    def test_formats_seen_on_portals(self):
        self.assertEqual(parse_date('10-November-2026'), '2026-11-10')
        self.assertEqual(parse_date('20/11/2026 23:59:00'), '2026-11-20')
        self.assertEqual(parse_date('5 Dec 2026'), '2026-12-05')
        self.assertEqual(parse_date('05.01.27'), '2027-01-05')

    def test_gujarati_digits(self):
        self.assertEqual(parse_date('૧૦-૧૧-૨૦૨૬'), '2026-11-10')

    def test_invalid_dates(self):
        self.assertIsNone(parse_date('31/02/2026'))
        self.assertIsNone(parse_date('soon'))
        self.assertIsNone(parse_date(''))


class OjasTests(unittest.TestCase):
    def test_parses_org_title_deadline_and_absolute_link(self):
        jobs = parse_ojas_home(OJAS_HTML, today=TODAY)
        self.assertEqual(len(jobs), 3)  # the dateless notice and "Apply" link are ignored
        first = jobs[0]
        self.assertEqual(first['title'], 'Food Safety Officer')
        self.assertEqual(first['department'], ORGANISATIONS['GSSSB'])
        self.assertEqual(first['deadline'], '2026-11-10')
        self.assertEqual(first['post_date'], '2026-11-05')
        self.assertTrue(first['source_link'].startswith('https://ojas.gujarat.gov.in/AdvtDetails.aspx?'))
        self.assertIn('&ano=0Ci', first['source_link'])

    def test_keeps_gujarati_titles_and_unknown_org_codes(self):
        jobs = parse_ojas_home(OJAS_HTML, today=TODAY)
        self.assertEqual(jobs[1]['title'], 'ગાયનેકોલોજીસ્ટ - 202627')
        self.assertEqual(jobs[2]['department'], 'XYZ')


class GpscTests(unittest.TestCase):
    def test_parses_table_rows(self):
        jobs = parse_gpsc_open(GPSC_HTML, today=TODAY)
        self.assertEqual(len(jobs), 2)
        self.assertEqual(jobs[0]['title'], 'Lecturer (Selection Scale) (Advt. 41/2026-27)')
        self.assertEqual(jobs[0]['deadline'], '2026-11-20')
        self.assertEqual(jobs[0]['source_link'], 'https://gpsc-ojas.gujarat.gov.in/ApplyOnline.aspx?a=41')
        # Row without a link still gets a stable unique source_link for de-duplication.
        self.assertEqual(jobs[1]['source_link'], 'https://gpsc.gujarat.gov.in/RecruitmentOpen#advt-42/2026-27')

    def test_empty_table(self):
        self.assertEqual(parse_gpsc_open(EMPTY_GPSC_HTML, today=TODAY), [])


class SelectInsertableTests(unittest.TestCase):
    def test_filters_expired_dateless_and_duplicates(self):
        jobs = parse_ojas_home(OJAS_HTML, today=TODAY)
        jobs.append(dict(jobs[0]))  # duplicate
        jobs.append({**jobs[0], 'source_link': 'https://x/1', 'deadline': None})
        valid, rejected = select_insertable(jobs, today=TODAY)
        self.assertEqual([j['title'] for j in valid], ['Food Safety Officer', 'ગાયનેકોલોજીસ્ટ - 202627'])
        self.assertEqual(
            sorted(reason for _, reason in rejected),
            ['deadline already passed', 'duplicate in this run', 'no deadline found'],
        )


if __name__ == '__main__':
    unittest.main()


# Mirrors the real aggregated listing: Post Date | Recruitment Board | Job Title | Post Name |
# Vacancies | Qualification | Advt No | Last Date | More Information.
FREEJOBALERT_HTML = """
<table>
  <tr><th>Post Date</th><th>Recruitment Board</th><th>Job Title</th><th>Post Name</th>
      <th>Vacancies</th><th>Qualification</th><th>Advt No</th><th>Last Date</th>
      <th>More Information</th></tr>
  <tr><td>06/11/26 06/11/2026</td><td>ONGC</td>
      <td>ONGC Vacancy 2026 - 3047 Apprentice Posts</td>
      <td>Apprentice – 3047 Posts</td><td>3047 Posts</td><td>Diploma, ITI, 12TH, 10TH</td>
      <td>ONGC/APPR/1/2026</td><td>20-11-2026</td>
      <td><a href="https://www.freejobalert.com/articles/ongc-apprentice-recruitment-2026">Get Details</a></td></tr>
  <tr><td>17/11/26 17/11/2026</td><td>SMC</td>
      <td>SMC Vacancy 2026 - 70 Deputy Town Planner</td>
      <td>Deputy Town Planner, Assistant Town Planner – 70 Posts</td><td>70 Posts</td>
      <td>Post Graduate, B.Arch</td><td>PRO/320/2026-27</td><td>30-11-2026</td>
      <td><a href="https://www.freejobalert.com/articles/smc-recruitment-2026">Get Details</a></td></tr>
  <tr><td>17/11/26 17/11/2026</td><td>JMC</td>
      <td>JMC Vacancy 2026 - Staff Nurse</td>
      <td>Staff Nurse – 31 Posts</td><td>31 Posts</td><td>Graduate</td>
      <td>–</td><td>17-11-2026</td>
      <td><a href="https://www.freejobalert.com/articles/jmc-recruitment-2026">Get Details</a></td></tr>
</table>
<table>
  <tr><th>Nothing</th></tr><tr><td>Navigation table, must be ignored</td></tr>
</table>
"""


class FreeJobAlertTests(unittest.TestCase):
    def test_extracts_vacancies_qualification_and_advertisement_number(self):
        from scraper import parse_freejobalert_gujarat

        jobs = parse_freejobalert_gujarat(FREEJOBALERT_HTML, today=TODAY)
        self.assertEqual(len(jobs), 3)
        first = jobs[0]
        self.assertEqual(first['title'], 'Apprentice')
        self.assertEqual(first['department'], 'ONGC')
        self.assertEqual(first['deadline'], '2026-11-20')
        self.assertEqual(first['vacancies'], 3047)
        self.assertEqual(first['qualification'], 'Diploma, ITI, 12TH, 10TH')
        self.assertEqual(first['advertisement_no'], 'ONGC/APPR/1/2026')

    def test_multiple_post_names_keep_their_own_vacancy_count(self):
        from scraper import parse_freejobalert_gujarat

        jobs = parse_freejobalert_gujarat(FREEJOBALERT_HTML, today=TODAY)
        self.assertEqual(jobs[1]['title'], 'Deputy Town Planner, Assistant Town Planner')
        self.assertEqual(jobs[1]['vacancies'], 70)

    def test_dash_placeholders_become_null(self):
        from scraper import parse_freejobalert_gujarat

        jobs = parse_freejobalert_gujarat(FREEJOBALERT_HTML, today=TODAY)
        self.assertIsNone(jobs[2]['advertisement_no'])

    def test_ignores_tables_without_recruitment_columns(self):
        from scraper import parse_freejobalert_gujarat

        nav_only = '<table><tr><th>Nothing</th></tr><tr><td>x</td></tr></table>'
        self.assertEqual(parse_freejobalert_gujarat(nav_only, today=TODAY), [])


class NormalizeJobTests(unittest.TestCase):
    def test_every_row_carries_the_same_keys(self):
        """PostgREST rejects a mixed-shape batch with PGRST102, so this must hold."""
        from scraper import JOB_FIELDS, normalize_job

        ojas_row = normalize_job(
            {
                'title': 'Surveyor',
                'department': 'GSSSB',
                'source_link': 'https://ojas.gujarat.gov.in/a',
                'post_date': '2026-11-05',
                'deadline': '2026-11-20',
                'salary': None,
            }
        )
        fja_row = normalize_job(
            {
                'title': 'Apprentice',
                'department': 'ONGC',
                'source_link': 'https://www.freejobalert.com/b',
                'post_date': '2026-11-05',
                'deadline': '2026-11-20',
                'salary': None,
                'vacancies': 3047,
                'qualification': 'ITI',
                'advertisement_no': 'ONGC/1',
            }
        )
        self.assertEqual(set(ojas_row), set(JOB_FIELDS))
        self.assertEqual(set(fja_row), set(JOB_FIELDS))
        self.assertIsNone(ojas_row['vacancies'])


class SelectInsertableShapeTests(unittest.TestCase):
    def test_valid_rows_are_normalized(self):
        valid, _ = select_insertable(
            [
                {
                    'title': 'A',
                    'department': 'ONGC',
                    'source_link': 'https://example.test/a',
                    'post_date': '2026-11-05',
                    'deadline': '2026-11-20',
                }
            ],
            today=TODAY,
        )
        self.assertEqual(len(valid), 1)
        self.assertIn('vacancies', valid[0])
        self.assertIn('advertisement_no', valid[0])
