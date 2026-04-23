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
        Insert: Omit<Database['public']['Tables']['jobs']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['jobs']['Insert']>;
      };
      resources: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          category: string | null;
          url: string | null;
          language: 'en' | 'gu' | 'hi' | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['resources']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['resources']['Insert']>;
      };
      practice_tests: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          questions: Database['public']['CompositeTypes']['question_type'][] | null;
          language: 'en' | 'gu' | 'hi' | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['practice_tests']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_tests']['Insert']>;
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          test_id: string | null;
          score: number | null;
          answers: Database['public']['CompositeTypes']['user_answer'][] | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_progress']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_progress']['Insert']>;
      };
      ai_generated_content: {
        Row: {
          id: string;
          content_type: string;
          prompt: string | null;
          generated_content: string | null;
          language: 'en' | 'gu' | 'hi' | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ai_generated_content']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ai_generated_content']['Insert']>;
      };
    };
    CompositeTypes: {
      question_type: {
        question: string;
        options: string[];
        correct_answer: number;
        explanation: string | null;
      };
      user_answer: {
        question_index: number;
        selected_option: number;
        is_correct: boolean;
      };
    };
  };
}

export type Job = {
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

export type Resource = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  url: string | null;
  language: 'en' | 'gu' | 'hi' | null;
  created_at: string;
};

export type PracticeTest = {
  id: string;
  title: string;
  description: string | null;
  questions: Question[] | null;
  language: 'en' | 'gu' | 'hi' | null;
  created_at: string;
};

export type Question = {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
};

export type UserProgress = {
  id: string;
  user_id: string;
  test_id: string | null;
  score: number | null;
  answers: UserAnswer[] | null;
  completed_at: string | null;
  created_at: string;
};

export type UserAnswer = {
  question_index: number;
  selected_option: number;
  is_correct: boolean;
};