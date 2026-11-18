#!/usr/bin/env python3
"""
Daily practice-question generator for Rojgar Mitra.

Asks DeepSeek V4.1 Flash (via the Command Code provider API, OpenAI-compatible) for small
batches of ORIGINAL exam-style MCQs that follow the GSSSB / GPSSB / GPSC syllabus in
generator/syllabus.json, validates them, shuffles the options and stores them in
public.practice_questions. The app reads that pool instantly - users never wait for the LLM.

Why small batches: V4.1 Flash reasons for 6-8k tokens on exam-style prompts. Measured on
2026-11-05, 3-4 questions per call finish in ~40-50 s; 10 per call runs out of budget.

Each batch tops up the (topic, language) pair that currently has the fewest questions,
so the pool stays balanced across 6 topics x 3 languages.

Usage:
  python generator/generate_questions.py                    # insert (needs env below)
  python generator/generate_questions.py --dry-run          # generate, print, store nothing
  python generator/generate_questions.py --out pool.json    # generate to a file, no database

Environment:
  LLM_API_KEY                 Command Code API key (required)
  LLM_MODEL                   default deepseek/deepseek-v4.1-flash  (do not use -fast variants)
  LLM_BASE_URL                default https://api.commandcode.ai/provider/v1
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   required unless --dry-run / --out
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
SYLLABUS = json.load(open(os.path.join(HERE, 'syllabus.json'), encoding='utf-8'))

LLM_BASE_URL = os.environ.get('LLM_BASE_URL', 'https://api.commandcode.ai/provider/v1').rstrip('/')
LLM_MODEL = os.environ.get('LLM_MODEL', 'deepseek/deepseek-v4.1-flash')
USER_AGENT = 'RojgarMitra-QuestionGenerator/1.0'  # the provider's firewall rejects default UAs
OPTION_KEYS = ('A', 'B', 'C', 'D')

# Keep in step with supabase/functions/generate-test/policy.ts and utils/aiGenerator.ts.
# The prompt asks for less than these ceilings; the parser enforces the ceilings.
QUESTION_MAX_CHARS = 160
OPTION_MAX_CHARS = 70
EXPLANATION_MAX_CHARS = 120

TOPICS = tuple(SYLLABUS['topics'])
LANGUAGES = tuple(SYLLABUS['languages'])

CROSS_REFERENCE = re.compile(
    r'all of the above|none of the(se| above)|both\s+[A-D]\b|\b[A-D]\s*(and|&|અને|और)\s*[A-D]\b'
    r'|ઉપરના|ઉપરોક્ત|આમાંથી એક પણ નહીં|उपरोक्त|इनमें से कोई नहीं',
    re.I,
)

# Questions in the wrong script are useless to the reader (e.g. English text in a Gujarati test).
SCRIPT = {'gu': re.compile(r'[઀-૿]'), 'hi': re.compile(r'[ऀ-ॿ]')}


# --------------------------------------------------------------------------- prompt


def build_prompt(topic: str, language: str, count: int, focus: list[str]) -> str:
    area = SYLLABUS['topics'][topic]['area']
    styles = '; '.join(SYLLABUS['question_styles'])
    return f"""You are an expert paper-setter for Gujarat government recruitment exams (GSSSB Class-3, GPSSB Talati-cum-Mantri, GPSC Class 1-2 Prelims, Gujarat Police LRD).
The candidates are farmers and rural youth with basic schooling.

Write exactly {count} ORIGINAL multiple choice questions on {area}.
Spread them across these syllabus sub-topics: {'; '.join(focus)}.
Model the format, phrasing and difficulty on previous-year papers of those exams, but do NOT copy any real question word-for-word.
Use a mix of these question styles: {styles}.
Mix easy, medium and hard questions.
Write every question, option and explanation in {SYLLABUS['languages'][language]}. Use short sentences and common words.
Each question has exactly 4 options (A, B, C, D) and exactly one correct answer.
Options are shuffled later, so NEVER write options that refer to other options ("Both A and B", "All of the above", "None of these"); every option must stand alone.
Only use facts you are certain are correct and not time-sensitive; avoid events from the last two years.
The explanation is one short sentence that teaches why the answer is right; it must not mention option letters.

