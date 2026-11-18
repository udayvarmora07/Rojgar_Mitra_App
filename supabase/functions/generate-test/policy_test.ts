import {
  EXPLANATION_MAX_CHARS,
  extractQuestions,
  OPTION_MAX_CHARS,
  QUESTION_MAX_CHARS,
} from './policy.ts';

function assertEquals<T>(actual: T, expected: T) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`expected ${e}, got ${a}`);
}

const good = {
  question: 'What is 2 + 2?',
  options: { A: '3', B: '4', C: '5', D: '6' },
  correct: 'B',
  explanation: '2 + 2 = 4',
};

function payload(question: unknown) {
  return JSON.stringify({ questions: [question] });
}

Deno.test('keeps a short, well-formed question', () => {
  const [q] = extractQuestions(payload(good));
  assertEquals(q.question, good.question);
  assertEquals(q.correct, 'B');
});

Deno.test('collapses newlines into one line', () => {
  const [q] = extractQuestions(
    payload({ ...good, question: 'Which of these\n  is the capital\nof Gujarat?' })
  );
  assertEquals(q.question, 'Which of these is the capital of Gujarat?');
});

Deno.test('drops a question longer than the phone-screen ceiling', () => {
  const long = { ...good, question: 'x'.repeat(QUESTION_MAX_CHARS + 1) };
  assertEquals(extractQuestions(payload(long)), []);
});

Deno.test('drops an option longer than the ceiling', () => {
  const long = { ...good, options: { ...good.options, C: 'y'.repeat(OPTION_MAX_CHARS + 1) } };
  assertEquals(extractQuestions(payload(long)), []);
});

Deno.test('drops an explanation longer than the ceiling', () => {
  const long = { ...good, explanation: 'z'.repeat(EXPLANATION_MAX_CHARS + 1) };
  assertEquals(extractQuestions(payload(long)), []);
});

Deno.test('drops malformed questions, and throws when there is no JSON', () => {
  assertEquals(extractQuestions(payload({ ...good, correct: 'E' })), []);
  let threw = false;
  try {
    extractQuestions('sorry, no test today');
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('expected a parse error');
});
