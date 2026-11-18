"""Unit tests for the question generator. Run: python -m unittest discover -s generator"""

import json
import os
import random
import sys
import unittest
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))

import generate_questions as g  # noqa: E402


def make(question, correct='A', options=None, explanation='why'):
    return {
        'question': question,
        'options': options or {'A': 'one', 'B': 'two', 'C': 'three', 'D': 'four'},
        'correct': correct,
        'explanation': explanation,
    }


class SyllabusTests(unittest.TestCase):
    def test_every_topic_has_subtopics(self):
        self.assertEqual(set(g.TOPICS), {'gk', 'math', 'reasoning', 'gujarati', 'english', 'current'})
        for topic, spec in g.SYLLABUS['topics'].items():
            self.assertGreaterEqual(len(spec['subtopics']), 6, topic)

    def test_prompt_contains_rules_and_focus(self):
        prompt = g.build_prompt('gujarati', 'gu', 3, ['સમાસ ઓળખો', 'અલંકાર ઓળખો'])
        self.assertIn('exactly 3 ORIGINAL', prompt)
        self.assertIn('સમાસ ઓળખો; અલંકાર ઓળખો', prompt)
        self.assertIn('Gujarati script', prompt)
        self.assertIn('do NOT copy', prompt)
        self.assertIn('"questions"', prompt)
        self.assertIn('at most 120 characters', prompt)
        self.assertIn('at most 50 characters', prompt)


class ParseTests(unittest.TestCase):
    def test_strips_reasoning_and_fences(self):
        raw = '<think>plan {x}</think>```json\n' + json.dumps({'questions': [make('What is 2+2?')]}) + '\n```'
        self.assertEqual(len(g.parse_questions(raw, 'en')), 1)

    def test_drops_invalid_items(self):
        items = [
            make('ok?'),
            make('bad letter?', correct='E'),
            make('missing option?', options={'A': 'a', 'B': 'b', 'C': 'c', 'D': ''}),
            make('duplicate options?', options={'A': 'x', 'B': 'x', 'C': 'y', 'D': 'z'}),
            make('ok?'),  # repeated question
            'not a dict',
        ]
        out = g.parse_questions(json.dumps({'questions': items}), 'en')
        self.assertEqual([q['question'] for q in out], ['ok?'])

    def test_collapses_whitespace(self):
        raw = json.dumps({'questions': [make('What is\n   2 + 2?')]})
        self.assertEqual(g.parse_questions(raw, 'en')[0]['question'], 'What is 2 + 2?')

    def test_drops_overlong_fields(self):
        items = [
            make('x' * (g.QUESTION_MAX_CHARS + 1)),
            make('ok?', options={'A': '1', 'B': '2', 'C': '3', 'D': 'y' * (g.OPTION_MAX_CHARS + 1)}),
            make('ok?', explanation='z' * (g.EXPLANATION_MAX_CHARS + 1)),
        ]
        self.assertEqual(g.parse_questions(json.dumps({'questions': items}), 'en'), [])

    def test_requires_the_right_script(self):
        raw = json.dumps({'questions': [make('Which is correct?'), make('કયું સાચું છે?')]})
        self.assertEqual([q['question'] for q in g.parse_questions(raw, 'gu')], ['કયું સાચું છે?'])

    def test_garbage(self):
        self.assertEqual(g.parse_questions('sorry', 'en'), [])
        self.assertEqual(g.parse_questions('{not json}', 'en'), [])
        self.assertEqual(g.parse_questions('', 'en'), [])


class ShuffleTests(unittest.TestCase):
    def test_keeps_the_correct_text(self):
        q = make('q?', correct='C')
        for seed in range(20):
            s = g.shuffle_options(q, random.Random(seed))
            self.assertEqual(s['options'][s['correct']], 'three')
            self.assertEqual(sorted(s['options'].values()), sorted(q['options'].values()))

    def test_spreads_correct_letters(self):
        rng = random.Random(1)
        letters = Counter(g.shuffle_options(make('q?', correct='A'), rng)['correct'] for _ in range(400))
        self.assertEqual(set(letters), {'A', 'B', 'C', 'D'})
        self.assertTrue(all(60 < n < 140 for n in letters.values()), letters)

    def test_does_not_shuffle_cross_references(self):
        for text in ['Both A and B', 'All of the above', 'ઉપરોક્ત બધા', 'उपरोक्त सभी', 'A અને C']:
            q = make('q?', options={'A': 'x', 'B': 'y', 'C': 'z', 'D': text})
            self.assertIs(g.shuffle_options(q, random.Random(3)), q, text)


class PlanTests(unittest.TestCase):
    def test_balances_toward_emptiest_pairs(self):
        counts = {(t, l): 30 for t in g.TOPICS for l in g.LANGUAGES}
        counts[('reasoning', 'gu')] = 0
        plan = g.plan_batches(counts, 10, 3)
        self.assertEqual(plan[:10], [('reasoning', 'gu')] * 10)

    def test_even_spread_from_empty(self):
        plan = g.plan_batches({}, 36, 3)
        self.assertEqual(Counter(plan), Counter({(t, l): 2 for t in g.TOPICS for l in g.LANGUAGES}))


if __name__ == '__main__':
    unittest.main()
