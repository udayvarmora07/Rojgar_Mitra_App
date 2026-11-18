import AsyncStorage from '@react-native-async-storage/async-storage';

const mockInvoke = jest.fn();
const mockRpc = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  fitsQuestionCard,
  generatePracticeTest,
  loadPoolTest,
  loadPracticeTest,
  MIN_POOL_QUESTIONS,
  parseQuestions,
  QUESTION_MAX_CHARS,
  scoreTest,
  validateQuestions,
  type TestGenerationResult,
} from '../utils/aiGenerator';
import { getBankQuestions } from '../constants/questionBank';
import { TOPICS } from '../constants/testCategories';
import { STORAGE_KEYS } from '../lib/storage';

const good = {
  question: 'What is 2 + 2?',
  options: { A: '3', B: '4', C: '5', D: '6' },
  correct: 'B' as const,
  explanation: '2 + 2 = 4',
};

beforeEach(async () => {
  mockInvoke.mockReset();
  mockRpc.mockReset();
  await AsyncStorage.clear();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('validateQuestions', () => {
  it('keeps valid questions and drops malformed ones', () => {
    const out = validateQuestions({
      questions: [
        good,
        { ...good, correct: 'E' },
        { ...good, options: { A: 'x', B: 'y', C: 'z' } },
        { ...good, question: '' },
        { ...good, correct: ' c ' },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[1].correct).toBe('C');
  });

  it('throws when nothing valid remains', () => {
    expect(() => validateQuestions({ questions: [] })).toThrow();
    expect(() => validateQuestions('nope')).toThrow();
  });
});

describe('question length policy', () => {
  it('rejects a question, option or explanation that cannot fit the card', () => {
    expect(fitsQuestionCard(good)).toBe(true);
    expect(
      fitsQuestionCard({ ...good, question: 'x'.repeat(QUESTION_MAX_CHARS + 1) })
    ).toBe(false);
    expect(
      fitsQuestionCard({ ...good, options: { ...good.options, C: 'y'.repeat(71) } })
    ).toBe(false);
    expect(fitsQuestionCard({ ...good, explanation: 'z'.repeat(121) })).toBe(false);
  });

  it('collapses newlines so a field cannot become a paragraph', () => {
    const [q] = validateQuestions({
      questions: [{ ...good, question: 'What is\n  2 + 2?' }],
    });
    expect(q.question).toBe('What is 2 + 2?');
  });
});

describe('parseQuestions', () => {
  it('strips <think> reasoning blocks and markdown fences', () => {
    const raw = `<think>let me plan {not json}</think>\n\`\`\`json\n${JSON.stringify({ questions: [good] })}\n\`\`\``;
    expect(parseQuestions(raw)).toHaveLength(1);
  });

  it('rejects output with no JSON', () => {
    expect(() => parseQuestions('sorry, I cannot')).toThrow();
  });
});

describe('generatePracticeTest', () => {
  it('calls the edge function (never a third-party API directly) and caches the result', async () => {
    mockInvoke.mockResolvedValue({ data: { questions: [good] }, error: null });
    const result = await generatePracticeTest('math', 'gu');

    expect(mockInvoke).toHaveBeenCalledWith('generate-test', { body: { topic: 'math', language: 'gu', count: 10 } });
    expect(result.source).toBe('ai');
    const cached = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.testCache('math', 'gu'))) ?? 'null');
    expect(cached.questions).toHaveLength(1);
  });

  it('throws on function errors', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('502') });
    await expect(generatePracticeTest('gk', 'en')).rejects.toThrow('502');
  });

  it('rejects a response where every question is too long for the card', async () => {
    mockInvoke.mockResolvedValue({
      data: { questions: [{ ...good, question: 'x'.repeat(QUESTION_MAX_CHARS + 1) }] },
      error: null,
    });
    await expect(generatePracticeTest('gk', 'en')).rejects.toThrow('fit the screen');
  });
});

describe('loadPracticeTest (offline-first)', () => {
  it('falls back to the last cached AI test', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.testCache('gk', 'hi'),
      JSON.stringify({ questions: [good], language: 'hi', topic: 'gk', generatedAt: 'x', source: 'ai' })
    );
    const result = await loadPracticeTest('gk', 'hi', () => Promise.reject(new Error('offline')), async () => null);
    expect(result.source).toBe('cache');
    expect(result.questions[0].question).toBe(good.question);
  });

  it('falls back to the built-in bank in the requested language', async () => {
    const result = await loadPracticeTest('gk', 'gu', () => Promise.reject(new Error('offline')), async () => null);
    expect(result.source).toBe('bank');
    expect(result.questions[0].question).toBe('ગુજરાતની રાજધાની કઈ છે?');
  });
});

