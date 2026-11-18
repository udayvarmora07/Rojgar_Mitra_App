// Supabase Edge Function: generate-test
//
// Generates practice-test MCQs with an OpenAI-compatible LLM and returns validated JSON.
// The API key is read from the function's secrets and never reaches the app.
//
// Default provider: Command Code Provider API (DeepSeek V4.1 Flash).
//   https://commandcode.ai/blog/command-code-provider-api
//
// Deploy:
//   npx supabase secrets set LLM_API_KEY=<your Command Code key>       (required)
//   npx supabase secrets set LLM_MODEL=deepseek/deepseek-v4.1-flash      (optional)
//   npx supabase secrets set LLM_BASE_URL=https://api.commandcode.ai/provider/v1  (optional)
//   npx supabase functions deploy generate-test
//
// Any OpenAI-compatible provider works by changing LLM_BASE_URL / LLM_MODEL.

import { extractQuestions, OPTION_KEYS, type Question } from './policy.ts';

const LLM_BASE_URL = (Deno.env.get('LLM_BASE_URL') ?? 'https://api.commandcode.ai/provider/v1').replace(/\/+$/, '');
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? 'deepseek/deepseek-v4.1-flash';

// Syllabus per topic, from the published GSSSB Class-3 CCE, GPSSB (Talati) and GPSC Prelims
// syllabi. Each test samples a few sub-topics so consecutive tests differ.
const SYLLABUS: Record<string, { area: string; subtopics: string[] }> = {
  gk: {
    area: 'General Knowledge for Gujarat government exams',
    subtopics: [
      'Indian Constitution: Preamble, Fundamental Rights and Duties, Directive Principles',
      'Panchayati Raj: 73rd Amendment, Gram Panchayat, Gram Sabha, Taluka and District Panchayat',
      'Indian freedom movement and Gandhiji (Dandi March, Champaran, Quit India)',
      'History of Gujarat: Solanki and Maitraka dynasties, Sultanate, formation of Gujarat in 1960',
      'Culture of Gujarat: fairs (Tarnetar, Vautha, Bhavnath), folk dances, festivals, handicrafts',
      'Geography of Gujarat: districts, rivers, dams, ports, national parks and sanctuaries',
      'Geography of India: rivers, mountains, states and capitals, soils, crops',
      'General Science: human body, nutrition and diseases, basic physics and chemistry in daily life',
      'Indian economy basics: banks, RBI, budget, GST, agriculture schemes',
      'Computer basics: hardware, software, MS Office, internet, shortcut keys',
    ],
  },
  math: {
    area: 'Quantitative Aptitude',
    subtopics: [
      'number system and simplification (BODMAS)', 'LCM and HCF', 'percentage', 'profit and loss',
      'simple and compound interest', 'ratio and proportion', 'average', 'time and work',
      'time, speed and distance', 'mensuration (area, perimeter, volume)', 'problems on ages',
      'data interpretation from a small table',
    ],
  },
  reasoning: {
    area: 'Reasoning Ability (verbal and non-verbal, written as text)',
    subtopics: [
      'number series', 'letter series', 'coding-decoding', 'blood relations', 'direction sense',
      'seating arrangement in a row', 'ranking and order', 'analogy', 'odd one out', 'syllogism',
      'calendar', 'clock',
    ],
  },
  gujarati: {
    area: 'Gujarati Grammar and Literature (ગુજરાતી વ્યાકરણ અને સાહિત્ય)',
    subtopics: [
      'સંધિ (છોડો/જોડો)', 'સમાસ ઓળખો', 'અલંકાર ઓળખો', 'છંદ ઓળખો', 'કહેવતોનો અર્થ',
      'રૂઢિપ્રયોગનો અર્થ', 'સાચી જોડણી', 'સમાનાર્થી શબ્દ', 'વિરુદ્ધાર્થી શબ્દ',
      'શબ્દસમૂહ માટે એક શબ્દ', 'કર્તરિ-કર્મણિ વાક્ય', 'કૃદંત', 'નિપાત', 'વિભક્તિ',
      'ગુજરાતી સાહિત્યકારોનાં ઉપનામ અને કૃતિઓ',
    ],
  },
  english: {
    area: 'General English',
    subtopics: [
      'tenses', 'articles', 'prepositions', 'active and passive voice', 'direct and indirect speech',
      'synonyms', 'antonyms', 'one-word substitution', 'idioms and phrases', 'spotting the error',
      'fill in the blank', 'correct spelling',
    ],
  },
  current: {
    area: 'Gujarat and India general awareness (schemes, institutions, important days, sports, awards)',
    subtopics: [
      'major Government of Gujarat welfare schemes', 'major Government of India schemes',
      'important national and international days', 'constitutional and statutory bodies',
      'sports: trophies, terms and venues', 'national awards and honours',
      'science and space missions of India', 'Gujarat tourism and heritage sites',
    ],
  },
};

const QUESTION_STYLES = [
  'direct one-line question',
  'statement-based: "Which of the following statements is correct / NOT correct?"',
  'match the pairs, with at most two pairs in each option',
  'odd one out',
  'fill in the blank',
];

