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

// Type aliases for convenience. The generated row types are the source of truth; the
// aliases below narrow the CHECK-constrained columns that Postgres reports as `string`.
export type Job = Database['public']['Tables']['jobs']['Row'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];

export type JobDetail = Database['public']['Tables']['job_details']['Row'];
export type JobDetailInsert = Database['public']['Tables']['job_details']['Insert'];

export type DocumentPhase = 'Application' | 'Exam Center';
type GeneratedDocument = Database['public']['Tables']['documents_required']['Row'];
type GeneratedDocumentInsert = Database['public']['Tables']['documents_required']['Insert'];

export type DocumentRequired = Omit<GeneratedDocument, 'phase'> & { phase: DocumentPhase };
export type DocumentRequiredInsert = Omit<GeneratedDocumentInsert, 'phase'> & {
  phase: DocumentPhase;
};

export type LearningResourceType = 'PDF' | 'AI_Test' | 'Video' | 'Link';
export type ResourceTopic = 'gk' | 'math' | 'reasoning' | 'gujarati' | 'english' | 'current';
export type ResourceLanguage = 'en' | 'gu' | 'hi';

type GeneratedResource = Database['public']['Tables']['learning_resources']['Row'];
type GeneratedResourceInsert = Database['public']['Tables']['learning_resources']['Insert'];

export type LearningResource = Omit<
  GeneratedResource,
  'resource_type' | 'topic' | 'language'
> & {
  resource_type: LearningResourceType;
  topic: ResourceTopic | null;
  language: ResourceLanguage | null;
};

export type LearningResourceInsert = Omit<
  GeneratedResourceInsert,
  'resource_type' | 'topic' | 'language'
> & {
  resource_type: LearningResourceType;
  topic?: ResourceTopic | null;
  language?: ResourceLanguage | null;
};

export type LearningResourceWithJob = LearningResource & {
  jobs: { title: string } | null;
};

type ResourceQueryRow = LearningResource & {
  jobs: { title: string } | { title: string }[] | null;
};

/** PostgREST may type a to-one embed as an array; the row component needs one title. */
function normalizeResources(rows: unknown): LearningResourceWithJob[] {
  const list = (rows as ResourceQueryRow[] | null) ?? [];
  return list.map((row) => ({
    ...(row as unknown as LearningResource),
    jobs: Array.isArray(row.jobs) ? (row.jobs[0] ?? null) : row.jobs,
  }));
}

function normalizeResourceRows(rows: unknown): LearningResource[] {
  return ((rows as GeneratedResource[] | null) ?? []) as unknown as LearningResource[];
}

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

  return (data ?? []) as unknown as DocumentRequired[];
}

const RESOURCE_ORDER = [
  { column: 'sort_order', options: { ascending: true } },
  { column: 'created_at', options: { ascending: true } },
] as const;

/** Study material attached to one advertisement. Used by the job detail screen. */
export async function getJobLearningResources(jobId: string): Promise<LearningResource[]> {
  const { data, error } = await supabase
    .from('learning_resources')
    .select('*')
    .eq('job_id', jobId)
    .order(RESOURCE_ORDER[0].column, RESOURCE_ORDER[0].options)
    .order(RESOURCE_ORDER[1].column, RESOURCE_ORDER[1].options);

  if (error) {
    console.error('Error fetching job resources:', error);
    throw error;
  }

  return normalizeResourceRows(data);
}

/**
 * The study-material screen. With a job it shows that job's resources first, then the
 * general shelf; without one it shows the general shelf alone. Two plain queries are used
 * instead of an `or` filter so a route parameter can never become PostgREST filter syntax.
 */
export async function getLearningResources(jobId?: string): Promise<LearningResourceWithJob[]> {
  const generalQuery = supabase
    .from('learning_resources')
    .select('*, jobs(title)')
    .is('job_id', null)
    .order(RESOURCE_ORDER[0].column, RESOURCE_ORDER[0].options)
    .order(RESOURCE_ORDER[1].column, RESOURCE_ORDER[1].options);

  if (!jobId) {
    const { data, error } = await generalQuery;
    if (error) {
      console.error('Error fetching resources:', error);
      throw error;
    }
    return normalizeResources(data);
  }

  const specificQuery = supabase
    .from('learning_resources')
    .select('*, jobs(title)')
    .eq('job_id', jobId)
    .order(RESOURCE_ORDER[0].column, RESOURCE_ORDER[0].options)
    .order(RESOURCE_ORDER[1].column, RESOURCE_ORDER[1].options);

  const [specific, general] = await Promise.all([specificQuery, generalQuery]);
  if (specific.error) {
    console.error('Error fetching job resources:', specific.error);
    throw specific.error;
  }
  if (general.error) {
    console.error('Error fetching resources:', general.error);
    throw general.error;
  }

  return [...normalizeResources(specific.data), ...normalizeResources(general.data)];
}