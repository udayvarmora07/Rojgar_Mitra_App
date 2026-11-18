// AI practice-test client.
//
// The LLM API key (Command Code / DeepSeek) lives ONLY in the `generate-test` Supabase Edge Function
// (PRD 6.3 / 12). The app calls that function with the public anon key, so no
// secret is ever bundled into the APK or web build.

import { supabase } from '../lib/supabase';
import { readJSON, writeJSON, STORAGE_KEYS } from '../lib/storage';
import { getBankQuestions, OptionKey, Question } from '../constants/questionBank';
import { QUESTIONS_PER_TEST, Topic } from '../constants/testCategories';
import type { Language } from '../constants/languages';

export type { Question, OptionKey } from '../constants/questionBank';

export type TestSource = 'ai' | 'pool' | 'cache' | 'bank';

export interface TestGenerationResult {
  questions: Question[];
  language: Language;
  topic: Topic;
  generatedAt: string;
  source: TestSource;
}

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];
// The Edge Function fans out to parallel batches and finishes in ~20-40 s.
const REQUEST_TIMEOUT_MS = 60_000;
// A pool read is a single indexed query; it must never feel slow.
const POOL_TIMEOUT_MS = 4_000;

// Display ceilings, kept in step with supabase/functions/generate-test/policy.ts and
// generator/generate_questions.py. The pool can still hold rows generated before the policy,
// so they are filtered here instead of filling the screen. A pool test may therefore be a few
// questions shorter than the full ten.
export const QUESTION_MAX_CHARS = 160;
export const OPTION_MAX_CHARS = 70;
export const EXPLANATION_MAX_CHARS = 120;
/** Below this, the pool is too thin and the AI path should supply a complete test. */
export const MIN_POOL_QUESTIONS = 6;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Collapses newlines and runs of spaces so a "one-line" field cannot become a paragraph. */
function oneLine(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** True when a question and its options fit one phone screen without scrolling the card. */
export function fitsQuestionCard(q: Question): boolean {
  return (
    q.question.length <= QUESTION_MAX_CHARS &&
    OPTION_KEYS.every((k) => q.options[k].length <= OPTION_MAX_CHARS) &&
    q.explanation.length <= EXPLANATION_MAX_CHARS
  );
}

/** Keeps only well-formed questions; throws if none survive. */
export function validateQuestions(input: unknown): Question[] {
  const list = (input as { questions?: unknown })?.questions ?? input;
  if (!Array.isArray(list)) throw new Error('Response has no questions array');

  const valid: Question[] = [];
  for (const raw of list) {
    const q = raw as Partial<Question> & { options?: Record<string, unknown> };
    if (!q || !isNonEmptyString(q.question) || !q.options) continue;
    if (!OPTION_KEYS.every((k) => isNonEmptyString(q.options?.[k]))) continue;
    const correct = typeof q.correct === 'string' ? q.correct.trim().toUpperCase() : '';
    if (!OPTION_KEYS.includes(correct as OptionKey)) continue;

    valid.push({
      question: oneLine(q.question),
      options: {
        A: oneLine(String(q.options.A)),
        B: oneLine(String(q.options.B)),
        C: oneLine(String(q.options.C)),
        D: oneLine(String(q.options.D)),
      },
      correct: correct as OptionKey,
      explanation: isNonEmptyString(q.explanation) ? oneLine(q.explanation) : '',
    });
  }

  if (valid.length === 0) throw new Error('No valid questions in response');
  return valid;
}

/**
 * Extracts the JSON object from raw model text: strips reasoning `<think>` blocks
 * and markdown fences, then parses the outermost `{...}`.
 */
export function parseQuestions(raw: string): Question[] {
  const text = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:json)?/gi, '')
    .trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in model output');
  return validateQuestions(JSON.parse(text.slice(start, end + 1)));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** Calls the Edge Function. Throws on any network, server or validation failure. */
