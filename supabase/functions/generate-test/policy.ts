export const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

export type Question = {
  question: string;
  options: Record<(typeof OPTION_KEYS)[number], string>;
  correct: (typeof OPTION_KEYS)[number];
  explanation: string;
};

// A question card has to fit on a 360px-wide phone without turning into a wall of text.
// Measured: a 300-character matching question with four 120-character pairing options takes
// the whole 844px screen and pushes the options off it. The prompt asks for shorter text than
// these ceilings; the ceilings are what the function actually enforces.
export const QUESTION_MAX_CHARS = 160;
export const OPTION_MAX_CHARS = 70;
export const EXPLANATION_MAX_CHARS = 120;

function oneLine(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Parses the model's JSON and keeps only usable questions.
 *
 * A question that cannot fit the screen is dropped rather than truncated: a cut-off question
 * or option is worse than one fewer question, and the caller tops up short batches.
 */
export function extractQuestions(raw: string): Question[] {
  const text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in model output');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const list: unknown[] = Array.isArray(parsed?.questions) ? parsed.questions : [];

  return list.flatMap((item) => {
    const q = item as Record<string, any>;
    const correct = String(q?.correct ?? '').trim().toUpperCase();
    const ok =
      typeof q?.question === 'string' &&
      q.question.trim() &&
      OPTION_KEYS.every((k) => typeof q?.options?.[k] === 'string' && q.options[k].trim()) &&
      (OPTION_KEYS as readonly string[]).includes(correct);
    if (!ok) return [];

    // Collapse newlines so a "question" cannot smuggle in a multi-line paragraph.
    const question = oneLine(q.question);
    const options = {
      A: oneLine(q.options.A),
      B: oneLine(q.options.B),
      C: oneLine(q.options.C),
      D: oneLine(q.options.D),
    };
    const explanation = typeof q.explanation === 'string' ? oneLine(q.explanation) : '';

    const overlong =
      question.length > QUESTION_MAX_CHARS
        ? `question (${question.length} chars)`
        : (() => {
            const key = OPTION_KEYS.find((k) => options[k].length > OPTION_MAX_CHARS);
            if (key) return `option ${key} (${options[key].length} chars)`;
            if (explanation.length > EXPLANATION_MAX_CHARS) {
              return `explanation (${explanation.length} chars)`;
            }
            return null;
          })();

    if (overlong) {
      console.log(`dropped overlong ${overlong}`);
      return [];
    }

    return [
      {
        question,
        options,
        correct: correct as Question['correct'],
        explanation,
      },
    ];
  });
}
