import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          title: string;
          organization: string;
          location: string | null;
          salary_min: number | null;
          salary_max: number | null;
          job_type: string | null;
          description: string | null;
          requirements: string[] | null;
          deadline: string | null;
          apply_link: string | null;
          source: string | null;
          source_url: string | null;
          language: 'en' | 'gu' | 'hi' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          organization: string;
          location?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          job_type?: string | null;
          description?: string | null;
          requirements?: string[] | null;
          deadline?: string | null;
          apply_link?: string | null;
          source?: string | null;
          source_url?: string | null;
          language?: 'en' | 'gu' | 'hi' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          organization?: string;
          location?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          job_type?: string | null;
          description?: string | null;
          requirements?: string[] | null;
          deadline?: string | null;
          apply_link?: string | null;
          source?: string | null;
          source_url?: string | null;
          language?: 'en' | 'gu' | 'hi' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
