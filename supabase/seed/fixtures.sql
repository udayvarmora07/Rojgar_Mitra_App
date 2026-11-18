-- Deterministic fixtures for CI and first-run demos.
--
-- The gates must not depend on government sites that can change or throttle, or on a paid
-- LLM call. Deadlines are relative to the day the seed runs, so the list always contains
-- open and closing-soon advertisements whenever CI executes.
--
-- Applied by scripts/seed-fixtures.sh. Re-runnable: both inserts conflict-skip.

INSERT INTO public.jobs
  (title, department, post_date, deadline, salary, source_link, vacancies, qualification, advertisement_no)
VALUES
  ('Junior Clerk', 'Gujarat Gaun Seva Pasandgi Mandal (GSSSB)', CURRENT_DATE - 20, CURRENT_DATE + 3,
   '₹19,950 - ₹63,200', 'https://example.invalid/rojgar-mitra/fixture/junior-clerk', 120,
   'Higher Secondary (12th)', 'GSSSB/2026/101'),
  ('Talati-cum-Mantri', 'Panchayat, Rural Housing and Rural Development Department', CURRENT_DATE - 25, CURRENT_DATE + 5,
   '₹19,950 - ₹63,200', 'https://example.invalid/rojgar-mitra/fixture/talati', 350,
   'Higher Secondary (12th)', 'GPSSB/2026/204'),
  ('Police Constable (LRD)', 'Director General of Police, Gujarat State', CURRENT_DATE - 15, CURRENT_DATE + 6,
   '₹19,900 - ₹63,200', 'https://example.invalid/rojgar-mitra/fixture/police-constable', 1200,
   'Higher Secondary (12th)', 'LRD/2026/08'),
  ('Primary Teacher', 'Education Department, Government of Gujarat', CURRENT_DATE - 30, CURRENT_DATE + 9,
   '₹28,000 - ₹70,000', 'https://example.invalid/rojgar-mitra/fixture/primary-teacher', 400,
   'Graduate + B.Ed', 'EDU/2026/311'),
  ('Staff Nurse', 'Health and Family Welfare Department', CURRENT_DATE - 18, CURRENT_DATE + 14,
   '₹31,340 - ₹71,000', 'https://example.invalid/rojgar-mitra/fixture/staff-nurse', 150,
   'GNM or B.Sc Nursing', 'HFW/2026/52'),
  ('Agriculture Officer', 'Agriculture, Farmers Welfare and Co-operation Department', CURRENT_DATE - 22, CURRENT_DATE + 18,
   '₹38,000 - ₹1,20,000', 'https://example.invalid/rojgar-mitra/fixture/agriculture-officer', 60,
   'B.Sc Agriculture', 'AGRI/2026/17'),
  ('Gram Sevak', 'Panchayat, Rural Housing and Rural Development Department', CURRENT_DATE - 12, CURRENT_DATE + 25,
   '₹19,950 - ₹63,200', 'https://example.invalid/rojgar-mitra/fixture/gram-sevak', 200,
   'Diploma in Rural Studies', 'GPSSB/2026/219'),
  ('Junior Engineer (Civil)', 'Roads and Buildings Department', CURRENT_DATE - 28, CURRENT_DATE + 30,
   '₹31,340 - ₹1,00,000', 'https://example.invalid/rojgar-mitra/fixture/junior-engineer-civil', 45,
   'Diploma in Civil Engineering', 'RNB/2026/09'),
  ('Accountant', 'Directorate of Accounts and Treasuries', CURRENT_DATE - 10, CURRENT_DATE + 45,
   '₹31,340 - ₹71,000', 'https://example.invalid/rojgar-mitra/fixture/accountant', 30,
   'B.Com', 'DAT/2026/14'),
  ('Forest Guard', 'Forests and Environment Department', CURRENT_DATE - 35, CURRENT_DATE + 60,
   '₹19,900 - ₹63,200', 'https://example.invalid/rojgar-mitra/fixture/forest-guard', 220,
   'Higher Secondary (12th)', 'FED/2026/21'),
  ('MPHW (Male)', 'Health and Family Welfare Department', CURRENT_DATE - 8, CURRENT_DATE + 75,
   '₹19,900 - ₹63,200', 'https://example.invalid/rojgar-mitra/fixture/mphw-male', 500,
   '12th + MPHW course', 'HFW/2026/63'),
  ('Deputy Section Officer', 'Gujarat Public Service Commission', CURRENT_DATE - 40, CURRENT_DATE + 90,
   '₹39,600 - ₹1,26,600', 'https://example.invalid/rojgar-mitra/fixture/deputy-section-officer', 75,
   'Graduate', 'GPSC/2026/112')
