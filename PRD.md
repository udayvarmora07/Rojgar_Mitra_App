# Rojgar Mitra - Product Requirements Document (PRD)

## 1. Project Overview

**Project Name:** Rojgar Mitra (રોજગાર મિત્ર)
**Project Type:** Mobile Application (Android)
**Current Status:** In Development

**Core Functionality:** A Gujarat Government Jobs Aggregator designed to help farmers and rural youth discover government employment opportunities, understand eligibility criteria, access free AI-generated practice tests, and find application/exam center information.

**Target Audience:**
- Farmers and rural youth in Gujarat
- Users with low technical literacy
- Users who may struggle with complex English terms

---

## 2. Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React Native (Expo SDK 54) | Mobile app development |
| Styling | NativeWind v4 | UI styling |
| Routing | Expo Router v6 | File-based navigation |
| Backend/Database | Supabase (PostgreSQL) | Data storage |
| Data pipeline | Rust scraper + Poppler PDF enrichment (Python scraper kept for parity) | Job data aggregation and official-notice facts |
| AI Integration | DeepSeek V4.1 Flash via Command Code API (OpenAI-compatible) | Practice test generation |

---

## 3. UI/UX & Localization Rules

### 3.1 Design Principles
- **Simplicity:** Extremely simple interfaces with minimal complexity
- **High Contrast:** Dark text on light backgrounds, large touch targets (minimum 48x48dp)
- **Large Typography:** Minimum 18sp font size for body text
- **No Complex Gestures:** Simple taps only, no swipes or long-presses
- **Color Palette:**
  - Primary: Blue-900 (#1E3A8A)
  - Accent: Green-600 (#059669)
  - Alert: Red-600 (#DC2626)
  - Background: Gray-50 (#F9FAFB)
  - Text: Gray-900 (#111827)

### 3.2 Localization
- **Languages:** English (en) and Gujarati (gu)
- **Default:** English with Gujarati subtitles/prompts
- **Language Switcher:** Prominent toggle in header for English ↔ Gujarati
- **Simple Terminology:** Avoid complex English terms, use plain Gujarati phrases

---

## 4. Core User Flows

### 4.1 Job Browsing Flow

```
[Home Screen]
    │
    ├── View Job Categories (by department, education level)
    │
    ├── Browse Job List
    │   - Job title, organization, last date to apply
    │   - Filter by: Category, Deadline
    │
    └── Select Job → View Job Details
        - Full description, eligibility, important dates
        - Direct link to official application
```

### 4.2 Eligibility Checking Flow

```
[Job Details Screen]
    │
    ├── View eligibility requirements
    │   - Education qualification
    │   - Age limit
    │   - Application fees
    │
    └── "Check My Eligibility" → Eligibility Checklist
        - Interactive YES/NO toggles
        - Clear eligibility result
        - Next steps guidance
```

### 4.3 Document Checklist Flow (Exam Preparation)

```
[Job Details Screen] or [Documents Tab]
    │
    ├── View Application Documents Checklist
    │   - Aadhaar Card, Education Certificates
    │   - Category Certificate, Domicile Certificate
    │   - Passport Photo, Signature
    │   - Mobile Number, Email ID, Bank Account
    │
    └── View Exam Center Documents Checklist
        - Admit Card (Hall Ticket)
        - Aadhaar Card, Passport Photo
        - Ballpoint Pen (Blue/Black)
        - Water Bottle (transparent)
    │
    └── Mark documents as "Ready" or "Not Ready"
        - Track preparation progress
        - View pending items count
```

### 4.4 Practice Test Flow (AI Integration)

```
[Practice Tab] or [Job Details → Start Practice Test]
    │
    ├── Select Test Category
    │   - General Knowledge (સામાન્ય જ્ઞાન)
    │   - Mathematics (ગણિત)
    │   - Gujarati Language (ગુજરાતી ભાષા)
    │   - English Basics (અંગ્રેજી પાયાનું)
    │   - Current Affairs (વર્તમાન બાબતો)
    │
    └── Take AI-Generated Test
        - Multiple choice questions (4 options)
        - Optional timer
        - Immediate results with explanations
    │
    └── View Test History
        - Past scores
        - Generate new tests
```

### 4.5 Language Switching Flow

```
[Any Screen]
    │
    └── Tap Language Toggle (Header)
        - Instantly switches all UI text
        - Persists preference locally
        - Jobs and content remain in original language
```

---

## 5. Feature Specifications

### 5.1 Home Screen
- Welcome message in English with Gujarati subtitle
- Quick access to latest jobs (first 10, sorted by deadline)
- Category shortcuts
- Language toggle prominently displayed
- Bottom tab navigation (Home, Jobs, Practice)

### 5.2 Job Listing Screen
- Scrollable list of jobs with:
  - Job title (bold, large text)
  - Department/Organization name
  - Deadline (highlighted in red if ≤7 days)
  - Salary (if available)
- Pull-to-refresh functionality
- A freshness line stating when the list was last checked from the network (just now, minutes,
  today, yesterday, or a date)
- "No results" state with helpful message
- Quick actions: View Details, Apply Now

### 5.3 Job Details Screen
- Full job information:
  - Title, Department, Location
  - Post date, Deadline
  - Salary range
  - Eligibility criteria (age, qualifications, fees)
  - Long official text is clamped to five lines with an explicit "Show full text" control;
    the complete wording remains available and is never paraphrased
  - Required documents (Application & Exam phases)
- The source site the notice came from, when it is a safe HTTP(S) link
- Share this notice through the native share sheet (Web Share or a copied message on web),
  carrying only facts already shown on the notice
- Action buttons:
  - "Apply Now - Official Website" (external link) — only while the last date has not passed
  - On a closed notice: a written closed state and "Open the official notice" instead, because
    the official page may carry a corrigendum or call letter
  - "Start Practice Test" (navigates to Practice tab)
  - "View Document Checklist"

### 5.4 Eligibility Checker Screen
- Interactive checklist with YES/NO toggles:
  - ✅ Do you have the required qualification?
  - ✅ Are you within the age limit?
  - ✅ Is your category eligible?
  - ✅ Do you have the required documents?
- Final result: "You may be eligible" / "You may not be eligible"
- Clear next steps for each result

### 5.5 Document Checklist Screens

#### Application Phase Documents
| Document | Description | Status |
|----------|-------------|--------|
| Aadhaar Card | Mandatory identity proof | ⬜ Not Ready / ✅ Ready |
| Education Certificates | 10th, 12th, Graduate (as required) | ⬜ Not Ready / ✅ Ready |
| Category Certificate | SC/ST/OBC certificate (if applicable) | ⬜ Not Ready / ✅ Ready |
| Domicile Certificate | Gujarat state domicile | ⬜ Not Ready / ✅ Ready |
| Passport Photo | Recent passport-size photograph | ⬜ Not Ready / ✅ Ready |
| Signature | Clear signature on white paper | ⬜ Not Ready / ✅ Ready |
| Mobile Number | Linked to Aadhaar | ⬜ Not Ready / ✅ Ready |
| Email ID | Valid email address | ⬜ Not Ready / ✅ Ready |
| Bank Account Details | For fee refund/ salary credit | ⬜ Not Ready / ✅ Ready |

#### Exam Center Phase Documents
| Document | Description | Status |
|----------|-------------|--------|
| Admit Card (Hall Ticket) | Downloaded from official website | ⬜ Not Ready / ✅ Ready |
| Aadhaar Card | Original Aadhaar for verification | ⬜ Not Ready / ✅ Ready |
| Passport Photo | Same as application photo | ⬜ Not Ready / ✅ Ready |
| Ballpoint Pen | Blue or Black ink only | ⬜ Not Ready / ✅ Ready |
| Water Bottle | Transparent water bottle | ⬜ Not Ready / ✅ Ready |

**Features:**
- Mark items as "Ready" / "Not Ready"
- Progress indicator (X of Y documents ready)
- Reminder summary for pending documents

### 5.6 Practice Tests Screen (AI Integration)

#### Test Categories
| Category | Gujarati | Topics |
|----------|----------|--------|
| General Knowledge | સામાન્ય જ્ઞાન | Indian Constitution, History, Geography |
| Mathematics | ગણિત | Arithmetic, Algebra, Geometry |
| Gujarati Language | ગુજરાતી ભાષા | Grammar, Vocabulary, Comprehension |
| English Basics | અંગ્રેજી પાયાનું | Basic English vocabulary and grammar |
| Current Affairs | વર્તમાન બાબતો | Recent news and events |

#### Test Features
- Multiple choice questions (4 options: A, B, C, D)
- 10 questions per test
- Optional timer (15 minutes default)
- Immediate results with explanations in Gujarati
- "Generate New Test" button
- Store test history locally

### 5.7 Deadline Reminders

The last date is the one fact a candidate cannot recover from missing it.

- **On a notice** (only while a useful morning remains): one local notification at 09:00,
  three days before the last date. When the notice is closer than three days, the next free
  morning is used; when none remains, the app says so instead of scheduling.
- **Control**: the button names the exact date before it is pressed, states a blocked
  notification permission with a way to the OS settings, and can remove the reminder again.
- **List** (`/reminders`, linked from Settings): every scheduled reminder with its notice
  title, last date and reminder date/time, a way to open the notice, and a one-tap remove.
- **Tap behaviour**: tapping the notification opens that notice. Tapping a document reminder
  opens `/documents`. Only internal app paths are followed from a notification payload.
- **Local only**: no push token, no server write. Records whose notice has closed are pruned.
- **Unsupported platform**: the web build states that reminders work in the mobile app.

---

## 6. LLM Integration (DeepSeek V4.1 Flash via Command Code)

### 6.1 API Configuration
- **Endpoint:** Configured via Edge Function
- **Purpose:** Generate practice test questions on-demand
- **Output Format:** Valid JSON

### 6.2 Prompt Template

```json
{
  "prompt": "Generate 10 multiple choice questions for [TOPIC] in simple Gujarati. Each question should have 4 options (A, B, C, D). Output ONLY valid JSON:\n{\n  \"questions\": [\n    {\n      \"question\": \"question text in Gujarati\",\n      \"options\": {\n        \"A\": \"option A\",\n        \"B\": \"option B\",\n        \"C\": \"option C\",\n        \"D\": \"option D\"\n      },\n      \"correct\": \"A\",\n      \"explanation\": \"brief explanation in Gujarati\"\n    }\n  ]\n}\nNo additional text.",
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### 6.3 Integration Architecture

```
[Frontend] → [Supabase Edge Function] → [LLM API]
                │
                └── Validate JSON response
                └── Transform to app format
                └── Cache questions (optional)
```

### 6.4 Fallback Strategy
- Pre-loaded question bank for offline access
- Cache last fetched questions locally
- Graceful degradation if API unavailable

---

## 7. Database Schema

### 7.1 Tables

| Table | Columns | Purpose |
|-------|---------|---------|
| `jobs` | id, title, department, post_date, deadline, salary, source_link, vacancies, qualification, advertisement_no, education_level, location, created_at, updated_at | Job postings. `education_level` is the minimum accepted level, derived from `qualification`; `location` is a place name when the source states one |
| `job_details` | id, job_id (FK), age_limit, required_qualifications, application_fees, created_at | Eligibility info |
| `documents_required` | id, job_id (FK), document_name, phase ('Application'|'Exam Center'), created_at | Document checklists |
| `learning_resources` | id, job_id (FK, nullable), resource_type ('PDF'|'AI_Test'|'Video'|'Link'), link_or_content, title, description, language, topic, sort_order, created_at | Study materials. A NULL job_id is a general resource visible from the Practice tab |
| `practice_questions` | id, topic, language, subtopic, question, options, correct, explanation, model, created_at | Pre-generated practice pool read by `get_practice_questions()` |

### 7.2 Row Level Security
- All tables: Public read access (anyone can read)
- Write access via Service Role Key (server-side only)

---

## 8. File & Directory Structure

```
Rojgar_Mitra_App/
├── app/                              # Expo Router file-based routing
│   ├── _layout.tsx                   # Root layout (Stack navigator)
│   ├── index.tsx                    # Home screen - latest jobs, welcome
│   ├── job/
│   │   └── [id].tsx                 # Job details screen
│   ├── jobs/
│   │   ├── _layout.tsx              # Jobs tab layout (Tab navigator)
│   │   ├── index.tsx                # Job listing screen
│   │   └── [id].tsx                 # Job details (duplicate or shared)
│   ├── eligibility/
│   │   ├── _layout.tsx              # Eligibility tab layout
│   │   ├── index.tsx                # Eligibility checker home
│   │   └── [jobId].tsx              # Eligibility checklist for job
│   ├── practice/
│   │   ├── _layout.tsx              # Practice tab layout
│   │   ├── index.tsx                # Practice test categories
│   │   └── test/
│   │       └── [category].tsx       # Test taking screen
│   ├── documents/
│   │   ├── _layout.tsx              # Documents tab layout
│   │   ├── index.tsx                # Document checklist home
│   │   ├── application.tsx          # Application documents checklist
│   │   └── exam.tsx                 # Exam center documents checklist
│   └── settings/
│       └── index.tsx                # Settings (language toggle, preferences)
├── components/
│   ├── ui/                           # Reusable UI primitives
│   │   ├── Button.tsx               # Primary/Secondary buttons
│   │   ├── Card.tsx                 # Content card container
│   │   ├── Header.tsx               # Screen header with back nav
│   │   ├── LanguageToggle.tsx       # EN/GU language switcher
│   │   ├── Checkbox.tsx             # Checkbox with label
│   │   ├── ProgressBar.tsx          # Document readiness progress
│   │   └── Badge.tsx                # Status badges (deadline, etc.)
│   ├── jobs/
│   │   ├── JobCard.tsx              # Job list item component
│   │   ├── JobList.tsx              # Scrollable job list
│   │   └── FilterModal.tsx          # Job filter modal
│   └── practice/
│       ├── QuestionCard.tsx         # Test question display
│       ├── TestResult.tsx           # Test results summary
│       ├── Timer.tsx                # Countdown timer
│       └── OptionButton.tsx         # Answer option button
├── context/
│   ├── LanguageContext.tsx           # Language state (en/gu)
│   └── AuthContext.tsx               # Supabase auth (future)
├── hooks/
│   ├── useJobs.ts                    # Job fetching + caching
│   ├── useLanguage.ts                # Language switch helper
│   └── usePracticeTest.ts           # AI test generation
├── lib/
│   ├── supabase.ts                   # Supabase client + types
│   ├── minimax.ts                    # MiniMax API client (Edge function call)
│   └── translations.ts               # EN/GU translation strings
├── types/
│   ├── jobs.ts                       # Job, JobDetail, DocumentRequired types
│   ├── questions.ts                  # Test question types
│   └── documents.ts                  # Document checklist types
├── constants/
│   ├── categories.ts                 # Job categories data
│   ├── districts.ts                  # Gujarat districts
│   └── testCategories.ts             # Practice test categories
├── supabase/
│   ├── functions/                    # Supabase Edge Functions
│   │   └── generate-test/           # AI test generation endpoint
│   │       └── index.ts
│   └── supabase_schema.sql          # Database schema
├── scraping/                         # Python scraper (separate module)
│   ├── scraper.py                   # Main entry point
│   ├── sources/                     # Source-specific scrapers
│   │   ├── ojhar_jobs.py
│   │   └── gpsc.py
│   └── utils.py                     # Common utilities
├── scripts/                          # Development scripts
│   ├── start-clean.sh               # Clear cache + start Expo
│   ├── sync-db.sh                   # Push schema to Supabase
│   └── test-scraper.sh              # Test scraper output
├── assets/                           # Static assets
│   ├── images/
│   └── fonts/
├── global.css                        # NativeWind global styles
├── package.json
├── app.json                          # Expo configuration
├── tailwind.config.js               # NativeWind configuration
├── tsconfig.json
└── PRD.md                            # This document
```

---

## 9. Screen Specifications

### 9.1 Tab Navigation Structure

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│    Home     │     Jobs     │   Practice   │   Settings   │
│    (ઘર)      │   (નોકરીઓ)   │   (અભ્યાસ)    │  (સેટિંગ્સ)   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### 9.2 Screen Hierarchy

| Tab | Screen | File | Purpose |
|-----|--------|------|---------|
| - | Home | `app/index.tsx` | Welcome, latest jobs |
| Jobs | Job List | `app/jobs/index.tsx` | Browse all jobs |
| Jobs | Job Details | `app/job/[id].tsx` | Full job information |
| - | Eligibility | `app/eligibility/[jobId].tsx` | Check eligibility |
| Practice | Practice Home | `app/practice/index.tsx` | Test categories |
| Practice | Test Taking | `app/practice/test/[category].tsx` | Take test |
| Documents | Documents Home | `app/documents/index.tsx` | Document overview |
| Documents | Application Docs | `app/documents/application.tsx` | App phase checklist |
| Documents | Exam Docs | `app/documents/exam.tsx` | Exam phase checklist |
| Settings | Settings | `app/settings/index.tsx` | Language, preferences |

---

## 10. Data Flow Specifications

### 10.1 Job Data Flow

```
[Python Scraper] → [Supabase Database] → [Frontend API] → [User]
   (Server-side)     (Cloud)              (Real-time queries)
```

### 10.2 Practice Test Flow

```
[User selects topic] → [Edge Function] → [LLM API] → [Edge Function] → [User]
                       (validate)        (AI Generate)   (transform)      (display)
```

### 10.3 Offline Support
- Jobs data: Cached with SWR, refresh on pull
- Opened notice: the job row, eligibility, documents and resources are stored per notice and
  painted before the network answers; a failed refresh keeps the saved copy and says so
- Practice tests: Pre-loaded bank + last fetched
- Language preference: AsyncStorage persistence

### 10.4 Official PDF enrichment
- The FreeJobAlert article is read first. If it says `As Per the Advertisement`, omits the age,
  or lacks pay, the linked GPSC/OJAS/GSSSB notification PDF is downloaded and its text extracted
  with Poppler's `pdftotext -layout`.
- Only a numeric age plus a valid qualification become a `job_details` row; a pay fill only
  replaces a null. Scanned, Gujarati-font-encoded, silent or robots-disallowed PDFs are skipped,
  never guessed.
- The pass runs monthly (`PDF Enrichment`) and can be dispatched manually; the daily listing run
  stays unchanged and does not require Poppler.
- Coverage after the 19 Nov 2026 backfill: 55/87 eligibility rows (50 with a numeric age and
  usable qualification) and 83/87 pay. The daily scraper keeps adding notices; the live project
  at the time of writing is 60/95, 53 usable and 90/95 pay.

---

## 11. Coding Standards

### 11.1 Before Marking Task Complete
- [ ] Code compiles without TypeScript errors
- [ ] All imports are verified
- [ ] NativeWind styles applied correctly (no StyleSheet)
- [ ] Language toggle functional
- [ ] Parameterized queries used (Supabase client methods)

### 11.2 Custom Scripts Usage
| Script | Command | When to Use |
|--------|---------|-------------|
| App Restart | `./scripts/start-clean.sh` | UI bugs, styling issues, module errors |
| Database Sync | `./scripts/sync-db.sh` | After `supabase_schema.sql` changes |
| Scraper Test | `./scripts/test-scraper.sh` | After modifying Python scraping logic |

---

## 12. Security Requirements

- **Supabase:** Use parameterized queries only
- **API Keys:** Store in environment variables, access via Edge Functions only
- **Service Role Key:** Never expose in frontend code
- **User Data:** Minimal collection, local-first for preferences
- **Web deployment:** CSP (self, Supabase-only connect), `nosniff`, a strict referrer policy,
  frame denial, a permissions policy that disables camera/microphone/geolocation/payment, COOP
  and HSTS. Both `vercel.json` and `public/_headers` carry them.
- **Outbound links and notification paths** are validated before use; see `SECURITY.md`

---

## 13. Accessibility Requirements

- Minimum touch target: 48x48dp
- Color contrast ratio: 4.5:1 minimum
- Font scaling: Support system font size preferences
- Screen reader: Proper labels and accessibility hints
- Web: `<html lang>` follows the selected language; headings are level 1 for the screen title
  and level 2 for sections

---

## 14. Document Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-22 | Initial PRD created |
| 1.1 | 2026-04-22 | Updated with current codebase structure |
| 1.2 | 2026-11-05 | Hindi added; LLM switched to DeepSeek V4.1 Flash (Command Code) behind the `generate-test` Edge Function; offline-first jobs/tests; eligibility & document checklists built |
| 1.3 | 2026-11-18 | Home education shortcuts and education filter; job location; study-material surface backed by a GSSSB/GPSSB resource scraper; locale-aware number/date formatting for English, Gujarati and Hindi |
| 1.4 | 2026-11-19 | Share-a-notice, source attribution, list freshness, crash and not-found recovery screens, HTML-entity decoding for scraped text, web metadata and SPA rewrites |
| 1.5 | 2026-11-19 | Per-notice deadline reminders (09:00, three days before, with a next-morning fallback), the `/reminders` list, and notification taps that open the notice or document checklist |
| 1.6 | 2026-11-19 | Per-notice offline cache: an opened notice (facts, eligibility, documents, resources) stays readable without a connection; network failure and "no such row" are now distinct results |
| 1.7 | 2026-11-19 | Long official requirements are clamped to five lines with a "Show full text" control; the full wording stays in the accessible label |
| 1.8 | 2026-11-19 | Production web headers (CSP, nosniff, referrer, frame denial, permissions, COOP, HSTS), CI config/header/bundle-size guards, a non-breaking audit fix, and `SECURITY.md` |
| 1.9 | 2026-11-19 | A closed notice no longer offers Apply: the sticky action becomes a closed explanation with a secondary official link |
| 2.0 | 2026-11-19 | Official-notification PDF enrichment in the Rust scraper (monthly workflow), a validated hosted backfill, and coverage raised from 46% to 63% eligibility and 79% to 95% pay |

---

*This PRD serves as the guiding document for the Rojgar Mitra application development.*