LENGTH RULES - the app shows the whole item on one phone screen:
- The question is ONE sentence of at most 120 characters. Never a paragraph, numbered parts, or a long list of pairs.
- Each option is at most 50 characters. In a match-the-pairs question an option may list at most two pairs.
- The explanation is at most 90 characters.
If a fact cannot fit inside these limits, ask a simpler question.

Output ONLY valid, parseable JSON - no markdown, no commentary - in exactly this shape:
{{"questions":[{{"question":"...","options":{{"A":"...","B":"...","C":"...","D":"..."}},"correct":"A","explanation":"..."}}]}}"""


# --------------------------------------------------------------------------- parsing


def parse_questions(raw: str, language: str) -> list[dict]:
    """Extract and validate questions from model output. Invalid items are dropped."""
    text = re.sub(r'<think>[\s\S]*?</think>', '', raw or '', flags=re.I)
    text = re.sub(r'```(?:json)?', '', text).strip()
    start, end = text.find('{'), text.rfind('}')
    if start == -1 or end <= start:
        return []
    try:
        items = json.loads(text[start : end + 1]).get('questions', [])
    except (json.JSONDecodeError, AttributeError):
        return []

    valid, seen = [], set()
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        # Collapse newlines so a "question" cannot smuggle in a multi-line paragraph.
        question = re.sub(r'\s+', ' ', str(item.get('question') or '')).strip()
        options = item.get('options') if isinstance(item.get('options'), dict) else {}
        opts = {k: re.sub(r'\s+', ' ', str(options.get(k) or '')).strip() for k in OPTION_KEYS}
        correct = str(item.get('correct') or '').strip().upper()
        explanation = re.sub(r'\s+', ' ', str(item.get('explanation') or '')).strip()
        if not question or not all(opts.values()) or correct not in OPTION_KEYS:
            continue
        if len(set(opts.values())) < 4:  # duplicate options make the question ambiguous
            continue
        if language in SCRIPT and not SCRIPT[language].search(question):
            continue
        if question in seen:
            continue
        if (
            len(question) > QUESTION_MAX_CHARS
            or any(len(text) > OPTION_MAX_CHARS for text in opts.values())
            or len(explanation) > EXPLANATION_MAX_CHARS
        ):
            continue
        seen.add(question)
        valid.append(
            {
                'question': question,
                'options': opts,
                'correct': correct,
                'explanation': explanation,
            }
        )
    return valid


def shuffle_options(q: dict, rng: random.Random = random) -> dict:
    """LLMs over-use A/B for the answer; shuffle so the correct letter is uniform."""
    if any(CROSS_REFERENCE.search(v) for v in q['options'].values()):
        return q  # options point at each other - shuffling would make them wrong
    entries = [(q['options'][k], k == q['correct']) for k in OPTION_KEYS]
    rng.shuffle(entries)
    options = {k: text for k, (text, _) in zip(OPTION_KEYS, entries)}
    correct = next(k for k, (_, is_correct) in zip(OPTION_KEYS, entries) if is_correct)
    return {**q, 'options': options, 'correct': correct}


# --------------------------------------------------------------------------- planning


def plan_batches(counts: dict[tuple[str, str], int], n_batches: int, per_batch: int) -> list[tuple[str, str]]:
    """Greedy: each batch goes to the pair with the fewest (stored + planned) questions."""
    projected = {(t, l): counts.get((t, l), 0) for t in TOPICS for l in LANGUAGES}
    plan = []
    for _ in range(n_batches):
        pair = min(projected, key=lambda p: (projected[p], TOPICS.index(p[0]), LANGUAGES.index(p[1])))
        plan.append(pair)
        projected[pair] += per_batch
    return plan


# --------------------------------------------------------------------------- LLM


def call_llm(api_key: str, prompt: str, timeout: int = 120) -> tuple[str, str]:
    """Returns (content, finish_reason). Raises on HTTP errors."""
    resp = requests.post(
        f'{LLM_BASE_URL}/chat/completions',
        headers={'Authorization': f'Bearer {api_key}', 'User-Agent': USER_AGENT, 'Content-Type': 'application/json'},
        json={
            'model': LLM_MODEL,
            'messages': [{'role': 'user', 'content': prompt}],
            'temperature': 0.7,
            'max_tokens': 8000,  # ~6-7k go to reasoning before the answer
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    choice = resp.json()['choices'][0]
    return choice['message'].get('content') or '', choice.get('finish_reason') or ''


def generate_batch(api_key: str, topic: str, language: str, per_batch: int, attempts: int = 2) -> list[dict]:
    subtopics = SYLLABUS['topics'][topic]['subtopics']
    for attempt in range(1, attempts + 1):
        focus = random.sample(subtopics, k=min(2, len(subtopics)))
        try:
            content, finish = call_llm(api_key, build_prompt(topic, language, per_batch, focus))
        except requests.RequestException as exc:
            status = getattr(exc.response, 'status_code', None)
            print(f'  ! {topic}/{language} attempt {attempt}: HTTP error {status or type(exc).__name__}')
            time.sleep(5 * attempt)
            continue
        questions = parse_questions(content, language)
        if questions:
            return [
                {**shuffle_options(q), 'topic': topic, 'language': language, 'subtopic': '; '.join(focus), 'model': LLM_MODEL}
                for q in questions
            ]
        print(f'  ! {topic}/{language} attempt {attempt}: no valid questions (finish={finish})')
    return []


# --------------------------------------------------------------------------- database


def supabase_client():
    url = os.environ.get('SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        raise SystemExit('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (or use --dry-run / --out)')
    from supabase import create_client  # lazy: tests need no DB dependency

    return create_client(url, key)


def current_counts(client) -> dict[tuple[str, str], int]:
    counts = {}
    for topic in TOPICS:
        for language in LANGUAGES:
            res = (
                client.table('practice_questions')
                .select('id', count='exact', head=True)
                .eq('topic', topic)
                .eq('language', language)
                .execute()
            )
            counts[(topic, language)] = res.count or 0
    return counts


def store(client, rows: list[dict]) -> None:
    if rows:
        client.table('practice_questions').upsert(
            rows, on_conflict='topic,language,question', ignore_duplicates=True
        ).execute()


# --------------------------------------------------------------------------- main


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate exam-style practice questions')
    parser.add_argument('--batches', type=int, default=48, help='LLM calls to make (default 48 = ~144 questions)')
    parser.add_argument('--per-batch', type=int, default=3, help='questions per call (default 3)')
    parser.add_argument('--workers', type=int, default=4, help='parallel calls (default 4)')
    parser.add_argument('--dry-run', action='store_true', help='generate and print, store nothing')
    parser.add_argument('--out', help='write questions to this JSON file instead of the database')
    args = parser.parse_args()

    if '-fast' in LLM_MODEL:
        raise SystemExit(f'Refusing to use {LLM_MODEL}: fast variants are not allowed for this project.')
    api_key = os.environ.get('LLM_API_KEY')
    if not api_key:
        raise SystemExit('LLM_API_KEY is required')

    offline = args.dry_run or bool(args.out)
    client = None if offline else supabase_client()
    counts = current_counts(client) if client else {}
    plan = plan_batches(counts, args.batches, args.per_batch)
    print(f'Model {LLM_MODEL}: {len(plan)} batches x {args.per_batch} questions, {args.workers} in parallel')

    all_rows, failed = [], 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(generate_batch, api_key, t, l, args.per_batch): (t, l) for t, l in plan}
        for future in as_completed(futures):
            topic, language = futures[future]
            rows = future.result()
            if not rows:
                failed += 1
                continue
            print(f'  ✓ {topic}/{language}: {len(rows)} questions')
            if client:
                store(client, rows)
            all_rows.extend(rows)

    if args.out:
        with open(args.out, 'w', encoding='utf-8') as fh:
            json.dump(all_rows, fh, ensure_ascii=False, indent=2)
    if args.dry_run:
        for row in all_rows[:5]:
            print(json.dumps(row, ensure_ascii=False)[:300])

    print(f'\nDone: {len(all_rows)} questions from {len(plan) - failed}/{len(plan)} batches')
    # Fail the CI run when most batches fail (e.g. expired key, provider outage).
    return 1 if failed > len(plan) / 2 else 0


if __name__ == '__main__':
    sys.exit(main())