ON CONFLICT DO NOTHING;

-- Ten stable general-knowledge questions in English, enough for a full native test without
-- an LLM call. Facts are deliberately not time-sensitive.
INSERT INTO public.practice_questions
  (topic, language, subtopic, question, options, correct, explanation, model)
VALUES
  ('gk', 'en', 'Indian Constitution',
   'Which article of the Indian Constitution guarantees equality before the law?',
   '{"A":"Article 12","B":"Article 14","C":"Article 19","D":"Article 21"}', 'B',
   'Article 14 guarantees equality before the law and equal protection of the laws.', 'fixture'),
  ('gk', 'en', 'History of Gujarat',
   'On which date was the state of Gujarat formed?',
   '{"A":"1 May 1960","B":"15 August 1947","C":"26 January 1950","D":"2 October 1960"}', 'A',
   'Gujarat was formed on 1 May 1960, which is celebrated as Gujarat Day.', 'fixture'),
  ('gk', 'en', 'Geography of Gujarat',
   'Which city is the capital of Gujarat?',
   '{"A":"Ahmedabad","B":"Surat","C":"Gandhinagar","D":"Vadodara"}', 'C',
   'Gandhinagar has been the capital of Gujarat since 1970.', 'fixture'),
  ('gk', 'en', 'Geography of Gujarat',
   'Which river flows through the centre of Ahmedabad?',
   '{"A":"Narmada","B":"Sabarmati","C":"Tapi","D":"Mahi"}', 'B',
   'The Sabarmati river flows through the middle of Ahmedabad.', 'fixture'),
  ('gk', 'en', 'Gujarat heritage',
   'In which district is the Statue of Unity located?',
   '{"A":"Narmada","B":"Surat","C":"Kheda","D":"Junagadh"}', 'A',
   'The Statue of Unity stands at Kevadia in Narmada district.', 'fixture'),
  ('gk', 'en', 'Wildlife of Gujarat',
   'Which forest is the only wild home of the Asiatic lion?',
   '{"A":"Gir","B":"Dang","C":"Velavadar","D":"Shoolpaneshwar"}', 'A',
   'Wild Asiatic lions live only in and around the Gir forest of Gujarat.', 'fixture'),
  ('gk', 'en', 'Panchayati Raj',
   'Which constitutional amendment gave Panchayati Raj institutions constitutional status?',
   '{"A":"42nd Amendment","B":"44th Amendment","C":"73rd Amendment","D":"86th Amendment"}', 'C',
   'The 73rd Amendment, passed in 1992, gave Panchayati Raj institutions constitutional status.', 'fixture'),
  ('gk', 'en', 'Freedom movement',
   'In which year did Gandhiji lead the Dandi March?',
   '{"A":"1919","B":"1930","C":"1935","D":"1942"}', 'B',
   'The Dandi March took place in 1930 during the Salt Satyagraha.', 'fixture'),
  ('gk', 'en', 'Gujarat fairs',
   'The Tarnetar fair is held in which district of Gujarat?',
   '{"A":"Surendranagar","B":"Bhavnagar","C":"Kutch","D":"Panchmahal"}', 'A',
   'The Tarnetar fair is held near Thangadh in Surendranagar district.', 'fixture'),
  ('gk', 'en', 'Indian institutions',
   'Where is the headquarters of the Reserve Bank of India?',
   '{"A":"New Delhi","B":"Mumbai","C":"Ahmedabad","D":"Kolkata"}', 'B',
   'The Reserve Bank of India has its central office in Mumbai.', 'fixture')
ON CONFLICT (topic, language, question) DO NOTHING;