function sample<T>(items: T[], n: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const LANGUAGES: Record<string, string> = {
  en: 'simple English',
  gu: 'simple, everyday Gujarati written in Gujarati script (ગુજરાતી લિપિ)',
  hi: 'simple, everyday Hindi written in Devanagari script (देवनागरी)',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};


// A single call asking for 10 questions of Gujarati/Hindi makes the model reason for
// 6-8k tokens and blows past any sane request timeout (measured: >55 s, always a timeout).
// Measured 2026-11-17 with deepseek-v4.1-flash: small parallel batches return a full test
// in 15-40 s depending on provider load. Batching is what makes the AI path usable at all.
// Two-question batches are the sweet spot: they stay under the timeout even when the
// provider is busy, and 5 in-flight calls give the requested 10 questions.
const BATCH_SIZE = 2;
// Measured: a field of 5 concurrent batches takes ~37 s when the provider is healthy, so a
// 40 s ceiling lost a straggler that was seconds from finishing. 45 s keeps the test full
// while the total stays inside the app's 60 s wait.
const BATCH_TIMEOUT_MS = 45_000;
// The app waits 60 s; leave headroom for the response to travel back.
const TOTAL_BUDGET_MS = 52_000;
// Replacement batches are only worth launching if they have time to finish. Measured: a
// batch of 2 returns in ~20 s when the provider is idle, so a later launch would only burn
// tokens for an answer that arrives after the deadline.
const MIN_TOPUP_BUDGET_MS = 15_000;
// Allow the initial field plus two replacements, so a straggler cannot shrink the test.
const MAX_EXTRA_BATCHES = 2;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function buildPrompt(topic: string, language: string, count: number, focus?: string[]) {
  const { area, subtopics } = SYLLABUS[topic];
  const chosen = focus ?? sample(subtopics, Math.min(4, subtopics.length));
  return `You are an expert paper-setter for Gujarat government recruitment exams (GSSSB Class-3, GPSSB Talati-cum-Mantri, GPSC Class 1-2 Prelims, Gujarat Police LRD).
The candidates are farmers and rural youth with basic schooling.

Write exactly ${count} ORIGINAL multiple choice questions on ${area}.
Spread them across these syllabus sub-topics: ${chosen.join('; ')}.
Model the format, phrasing and difficulty on previous-year papers of those exams, but do NOT copy any real question word-for-word.
Mix question styles: ${QUESTION_STYLES.join('; ')}.
Difficulty: about 40% easy, 40% medium, 20% hard.
Write every question, option and explanation in ${LANGUAGES[language]}. Use short sentences and common words.
Each question has exactly 4 options (A, B, C, D) and exactly one correct answer.
Options are shuffled after you answer, so NEVER write options that refer to other options ("Both A and B", "All of the above", "None of these"); every option must stand alone.
Only use facts you are certain are correct and not time-sensitive; avoid events from the last two years.
The explanation is one short sentence that teaches why the answer is right; it must not mention option letters.

LENGTH RULES - the app shows the whole item on one phone screen, so keep every field short:
- The question is ONE sentence of at most 120 characters. Never write a paragraph, numbered parts, or a long list of pairs.
- Each option is at most 50 characters. In a match-the-pairs question an option may list at most two pairs.
- The explanation is at most 90 characters.
If a fact cannot fit inside these limits, ask a simpler question instead.

Output ONLY valid, parseable JSON - no markdown, no commentary - in exactly this shape:
{"questions":[{"question":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A","explanation":"..."}]}`;
}

const CROSS_REFERENCE =
  /all of the above|none of the(se| above)|both\s+[A-D]\b|\b[A-D]\s*(and|&|અને|और)\s*[A-D]\b|ઉપરના|ઉપરોક્ત|આમાંથી એક પણ નહીં|उपरोक्त|इनमें से कोई नहीं/i;

/** LLMs over-use A/B for the answer; re-shuffle so the correct letter is uniform. */
function shuffleOptions(q: Question): Question {
  // Options that point at other options would become wrong after shuffling - keep as written.
  if (OPTION_KEYS.some((k) => CROSS_REFERENCE.test(q.options[k]))) return q;
  const entries = sample(OPTION_KEYS.map((k) => ({ text: q.options[k], correct: k === q.correct })), 4);
  const options = {} as Question['options'];
  let correct: Question['correct'] = 'A';
  entries.forEach((entry, i) => {
    const key = OPTION_KEYS[i];
    options[key] = entry.text;
    if (entry.correct) correct = key;
  });
  return { ...q, options, correct };
}

/** One LLM round-trip. Returns only well-formed questions; never throws. */
async function fetchBatch(
  apiKey: string,
  topic: string,
  language: string,
  count: number,
  deadline: number
): Promise<Question[]> {
  const budget = Math.min(BATCH_TIMEOUT_MS, deadline - Date.now());
  if (budget <= 1_000) return [];

  const { subtopics } = SYLLABUS[topic];
  const focus = sample(subtopics, Math.min(2, subtopics.length));

  try {
    const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // The provider's firewall returns 403 to clients without an explicit User-Agent.
        'User-Agent': 'RojgarMitra-EdgeFunction/2.0',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: buildPrompt(topic, language, count, focus) }],
        temperature: 0.7,
        // Reasoning alone costs 1-1.5k tokens for a 2-3 question batch.
        max_tokens: 6000,
      }),
      signal: AbortSignal.timeout(budget),
    });

    if (!response.ok) {
      console.error('LLM provider error', response.status, (await response.text()).slice(0, 300));
      return [];
    }

    const data = await response.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    if (!content) return [];
    return extractQuestions(content);
  } catch (err) {
    console.error('batch failed', String(err).slice(0, 200));
    return [];
  }
}