export async function generatePracticeTest(
  topic: Topic,
  language: Language = 'en'
): Promise<TestGenerationResult> {
  const { data, error } = await withTimeout(
    supabase.functions.invoke('generate-test', {
      body: { topic, language, count: QUESTIONS_PER_TEST },
    }),
    REQUEST_TIMEOUT_MS
  );
  if (error) throw error;

  // The deployed function enforces the same ceiling; filtering here also protects against an
  // older deployment and keeps the cache free of screen-filling questions.
  const questions = validateQuestions(data).filter(fitsQuestionCard);
  if (questions.length === 0) throw new Error('AI returned no questions that fit the screen');

  const result: TestGenerationResult = {
    questions,
    language,
    topic,
    generatedAt: new Date().toISOString(),
    source: 'ai',
  };
  await writeJSON(STORAGE_KEYS.testCache(topic, language), result);
  return result;
}

export function getFallbackTest(topic: Topic, language: Language = 'en'): TestGenerationResult {
  return {
    questions: getBankQuestions(topic, language),
    language,
    topic,
    generatedAt: new Date().toISOString(),
    source: 'bank',
  };
}

/**
 * Reads pre-generated questions from `public.practice_questions` (migration 003) through the
 * `get_practice_questions` RPC. A daily generator fills that pool, so this path answers in
 * well under a second and costs no LLM credit. Returns null when the pool is unreachable or
 * too thin to make a full test, so the caller can fall through to the AI path.
 */
export async function loadPoolTest(
  topic: Topic,
  language: Language
): Promise<TestGenerationResult | null> {
  try {
    // PostgREST builders are thenable but not Promise instances, so wrap the call itself.
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase.rpc('get_practice_questions', {
          p_topic: topic,
          p_language: language,
          // Ask for the widest sample the RPC allows so filtering still leaves a full test.
          p_count: QUESTIONS_PER_TEST * 2,
        })
      ),
      POOL_TIMEOUT_MS
    );
    if (error || !Array.isArray(data)) return null;

    const rows = data as {
      question: string;
      options: Record<string, string>;
      correct: string;
      explanation: string | null;
    }[];
    if (rows.length < MIN_POOL_QUESTIONS) return null;

    const questions = validateQuestions(
      rows.map((r) => ({
        question: r.question,
        options: r.options,
        correct: r.correct,
        explanation: r.explanation ?? '',
      }))
    )
      .filter(fitsQuestionCard)
      .slice(0, QUESTIONS_PER_TEST);

    // A very thin pool would give a 3-question "test"; let the AI path fill a real one.
    if (questions.length < MIN_POOL_QUESTIONS) return null;

    return {
      questions,
      language,
      topic,
      generatedAt: new Date().toISOString(),
      source: 'pool',
    };
  } catch {
    return null;
  }
}

/**
 * Offline-first loader (PRD 6.4), fastest source first:
 *   1. practice_questions pool  -> instant, no LLM cost
 *   2. fresh AI test            -> Edge Function, ~20-40 s
 *   3. last cached AI test
 *   4. built-in offline bank
 * Never throws.
 */
export async function loadPracticeTest(
  topic: Topic,
  language: Language,
  generate: typeof generatePracticeTest = generatePracticeTest,
  readPool: typeof loadPoolTest = loadPoolTest
): Promise<TestGenerationResult> {
  const pooled = await readPool(topic, language);
  if (pooled) return pooled;

  try {
    return await generate(topic, language);
  } catch (err) {
    console.warn('AI test generation failed, using offline questions:', err);
  }

  const cached = await readJSON<TestGenerationResult | null>(
    STORAGE_KEYS.testCache(topic, language),
    null
  );
  if (cached) {
    try {
      const questions = validateQuestions(cached.questions).filter(fitsQuestionCard);
      if (questions.length > 0) return { ...cached, questions, source: 'cache' };
    } catch {
      // Corrupt cache - fall through to the bank.
    }
  }
  return getFallbackTest(topic, language);
}

export function scoreTest(questions: Question[], answers: Record<number, OptionKey>): number {
  return questions.reduce((sum, q, i) => (answers[i] === q.correct ? sum + 1 : sum), 0);
}
