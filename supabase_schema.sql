-- Rojgar Mitra Database Schema
-- Gujarat Govt Jobs Aggregator
--
-- NOTE: supabase/migrations/ is the source of truth. This file is kept as a readable
-- reference for the original schema; newer columns and tables (practice_questions,
-- education_level, location, learning-resource metadata) live in migrations 003-008.

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Jobs table: Stores basic job posting information
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    post_date DATE NOT NULL,
    deadline DATE NOT NULL,
    salary TEXT,
    source_link TEXT,
    vacancies INT,
    qualification TEXT,
    advertisement_no TEXT,
    -- Minimum accepted study level, derived from qualification by education_level_for().
    education_level TEXT CHECK (education_level IS NULL OR education_level IN
        ('10th', '12th', 'ITI', 'Diploma', 'Graduate', 'PostGraduate')),
    -- Place name from the source detail page, normalised by location_name().
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job Details table: Stores detailed eligibility information
CREATE TABLE job_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    age_limit TEXT NOT NULL,
    required_qualifications TEXT NOT NULL,
    application_fees TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents Required table: Stores document checklists per job
CREATE TABLE documents_required (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('Application', 'Exam Center')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Learning Resources table: Stores PDFs, AI tests, and other resources.
-- job_id is nullable: a NULL row is a general resource shown from the Practice tab.
CREATE TABLE learning_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('PDF', 'AI_Test', 'Video', 'Link')),
    link_or_content TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT CHECK (language IS NULL OR language IN ('en', 'gu', 'hi')),
    topic TEXT CHECK (topic IS NULL OR topic IN
        ('gk', 'math', 'reasoning', 'gujarati', 'english', 'current')),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_jobs_department ON jobs(department);
CREATE INDEX idx_jobs_deadline ON jobs(deadline);
CREATE INDEX idx_jobs_education_level ON jobs(education_level);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_job_details_job_id ON job_details(job_id);
CREATE INDEX idx_documents_required_job_id ON documents_required(job_id);
CREATE INDEX idx_learning_resources_job_id ON learning_resources(job_id);

-- Row Level Security (RLS) - Keep tables public for now since this is a read-heavy app
-- In production, you may want to add RLS policies

-- Enable RLS on all tables
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_required ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_resources ENABLE ROW LEVEL SECURITY;

-- Create public read policies (anyone can read)
CREATE POLICY "Public can read jobs" ON jobs FOR SELECT USING (true);
CREATE POLICY "Public can read job_details" ON job_details FOR SELECT USING (true);
CREATE POLICY "Public can read documents_required" ON documents_required FOR SELECT USING (true);
CREATE POLICY "Public can read learning_resources" ON learning_resources FOR SELECT USING (true);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for jobs table (add updated_at if needed)
-- Note: created_at is already set, adding updated_at as optional
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();