-- PDF enrichment backfill, 2026-11-19.
-- 14 salary fills and 15 job_details rows derived from official notification PDFs.
-- Validated against the hosted project; see HANDOFF.md section 0.
-- Safe to re-run: a salary is only filled when null, and a detail row only when none exists.

begin;
-- salary fills (only when still null)
update public.jobs set salary = 'Rs.67700-208700/-' where id = 'd8ececf1-3e7f-43cf-92c2-1e26e646111a' and salary is null;
update public.jobs set salary = '26000/- Fix Pay' where id = 'a2e3164f-4916-475d-92cf-dfa307e4739b' and salary is null;
update public.jobs set salary = 'Rs. 8,200 to Rs. 12,300' where id = 'f475a562-7855-45bb-a104-630fa723646f' and salary is null;
update public.jobs set salary = 'Rs. 44900-142400/-, Level-8' where id = '9f8f8037-a0db-4501-8ea8-2d2cda7c372f' and salary is null;
update public.jobs set salary = 'Rs. 9300-34800/-, Grade Pay-4600, Entry pay-44900/-, Level-8' where id = '2010792a-b1a2-4029-9343-f50dfe116210' and salary is null;
update public.jobs set salary = 'Rs. 9300-34800/- Grade Pay-5400-Entry pay-53100/-' where id = '0f875166-d563-45d0-bc96-d66b744a9172' and salary is null;
update public.jobs set salary = 'Rs. 9300-34800/- Grade Pay-5400-Entry pay-53100/-' where id = '23ab3cf2-18cb-43e9-943f-6bc9d38b2972' and salary is null;
update public.jobs set salary = 'Rs.67700-208700/-' where id = '8b5a77e2-5ea5-43d9-b532-8f5730274d61' and salary is null;
update public.jobs set salary = '₹ 78,800-2,09,200' where id = '2e966509-daee-4bd3-b3c5-c4269cf8ddd4' and salary is null;
update public.jobs set salary = '26000/- 40800/- and 49600/- Fix Pay' where id = '95a84958-8565-4c8f-a555-557115e25f6e' and salary is null;
update public.jobs set salary = 'Graduate ₹12,300; Technician ₹10,900; Trade ₹10,560 (posts 15-16) and ₹11,040 (posts 17-26), per month' where id = '03570ca9-12df-4385-9caa-7e0ae2492936' and salary is null;
update public.jobs set salary = '40800/- Fix Pay' where id = '75d141c0-f195-4027-8712-f71768a38ad2' and salary is null;
update public.jobs set salary = '40800/- Fix Pay' where id = '9260309c-c9f6-4c37-bdd5-ce63128a8fd8' and salary is null;
update public.jobs set salary = '₹1,10,000 (₹1,00,000 stipend + ₹10,000 LTA), as per the GR dated 24/11/2023' where id = '14c3e6c3-edff-46af-b390-6baed0b40b2e' and salary is null;
-- eligibility rows (only when none exists)
insert into public.job_details (job_id, age_limit, required_qualifications)
select 'd8ececf1-3e7f-43cf-92c2-1e26e646111a', 'Maximum 35 years', 'a. Possess a bachelor’s degree in Engineering (Civil) or in Technology (Civil) obtained from any of the Universities established or incorporated by or under the Central or a State Act in India or any other educational institution recognized as such or declared to be a deemed university under section 3 of the University Grants Commission Act,1956; or possess an equivalent qualification recognized as such by the Government. b. The basic knowledge of computer application as prescribed in the Gujarat Civil Services Classification and Recruitment (General) Rules 1967, and c. The adequate knowledge of Gujarati or Hindi or Both.'
where not exists (select 1 from public.job_details where job_id = 'd8ececf1-3e7f-43cf-92c2-1e26e646111a');
insert into public.job_details (job_id, age_limit, required_qualifications)
select 'a2e3164f-4916-475d-92cf-dfa307e4739b', '18 to 33 years', '1 Diploma in Civil and Rural Engineering 2 Diploma in Civil Draftsman 3 Diploma in Civil Engineering 4 Diploma in Civil Engineering and Planning 5 Diploma in Civil Engineering (Building Service Engineering) 6 Diploma in Civil Engineering (Construction Technology) 7 Diploma in Civil Engineering (Construction) 8 Diploma in Civil Technology 9 Diploma in Construction Engineering 10 Diploma in Construction Technology 11 Diploma in Construction Technology and Management 12 Diploma in Quantity Surveying and Construction Management 13 Diploma in Survey Engineering 14 Diploma in Transportation Engineering 2) શારીરિક માપદંડ :- સર્વેયરની જગ્યા માટે ઉમેદવારે લઘુત્તમ શારીરિક માપદંડ નીચે મુજબ ધરાવતા હોવા જોઇએ. તબીબી અધિકારી દ'
where not exists (select 1 from public.job_details where job_id = 'a2e3164f-4916-475d-92cf-dfa307e4739b');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '9f8f8037-a0db-4501-8ea8-2d2cda7c372f', '18 to 35 years', 'a. Possess Bachelor’s degree in Engineering (Electrical) or in Electrical and Electronics or Technology (Electrical) obtained from any of the Universities established or incorporated by or under the Central or State Act in India; or any other educational institution recognized as such or declared to be a deemed university under section 3 of the University Grants Commission Act,1956; or possess an equivalent qualification recognized as such by the Government. b. The basic knowledge of computer application as prescribed in the Gujarat Civil Services Classification and Recruitment (General) Rules 1967, and c. The adequate knowledge of Gujarati or Hindi or Both.'
where not exists (select 1 from public.job_details where job_id = '9f8f8037-a0db-4501-8ea8-2d2cda7c372f');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '2010792a-b1a2-4029-9343-f50dfe116210', 'Maximum 35 years', 'a. Possess Bachelor’s degree in Engineering (Electrical) or Technology (Electrical) obatained from any of the Universities established or incorporated by or under the Central or a State Act in India; or any other educational institution recognized as such or declared to be deemed as a university under section 3 of the University Grants Commission Act,1956; b. possess the basic knowledge of computer application as prescribed in the Gujarat Civil Services Classification and Recruitment (General) Rules 1967, and c. possess adequate knowledge of Gujarati or Hindi or Both.'
where not exists (select 1 from public.job_details where job_id = '2010792a-b1a2-4029-9343-f50dfe116210');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '0f875166-d563-45d0-bc96-d66b744a9172', 'Maximum 35 years', 'a. Possess Bachelor’s degree in Engineering (Civil) or Technology (Civil) obatained from any of the Universities established or incorporated by or under the Central or a State Act in India; or any other educational institution recognized as such or declared to be a deemed as a university under section 3 of the University Grants Commission Act,1956; b. possess the basic knowledge of computer application as prescribed in the Gujarat Civil Services Classification and Recruitment (General) Rules 1967, and c. possess adequate knowledge of Gujarati or Hindi or Both.'
where not exists (select 1 from public.job_details where job_id = '0f875166-d563-45d0-bc96-d66b744a9172');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '23ab3cf2-18cb-43e9-943f-6bc9d38b2972', 'Maximum 35 years', 'a. Possess Bachelor’s degree in Engineering (Civil) or Technology (Civil) obatained from any of the Universities established or incorporated by or under the Central or a State Act in India; or any other educational institution recognized as such or declared to be a deemed as a university under section 3 of the University Grants Commission Act,1956; b. possess the basic knowledge of computer application as prescribed in the Gujarat Civil Services Classification and Recruitment (General) Rules 1967, and c. possess adequate knowledge of Gujarati or Hindi or Both.'
where not exists (select 1 from public.job_details where job_id = '23ab3cf2-18cb-43e9-943f-6bc9d38b2972');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '8b5a77e2-5ea5-43d9-b532-8f5730274d61', 'Maximum 35 years', '(i) a bachelor''s degree in Engineering (Mechanical) or in Technology (Mechanical) or in Marine Engineering obtained from any of the Universities established or incorporated by or under the Central or State Act in India or any other educational institution recognized as such or declared to be a deemed university under section 3 of the University Grants Commission Act, 1956; or possess an equivalent qualification recognized as such by the Government, and (ii) The basic knowledge of computer application as prescribed in the Gujarat Civil Services Classification and Recruitment (General) Rules, 1967, and (iii) The adequate knowledge of Gujarati or Hindi or both.'
where not exists (select 1 from public.job_details where job_id = '8b5a77e2-5ea5-43d9-b532-8f5730274d61');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '71179fc8-c58a-4e82-831a-7ec6c61d51c3', '21 to 45 years', '10TH, B.Sc, BFSc'
where not exists (select 1 from public.job_details where job_id = '71179fc8-c58a-4e82-831a-7ec6c61d51c3');
insert into public.job_details (job_id, age_limit, required_qualifications)
select 'd048f2d3-6d4b-49bd-a81a-416cc4652361', 'Maximum 35 years', 'MBBS'
where not exists (select 1 from public.job_details where job_id = 'd048f2d3-6d4b-49bd-a81a-416cc4652361');
insert into public.job_details (job_id, age_limit, required_qualifications)
select 'aaad25d7-15dc-4772-99ce-b435f8687e5b', '25 to 58 years', 'Graduate, MS/MD'
where not exists (select 1 from public.job_details where job_id = 'aaad25d7-15dc-4772-99ce-b435f8687e5b');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '91fa9fe9-b528-40d1-ab6a-35b9c620f41e', 'Maximum 62 years', 'Post Graduate'
where not exists (select 1 from public.job_details where job_id = '91fa9fe9-b528-40d1-ab6a-35b9c620f41e');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '2e966509-daee-4bd3-b3c5-c4269cf8ddd4', 'Maximum 55 years', 'Officers holding analogous positions on regular basis in Pay Level 12 or with five years regular service in Pay Level 11 or with eight years regular service in Pay Level 10 in the Central/ State Government, Universities and other autonomous Organisations.'
where not exists (select 1 from public.job_details where job_id = '2e966509-daee-4bd3-b3c5-c4269cf8ddd4');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '75d141c0-f195-4027-8712-f71768a38ad2', '18 to 37 years', '(b) Possess: (i) a Master''s Degree in Chemistry obtained from any of the Universities established or incorporated by or under the Central or a State Act in India; or any other educational institution recognised as such or declared to be deemed as a University under section 3 of the University Grants Commission Act, 1956, or possess an equivalent qualification recognised by the Government; or (ii) a degree in Food Technology, Diary Technology, Biotechnology, Oil Technology, Agriculture Science, Veterinary Science, Bio- Chemistry, Microbiology or Medicine obtained from any of the Universities established or incorporated by or under the Central or a State Act in India or any other educational institution recognised as such or declared to be de'
where not exists (select 1 from public.job_details where job_id = '75d141c0-f195-4027-8712-f71768a38ad2');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '9260309c-c9f6-4c37-bdd5-ce63128a8fd8', '18 to 37 years', '(b) Possess: (i) a Master''s Degree in Chemistry obtained from any of the Universities established or incorporated by or under the Central or a State Act in India; or any other educational institution recognised as such or declared to be deemed as a University under section 3 of the University Grants Commission Act, 1956, or possess an equivalent qualification recognised by the Government; or (ii) a degree in Food Technology, Diary Technology, Biotechnology, Oil Technology, Agriculture Science, Veterinary Science, Bio- Chemistry, Microbiology or Medicine obtained from any of the Universities established or incorporated by or under the Central or a State Act in India or any other educational institution recognised as such or declared to be de'
where not exists (select 1 from public.job_details where job_id = '9260309c-c9f6-4c37-bdd5-ce63128a8fd8');
insert into public.job_details (job_id, age_limit, required_qualifications)
select '14c3e6c3-edff-46af-b390-6baed0b40b2e', 'Maximum 35 years', 'Applicants must have passed the SSC, HSC and graduation examinations with a minimum of 60% marks each.'
where not exists (select 1 from public.job_details where job_id = '14c3e6c3-edff-46af-b390-6baed0b40b2e');
commit;
