#!/usr/bin/env python3
"""Gujarat Government Jobs Scraper"""

import os
import json
import re
from datetime import datetime
from typing import List, Dict, Optional
from bs4 import BeautifulSoup
import requests
from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', '')

# Source URLs for Gujarat government jobs
SOURCE_URLS = [
    'https://www.gujarat.gov.in/jobs',
    'https://www.employeenews.gujarat.gov.in/',
    'https://ojas.gujarat.gov.in/',
]

def get_supabase_client() -> Optional[Client]:
    """Initialize Supabase client."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Supabase credentials not configured")
        return None
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def fetch_page(url: str) -> Optional[str]:
    """Fetch a web page with error handling."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def parse_job_listing(html: str, source: str) -> List[Dict]:
    """Parse job listings from HTML."""
    jobs = []
    soup = BeautifulSoup(html, 'html.parser')
    
    # Common patterns for job listings
    job_cards = soup.find_all('div', class_=re.compile(r'job|vacancy|recruitment', re.I))
    
    for card in job_cards:
        try:
            title_elem = card.find(['h2', 'h3', 'a'], string=re.compile(r'(job|vacancy|recruitment)', re.I))
            org_elem = card.find('span', class_=re.compile(r'organ|board|department', re.I))
            date_elem = card.find('span', class_=re.compile(r'date|deadline', re.I))
            link_elem = card.find('a', href=True)
            
            if title_elem:
                job = {
                    'title': title_elem.get_text(strip=True),
                    'organization': org_elem.get_text(strip=True) if org_elem else source,
                    'source': source,
                    'source_url': link_elem.get('href', '') if link_elem else '',
                    'language': 'gu',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat(),
                }
                
                # Parse date
                if date_elem:
                    job['deadline'] = date_elem.get_text(strip=True)
                
                jobs.append(job)
        except Exception as e:
            continue
    
    return jobs

def parse_ojas_portal(html: str) -> List[Dict]:
    """Parse OJAS portal specifically."""
    jobs = []
    soup = BeautifulSoup(html, 'html.parser')
    
    # OJAS specific parsing
    tables = soup.find_all('table')
    for table in tables:
        rows = table.find_all('tr')
        for row in rows[1:]:  # Skip header
            cols = row.find_all('td')
            if len(cols) >= 2:
                title = cols[0].get_text(strip=True)
                link = cols[1].find('a')
                if title and link:
                    jobs.append({
                        'title': title,
                        'organization': 'OJAS Gujarat',
                        'source': 'OJAS',
                        'source_url': link.get('href', ''),
                        'language': 'gu',
                        'created_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat(),
                    })
    
    return jobs

def save_jobs_to_supabase(jobs: List[Dict], client: Client) -> int:
    """Save jobs to Supabase."""
    saved_count = 0
    
    for job in jobs:
        try:
            # Check if job already exists
            existing = client.table('jobs').select('id').eq('title', job['title']).eq('source_url', job['source_url']).execute()
            
            if not existing.data:
                client.table('jobs').insert(job).execute()
                saved_count += 1
        except Exception as e:
            print(f"Error saving job: {e}")
            continue
    
    return saved_count

def scrape_all_sources() -> Dict[str, int]:
    """Scrape all configured sources."""
    results = {}
    client = get_supabase_client()
    
    if not client:
        print("Cannot proceed without Supabase client")
        return results
    
    for url in SOURCE_URLS:
        print(f"Scraping {url}...")
        html = fetch_page(url)
        
        if html:
            if 'ojas' in url:
                jobs = parse_ojas_portal(html)
            else:
                jobs = parse_job_listing(html, url)
            
            saved = save_jobs_to_supabase(jobs, client)
            results[url] = saved
            print(f"Saved {saved} jobs from {url}")
    
    return results

def main():
    """Main entry point."""
    print("Starting Gujarat Government Jobs Scraper...")
    results = scrape_all_sources()
    
    print("\nScraping complete!")
    for url, count in results.items():
        print(f"  {url}: {count} jobs")

if __name__ == '__main__':
    main()
