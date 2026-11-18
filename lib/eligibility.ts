/** The four YES/NO questions from PRD 5.4. */
export const ELIGIBILITY_QUESTIONS = ['qualification', 'age', 'category', 'documents'] as const;

export type EligibilityQuestion = (typeof ELIGIBILITY_QUESTIONS)[number];
export type EligibilityAnswers = Partial<Record<EligibilityQuestion, boolean>>;

export type EligibilityResult = {
  /** `incomplete` until every question has an answer and none is "No". */
  status: 'incomplete' | 'eligible' | 'notEligible';
  /** Questions answered "No" - each maps to a "next step" message. */
  failed: EligibilityQuestion[];
  answered: number;
  total: number;
};

export function evaluateEligibility(answers: EligibilityAnswers): EligibilityResult {
  const failed = ELIGIBILITY_QUESTIONS.filter((q) => answers[q] === false);
  const answered = ELIGIBILITY_QUESTIONS.filter((q) => typeof answers[q] === 'boolean').length;
  const total = ELIGIBILITY_QUESTIONS.length;

  let status: EligibilityResult['status'] = 'incomplete';
  // A single "No" is enough to know the user may not be eligible - no need to wait.
  if (failed.length > 0) status = 'notEligible';
  else if (answered === total) status = 'eligible';

  return { status, failed, answered, total };
}
