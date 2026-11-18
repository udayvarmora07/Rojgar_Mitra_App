export type Topic = 'gk' | 'math' | 'reasoning' | 'gujarati' | 'english' | 'current';

export const TOPICS: Topic[] = ['gk', 'math', 'reasoning', 'gujarati', 'english', 'current'];

export function isTopic(value: unknown): value is Topic {
  return typeof value === 'string' && (TOPICS as string[]).includes(value);
}

/**
 * Six test topics, each with a distinct icon.
 *
 * Colour is no longer a differentiator: the previous palette used six unrelated hues
 * (green, blue, teal, indigo, amber, red), which read as decoration and made colour the only
 * cue - a failure for colour-blind users and for anyone reading in sunlight. Every card now
 * carries its name and its own icon, so the topics stay distinguishable without hue. The
 * tint is drawn from the brand family instead (PRODUCT.md 4).
 */
export const TEST_CATEGORIES: { topic: Topic; labelKey: string; icon: string; color: string }[] = [
  { topic: 'gk', labelKey: 'catGK', icon: 'book', color: '#1E3A8A' },
  { topic: 'math', labelKey: 'catMath', icon: 'calculator', color: '#1E3A8A' },
  { topic: 'reasoning', labelKey: 'catReasoning', icon: 'extension-puzzle', color: '#1E3A8A' },
  { topic: 'gujarati', labelKey: 'catGujarati', icon: 'language', color: '#1E3A8A' },
  { topic: 'english', labelKey: 'catEnglish', icon: 'chatbox-ellipses', color: '#1E3A8A' },
  { topic: 'current', labelKey: 'catCurrent', icon: 'newspaper', color: '#1E3A8A' },
];

/** PRD 5.6: 10 questions per test, optional 15-minute timer. */
export const QUESTIONS_PER_TEST = 10;
export const TIMER_SECONDS = 15 * 60;
