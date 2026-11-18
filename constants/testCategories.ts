import type { TranslationKey } from '../lib/locales/en';

export type Topic = 'gk' | 'math' | 'reasoning' | 'gujarati' | 'english' | 'current';

export const TOPICS: Topic[] = ['gk', 'math', 'reasoning', 'gujarati', 'english', 'current'];

export function isTopic(value: unknown): value is Topic {
  return typeof value === 'string' && (TOPICS as string[]).includes(value);
}

/**
 * Six test topics, each with its own icon.
 *
 * Colour is deliberately not part of a topic's identity. Every card carries its
 * name and its own icon, so the topics stay distinguishable without hue and the
 * app keeps one accent family (DESIGN.md).
 */
export const TEST_CATEGORIES: { topic: Topic; labelKey: TranslationKey; icon: string }[] = [
  { topic: 'gk', labelKey: 'catGK', icon: 'book' },
  { topic: 'math', labelKey: 'catMath', icon: 'calculator' },
  { topic: 'reasoning', labelKey: 'catReasoning', icon: 'extension-puzzle' },
  { topic: 'gujarati', labelKey: 'catGujarati', icon: 'language' },
  { topic: 'english', labelKey: 'catEnglish', icon: 'chatbox-ellipses' },
  { topic: 'current', labelKey: 'catCurrent', icon: 'newspaper' },
];

/** PRD 5.6: 10 questions per test, optional 15-minute timer. */
export const QUESTIONS_PER_TEST = 10;
export const TIMER_SECONDS = 15 * 60;
