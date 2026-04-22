import { createClient } from '@supabase/supabase-js';

// Environment variables are prefixed with EXPO_PUBLIC_ for Expo to include them in the native bundle
// These should be set in .env file and never exposed in frontend code
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Validate that Supabase credentials are configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials are not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Create Supabase client with parameterized queries to prevent SQL injection
// The client handles query parameterization automatically
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Auto-refresh token before expiration
    autoRefreshToken: true,
    // Persist session in local storage
    persistSession: true,
    // Detect and notify on token refresh
    detectSessionInUrl: true,
  },
  // Global query parameters
  global: {
    // Set headers for API requests if needed
    headers: {
      'x-client-info': 'rojgar-mitra-app',
    },
  },
});

// Type definitions for database tables
export interface Job {
  id: string;
  title: string;
  department: string;
  post_date: string;
  deadline: string;
  salary: string | null;
  source_link: string | null;
  created_at: string;
  updated_at?: string;
}

export interface JobDetail {
  id: string;
  job_id: string;
  age_limit: string;
  required_qualifications: string;
  application_fees: string | null;
  created_at: string;
}

export interface DocumentRequired {
  id: string;
  job_id: string;
  document_name: string;
  phase: 'Application' | 'Exam Center';
  created_at: string;
}

export interface LearningResource {
  id: string;
  job_id: string;
  resource_type: 'PDF' | 'AI_Test' | 'Video' | 'Link';
  link_or_content: string;
  created_at: string;
}

// Example query functions using Supabase client methods (parameterized by default)
export async function getJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching jobs:', error);
    throw error;
  }

  return data || [];
}

export async function getJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching job:', error);
    return null;
  }

  return data;
}

export async function getJobDetails(jobId: string): Promise<JobDetail[]> {
  const { data, error } = await supabase
    .from('job_details')
    .select('*')
    .eq('job_id', jobId);

  if (error) {
    console.error('Error fetching job details:', error);
    throw error;
  }

  return data || [];
}

export async function getDocumentsRequired(jobId: string): Promise<DocumentRequired[]> {
  const { data, error } = await supabase
    .from('documents_required')
    .select('*')
    .eq('job_id', jobId);

  if (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }

  return data || [];
}

export async function getLearningResources(jobId: string): Promise<LearningResource[]> {
  const { data, error } = await supabase
    .from('learning_resources')
    .select('*')
    .eq('job_id', jobId);

  if (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }

  return data || [];
}