describe('question bank', () => {
  it.each(TOPICS)('has valid questions for %s in every language', (topic) => {
    for (const lang of ['en', 'gu', 'hi'] as const) {
      const qs = getBankQuestions(topic, lang);
      expect(qs.length).toBeGreaterThanOrEqual(4);
      expect(validateQuestions(qs)).toHaveLength(qs.length);
    }
  });
});

describe('scoreTest', () => {
  it('counts only correct answers', () => {
    const qs = validateQuestions([good, { ...good, correct: 'A' }]);
    expect(scoreTest(qs, { 0: 'B', 1: 'C' })).toBe(1);
    expect(scoreTest(qs, {})).toBe(0);
  });
});

describe('loadPracticeTest (pool first)', () => {
  const poolTest: TestGenerationResult = {
    questions: [good],
    language: 'gu',
    topic: 'gk',
    generatedAt: 'x',
    source: 'pool',
  };

  it('uses the pre-generated pool without calling the LLM', async () => {
    const generate = jest.fn(() => Promise.reject(new Error('must not be called')));
    const result = await loadPracticeTest('gk', 'gu', generate, async () => poolTest);
    expect(result.source).toBe('pool');
    expect(generate).not.toHaveBeenCalled();
  });

  it('falls back to the AI path when the pool is empty', async () => {
    const generate = jest.fn(
      async (): Promise<TestGenerationResult> => ({
        questions: [good],
        language: 'gu',
        topic: 'gk',
        generatedAt: 'y',
        source: 'ai',
      })
    );
    const result = await loadPracticeTest('gk', 'gu', generate, async () => null);
    expect(generate).toHaveBeenCalled();
    expect(result.source).toBe('ai');
  });

  it('still ends at the built-in bank when both the pool and the AI path fail', async () => {
    const result = await loadPracticeTest(
      'gk',
      'gu',
      () => Promise.reject(new Error('offline')),
      async () => null
    );
    expect(result.source).toBe('bank');
  });
});

describe('loadPoolTest', () => {
  it('returns null when the function reports an error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    expect(await loadPoolTest('gk', 'gu')).toBeNull();
  });

  it('returns null when the pool is shorter than a full test', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ question: 'Q', options: { A: '1', B: '2', C: '3', D: '4' }, correct: 'A', explanation: '' }],
      error: null,
    });
    expect(await loadPoolTest('gk', 'gu')).toBeNull();
  });

  it('drops overlong pooled rows instead of showing them', async () => {
    const rows = Array.from({ length: MIN_POOL_QUESTIONS + 2 }, (_, i) => ({
      question: `Question ${i + 1}?`,
      options: { A: '1', B: '2', C: '3', D: '4' },
      correct: 'A',
      explanation: 'because',
    }));
    rows.push({
      question: 'x'.repeat(QUESTION_MAX_CHARS + 1),
      options: { A: '1', B: '2', C: '3', D: '4' },
      correct: 'A',
      explanation: 'too long',
    });
    mockRpc.mockResolvedValueOnce({ data: rows, error: null });

    const result = await loadPoolTest('gk', 'gu');
    expect(result?.questions).toHaveLength(MIN_POOL_QUESTIONS + 2);
    expect(result?.questions.every(fitsQuestionCard)).toBe(true);
  });

  it('returns null when too few pooled rows fit the card', async () => {
    const rows = Array.from({ length: MIN_POOL_QUESTIONS - 1 }, (_, i) => ({
      question: `Question ${i + 1}?`,
      options: { A: '1', B: '2', C: '3', D: '4' },
      correct: 'A',
      explanation: 'because',
    }));
    mockRpc.mockResolvedValueOnce({ data: rows, error: null });
    expect(await loadPoolTest('gk', 'gu')).toBeNull();
  });

  it('maps a full pool of rows into a usable test', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      question: `Question ${i + 1}?`,
      options: { A: '1', B: '2', C: '3', D: '4' },
      correct: 'A',
      explanation: 'because',
    }));
    mockRpc.mockResolvedValueOnce({ data: rows, error: null });
    const result = await loadPoolTest('gk', 'gu');
    expect(result?.source).toBe('pool');
    expect(result?.questions).toHaveLength(10);
  });

  it('returns null instead of throwing when the RPC rejects', async () => {
    mockRpc.mockRejectedValueOnce(new Error('network'));
    expect(await loadPoolTest('gk', 'gu')).toBeNull();
  });
});