// --- Caller authorization -------------------------------------------------
// Deployed with verify_jwt = false: the platform check only understands legacy JWT keys,
// and the app sends a non-JWT `sb_publishable_...` key on the `apikey` header.
// https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
function allowedApiKeys(): Set<string> {
  const keys = new Set<string>();
  try {
    const publishable = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    for (const value of Object.values(publishable)) if (typeof value === 'string') keys.add(value);
  } catch {
    // ignore malformed env
  }
  const legacyAnon = Deno.env.get('SUPABASE_ANON_KEY');
  if (legacyAnon) keys.add(legacyAnon);
  return keys;
}
const ALLOWED_KEYS = allowedApiKeys();

// --- Rate limit ---------------------------------------------------------------
// The publishable key ships in the app, so anyone can extract it. This per-IP limit
// (in-memory, per function instance) keeps casual abuse from draining LLM credit.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // bound memory
  return recent.length > RATE_LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const callerKey = req.headers.get('apikey') ?? '';
  if (!ALLOWED_KEYS.has(callerKey)) return json({ error: 'Unauthorized' }, 401);

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) return json({ error: 'Too many requests, try again later' }, 429);

  // Validate the request before the server-configuration gate: a malformed or unknown
  // topic is the caller's error (400) whether or not this deployment has an LLM key.
  let body: { topic?: unknown; language?: unknown; count?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const topic = String(body.topic ?? '');
  const language = String(body.language ?? 'en');
  const count = Math.min(Math.max(Number(body.count) || 10, 1), 10);
  if (!(topic in SYLLABUS)) return json({ error: 'Unknown topic' }, 400);
  if (!(language in LANGUAGES)) return json({ error: 'Unknown language' }, 400);

  const apiKey = Deno.env.get('LLM_API_KEY');
  if (!apiKey) return json({ error: 'Server is not configured' }, 500);

  try {
    const startedAt = Date.now();
    const deadline = startedAt + TOTAL_BUDGET_MS;

    // Merge, de-duplicate by question text.
    const seen = new Set<string>();
    const questions: Question[] = [];
    const merge = (batch: Question[]) => {
      for (const q of batch) {
        const key = q.question.toLowerCase();
        if (seen.has(key) || questions.length === count) continue;
        seen.add(key);
        questions.push(q);
      }
    };

    // Fan out small batches in parallel and top up the moment any batch settles short or
    // late, instead of waiting for the slowest one. Measured: a single batch of 2 takes
    // ~20 s while a field of 5 takes ~37 s, so waiting on Promise.all let one straggler
    // consume the whole budget and returned a 7-question test.
    const initialBatches = Math.max(1, Math.ceil(count / BATCH_SIZE));
    const maxLaunches = initialBatches + MAX_EXTRA_BATCHES;
    let launches = 0;
    let reserved = 0;
    const pending = new Set<Promise<void>>();

    const launch = (need: number) => {
      if (need <= 0 || launches >= maxLaunches) return;
      const requested = Math.min(BATCH_SIZE, need);
      launches++;
      reserved += requested;
      const task = fetchBatch(apiKey, topic, language, requested, deadline).then((batch) => {
        pending.delete(task);
        reserved -= requested;
        merge(batch);
      });
      pending.add(task);
    };

    for (let i = 0; i < initialBatches; i++) {
      launch(Math.min(BATCH_SIZE, count - i * BATCH_SIZE));
    }

    while (pending.size > 0 && questions.length < count) {
      await Promise.race([...pending]);
      if (questions.length >= count) break;
      if (deadline - Date.now() < MIN_TOPUP_BUDGET_MS) break;

      const missing = count - questions.length - reserved;
      const batches = Math.min(maxLaunches - launches, Math.ceil(missing / BATCH_SIZE));
      for (let i = 0; i < batches; i++) launch(Math.min(BATCH_SIZE, missing - i * BATCH_SIZE));
    }

    if (questions.length === 0) return json({ error: 'AI returned no valid questions' }, 502);

    console.log(
      `generated ${questions.length}/${count} ${topic}/${language} in ${Date.now() - startedAt}ms`
    );
    return json({ questions: questions.map(shuffleOptions), topic, language });
  } catch (err) {
    console.error('generate-test failed', err);
    return json({ error: 'AI service unavailable' }, 502);
  }
});
