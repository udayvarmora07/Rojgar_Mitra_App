import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

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
// The app is read-only and has no user accounts, so auth sessions are disabled.
// (persistSession/detectSessionInUrl assume a browser and misbehave on native.)
export const supabase = createClient<Database>(supabaseUrl || 'http://localhost:54321', supabaseAnonKey || 'missing-anon-key', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  // Global query parameters
  global: {
    // Set headers for API requests if needed
    headers: {
      'x-client-info': 'rojgar-mitra-app',
    },
  },
});

// Type aliases for convenience
export type Job = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export type JobDetail = Database['public']['Tables']['job_details']['Row'];
export type JobDetailInsert = Database['public']['Tables']['job_details']['Insert'];

export type DocumentRequired = Database['public']['Tables']['documents_required']['Row'];
export type DocumentRequiredInsert = Database['public']['Tables']['documents_required']['Insert'];

export type LearningResource = Database['public']['Tables']['learning_resources']['Row'];
export type LearningResourceInsert = Database['public']['Tables']['learning_resources']['Insert'];

// Query functions using Supabase client methods (parameterized by default)
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