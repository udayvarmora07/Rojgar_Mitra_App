#!/bin/bash
# Runs the scraper unit tests, then a live DRY RUN (nothing is written to the database).
set -euo pipefail
cd "$(dirname "$0")/.."

PY=python3
[ -x scraper/venv/bin/python ] && PY=scraper/venv/bin/python

echo "Running scraper unit tests..."
"$PY" -m unittest discover -s scraper -p 'test_*.py'

echo "Running scraper in DRY RUN mode (no database inserts)..."
"$PY" scraper/scraper.py --dry-run
