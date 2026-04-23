// MiniMax AI Practice Test Generator
// Generates AI-powered multiple choice questions using MiniMax M2.7 API

const MINIMAX_API_URL = 'https://api.minimax.chat/v1';

export interface Question {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correct: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface TestGenerationResult {
  questions: Question[];
  language: string;
  topic: string;
  generatedAt: string;
}

const TOPICS = {
  en: {
    gk: 'Indian Constitution, History, Geography and General Science',
    math: 'Basic Arithmetic, Algebra and Geometry',
    gujarati: 'Gujarati Grammar, Vocabulary and Comprehension',
    english: 'Basic English Vocabulary and Grammar',
    current: 'Current Affairs of India and Gujarat',
  },
  gu: {
    gk: 'ભારતીય બંધારણ, ઈતિહાસ, ભૂગોળ અને સામાન્ય વિજ્ઞાન',
    math: 'મૂળભૂત અંકગણિત, બીજગણિત અને ભૂમિતિ',
    gujarati: 'ગુજરાતી વ્યાકરણ, શબ્દભંડોળ અને સમજ',
    english: 'મૂળભૂત અંગ્રેજી શબ્દભંડોળ અને વ્યાકરણ',
    current: 'ભારત અને ગુજરાતની વર્તમાન બાબતો',
  },
  hi: {
    gk: 'भारतीय संविधान, इतिहास, भूगोल और सामान्य विज्ञान',
    math: 'मूल अंकगणित, बीजगणित और ज्यामिति',
    gujarati: 'गुजराती व्याकरण, शब्दभंडार और समझ',
    english: 'बुनियादी अंग्रेजी शब्दभंडार और व्याकरण',
    current: 'भारत और गुजरात की करंट अफेयर्स',
  },
};

const LANGUAGE_PROMPTS = {
  en: 'Generate questions in simple English',
  gu: 'Generate questions in simple Gujarati using Gujarati script (ગુજરાતી લિપિ)',
  hi: 'Generate questions in simple Hindi using Hindi script (देवनागरी लिपि)',
};

export async function generatePracticeTest(
  topic: 'gk' | 'math' | 'gujarati' | 'english' | 'current',
  language: 'en' | 'gu' | 'hi' = 'en'
): Promise<TestGenerationResult> {
  const apiKey = process.env.EXPO_PUBLIC_MINIMAX_API_KEY;

  if (!apiKey) {
    throw new Error('MiniMax API key not configured. Set EXPO_PUBLIC_MINIMAX_API_KEY in .env');
  }

  const topicText = TOPICS[language][topic];
  const langPrompt = LANGUAGE_PROMPTS[language];

  const prompt = `Generate 5 multiple choice questions for competitive exams on the topic: ${topicText}.

${langPrompt}

Each question must have 4 options (A, B, C, D). Output ONLY valid JSON in this exact format - no additional text:
{
  "questions": [
    {
      "question": "question text here",
      "options": {
        "A": "option A text",
        "B": "option B text",
        "C": "option C text",
        "D": "option D text"
      },
      "correct": "A",
      "explanation": "brief explanation of why answer is correct"
    }
  ]
}`;

  const response = await fetch(`${MINIMAX_API_URL}/text/chatcompletion_v2`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'MiniMax-Text-01',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`MiniMax API error (${response.status}): ${errorData}`);
  }

  const data = await response.json();

  // Parse the AI response
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response from MiniMax API');
  }

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3);
  }

  const parsed = JSON.parse(jsonStr);

  return {
    questions: parsed.questions,
    language,
    topic,
    generatedAt: new Date().toISOString(),
  };
}

// Fallback question bank for offline use or API failures
export const FALLBACK_QUESTIONS: Record<string, Question[]> = {
  gk: [
    {
      question: 'What is the capital of Gujarat?',
      options: { A: 'Ahmedabad', B: ' Gandhinagar', C: 'Surat', D: 'Vadodara' },
      correct: 'B',
      explanation: 'Gandhinagar is the capital of Gujarat state in India.',
    },
    {
      question: 'How many states are there in India?',
      options: { A: '24', B: '28', C: '30', D: '26' },
      correct: 'B',
      explanation: 'India has 28 states and 8 union territories.',
    },
  ],
  math: [
    {
      question: 'What is 15 + 27?',
      options: { A: '41', B: '42', C: '43', D: '44' },
      correct: 'B',
      explanation: '15 + 27 = 42',
    },
    {
      question: 'What is 8 × 7?',
      options: { A: '54', B: '56', C: '58', D: '60' },
      correct: 'B',
      explanation: '8 multiplied by 7 equals 56',
    },
  ],
};

export function getFallbackTest(
  topic: 'gk' | 'math' | 'gujarati' | 'english' | 'current'
): TestGenerationResult {
  const questions = FALLBACK_QUESTIONS[topic] || FALLBACK_QUESTIONS.gk;
  return {
    questions,
    language: 'en',
    topic,
    generatedAt: new Date().toISOString(),
  };
}