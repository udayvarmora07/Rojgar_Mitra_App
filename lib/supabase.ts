import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      getItem: (key: string) => {
        return Promise.resolve(null);
      },
      setItem: (key: string, value: string) => {
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        return Promise.resolve();
      },
    },
  },
});

export type Database = {
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
};