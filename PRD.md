# Rojgar Mitra - Product Requirements Document (PRD)

## 1. Project Overview

**Project Name:** Rojgar Mitra (રોજગાર મિત્ર)  
**Project Type:** Mobile Application (Android)

**Core Functionality:** A Gujarat Government Jobs Aggregator designed to help farmers and rural youth discover government employment opportunities, understand eligibility criteria, access free AI-generated practice tests, and find application/exam center information.

**Target Audience:**
- Farmers and rural youth in Gujarat
- Users with low technical literacy
- Users who may struggle with complex English terms

---

## 2. Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React Native (Expo) | Mobile app development |
| Styling | NativeWind (Tailwind CSS) | UI styling |
| Backend/Database | Supabase (PostgreSQL) | Data storage and authentication |
| Web Scraping | Python (BeautifulSoup/Requests) | Job data aggregation |
| AI Integration | MiniMax m2.7 API | Practice test generation |

---

## 3. UI/UX & Localization Rules

### 3.1 Design Principles
- **Simplicity:** Extremely simple interfaces with minimal complexity
- **High Contrast:** Dark text on light backgrounds, large touch targets
- **Large Typography:** Minimum 18sp font size for body text
- **No Complex Gestures:** Simple taps only, no swipes or long-presses

### 3.2 Localization
- **Default Language:** Support both English and Gujarati
- **Language Switcher:** Prominent toggle in header for English ↔ Gujarati
- **Simple Terminology:** Avoid complex English terms, use plain Gujarati phrases

---

## 4. Core User Flows

### 4.1 Job Browsing Flow

```
[Home Screen]
    │
    ├── View Job Categories (by department, education level, location)
    │
    ├── Browse Job List
    │   - Job title, organization, last date to apply
    │   - Filter by: Category, District, Education, Salary Range
    │
    └── Select Job → View Job Details
        - Full description, eligibility, important dates
        - Direct link to official application (if available)
```

### 4.2 Eligibility Checking Flow

```
[Job Details Screen]
    │
    ├── View eligibility requirements:
    │   - Education qualification
    │   - Age limit
    │   - Category restrictions
    │   - Experience requirements
    │
    └── Self-Check Checklist:
        - Interactive checklist to help users determine if they qualify
        - Clear YES/NO indicators
        - Simple explanations in Gujarati
```

### 4.3 Language Switching Flow

```
[Any Screen]
    │
    └── Tap Language Toggle (Header)
        - Instantly switches all UI text
        - Persists preference locally
        - Jobs and content remain the same
```

---

## 5. Feature Specifications

### 5.1 Home Screen
- Welcome message in user's selected language
- Quick access to latest jobs (last 10 posted)
- Category shortcuts (Education Jobs, Police Jobs, Bank Jobs, etc.)
- Language toggle prominently displayed

### 5.2 Job Listing Screen
- Scrollable list of jobs with:
  - Job title (bold, large text)
  - Organization name
  - District/Location
  - Last date to apply (highlighted in red if soon)
  - Qualification required
- Filter options: Category, District, Education Level
- Pull-to-refresh functionality
- "No results" state with helpful message

### 5.3 Job Details Screen
- Full job information:
  - Title, Organization, Location
  - Complete eligibility criteria
  - Important dates (start date, end date, exam date)
  - Application fee
  - Selection process
- Action buttons:
  - "Check My Eligibility" (links to eligibility checklist)
  - "Find Exam Center" (links to exam center finder)
  - "Start Practice Test" (links to AI-generated tests)
  - "Official Website" (external link)

### 5.4 Eligibility Checker Screen
- Interactive checklist with YES/NO toggles:
  - ✅ Do you have required qualification?
  - ✅ Are you within age limit?
  - ✅ Is your category eligible?
  - ✅ Do you have required documents?
- Final result: "You may be eligible" / "You may not be eligible"
- Clear next steps for each result

### 5.5 Document Checklist Screen

**Application Documents:**
- [ ] Aadhaar Card
- [ ] Education Certificates (10th, 12th, Graduate - as required)
- [ ] Category Certificate (if applicable: SC/ST/OBC)
- [ ] Domicile Certificate (Gujarat)
- [ ] Passport Photo
- [ ] Signature
- [ ] Mobile Number (linked to Aadhaar)
- [ ] Email ID
- [ ] Bank Account Details

**Exam Center Documents:**
- [ ] Admit Card (Hall Ticket)
- [ ] Aadhaar Card
- [ ] Passport Photo (same as application)
- [ ] Ballpoint Pen (Blue/Black)
- [ ] Water Bottle (transparent)

**Features:**
- Downloadable/Printable checklist option
- Mark items as "Ready" / "Not Ready"
- Reminder feature for pending documents

### 5.6 Practice Tests Screen (AI Integration)

**Test Generation:**
- Uses MiniMax m2.7 API for AI-generated questions
- Questions in simple Gujarati phrasing
- JSON output format for parsing

**Test Categories:**
- General Knowledge (સામાન્ય જ્ઞાન)
- Mathematics (ગણિત)
- Gujarati Language (ગુજરાતી ભાષા)
- English Basics (અંગ્રેજી પાયાનું)
- Current Affairs (વર્તમાન બાબતો)

**Test Features:**
- Multiple choice questions (4 options)
- Timer option (optional)
- Immediate results with explanations
- Store test history locally
- "Generate New Test" button

---

## 6. MiniMax m2.7 API Integration Plan

### 6.1 API Overview
- **Endpoint:** MiniMax m2.7 API (to be configured)
- **Purpose:** Generate practice test questions on-demand
- **Output Format:** Valid, parseable JSON

### 6.2 Prompt Template

```json
{
  "prompt": "Generate 10 multiple choice questions for [TOPIC] in simple Gujarati. Each question should have 4 options (A, B, C, D). Output ONLY valid JSON in this format:\n{\n  \"questions\": [\n    {\n      \"question\": \"question text\",\n      \"options\": {\n        \"A\": \"option A\",\n        \"B\": \"option B\",\n        \"C\": \"option C\",\n        \"D\": \"option D\"\n      },\n      \"correct\": \"A\",\n      \"explanation\": \"brief explanation in Gujarati\"\n    }\n  ]\n}\nNo additional text. Only JSON.",
  "temperature": 0.7,
  "max_tokens": 2000
}
```

### 6.3 Integration Architecture

```
[Frontend] → [Supabase Edge Function] → [MiniMax API]
                │
                └── Validate & Transform response
                └── Store cached questions (optional)
```

### 6.4 Fallback Strategy
- Pre-loaded question bank for offline access
- Cache last fetched questions locally
- Graceful degradation if API unavailable

---

## 7. Database Schema Overview

### 7.1 Tables (to be defined in supabase_schema.sql)

| Table | Purpose |
|-------|---------|
| jobs | Job postings scraped from various sources |
| categories | Job categories/departments |
| districts | Gujarat districts for location filtering |
| user_preferences | Language preference, saved jobs |
| test_history | Practice test scores and history |
| cached_questions | AI-generated questions cache |

---

## 8. File & Directory Structure

### 8.1 Expo Router File-Based Routing Structure

```
Rojgar_Mitra_App/
├── app/
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Home screen
│   ├── jobs/
│   │   ├── _layout.tsx          # Jobs tab layout
│   │   ├── index.tsx            # Job listing screen
│   │   └── [id].tsx             # Job details screen
│   ├── eligibility/
│   │   ├── _layout.tsx          # Eligibility tab layout
│   │   ├── index.tsx            # Eligibility checker home
│   │   └── [jobId].tsx          # Eligibility checklist for specific job
│   ├── practice/
│   │   ├── _layout.tsx          # Practice tests tab layout
│   │   ├── index.tsx            # Practice test categories
│   │   └── test/
│   │       └── [category].tsx   # Test taking screen
│   ├── documents/
│   │   ├── _layout.tsx          # Documents tab layout
│   │   ├── index.tsx            # Document checklist home
│   │   ├── application.tsx      # Application documents checklist
│   │   └── exam.tsx             # Exam center documents checklist
│   └── settings/
│       └── index.tsx            # Settings (language, etc.)
├── components/
│   ├── ui/                      # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   ├── LanguageToggle.tsx
│   │   └── Checkbox.tsx
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   ├── JobList.tsx
│   │   └── FilterModal.tsx
│   └── practice/
│       ├── QuestionCard.tsx
│       ├── TestResult.tsx
│       └── Timer.tsx
├── context/
│   ├── LanguageContext.tsx      # Language state management
│   └── AuthContext.tsx           # Supabase auth context
├── hooks/
│   ├── useJobs.ts               # Job fetching hook
│   ├── useLanguage.ts           # Language switching hook
│   └── usePracticeTest.ts       # AI test generation hook
├── lib/
│   ├── supabase.ts              # Supabase client setup
│   ├── minimax.ts               # MiniMax API client
│   └── translations.ts          # English/Gujarati translations
├── types/
│   ├── jobs.ts                  # Job type definitions
│   ├── questions.ts             # Practice test types
│   └── documents.ts             # Document checklist types
├── constants/
│   ├── categories.ts            # Job categories data
│   └── districts.ts             # Gujarat districts data
├── scripts/                      # Custom scripts (dev only)
│   ├── start-clean.sh
│   ├── sync-db.sh
│   └── test-scraper.sh
├── supabase/
│   ├── functions/               # Supabase Edge Functions
│   │   └── generate-test/       # AI test generation function
│   │       └── index.ts
│   └── supabase_schema.sql      # Database schema
├── scraping/
│   ├── scraper.py               # Main scraping script
│   ├── sources/                 # Source-specific scrapers
│   └── utils.py                 # Helper functions
├── assets/
│   ├── images/                  # App images
│   └── fonts/                   # Custom fonts if needed
├── package.json
├── app.json                     # Expo config
├── tailwind.config.js           # NativeWind config
├── tsconfig.json
└── PRD.md                       # This document
```

### 8.2 File Naming Conventions
- **Screens:** `camelCase.tsx` (e.g., `jobDetails.tsx`)
- **Components:** `PascalCase.tsx` (e.g., `JobCard.tsx`)
- **Hooks:** `camelCase.ts` (e.g., `useJobs.ts`)
- **Utilities:** `camelCase.ts` (e.g., `supabase.ts`)

---

## 9. Screen Specifications

### 9.1 Tab Navigation Structure

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│     Home        │     Jobs        │    Practice     │    Settings     │
│     (घर)        │    (નોકરીઓ)     │    (અભ્યાસ)     │   (સેટિંગ્સ)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

### 9.2 Screen Hierarchy

| Tab | Screen | Purpose |
|-----|--------|---------|
| Home | HomeScreen | Welcome, quick links, latest jobs |
| Jobs | JobListScreen | Browse all jobs |
| Jobs | JobDetailsScreen | Full job information |
| Practice | PracticeHomeScreen | Test categories |
| Practice | TestTakingScreen | Take AI-generated test |
| Practice | TestResultScreen | View test results |
| Settings | SettingsScreen | Language toggle, preferences |
| - | EligibilityCheckerScreen | Check job eligibility |
| - | DocumentChecklistScreen | Application/Exam documents |

---

## 10. Data Flow Specifications

### 10.1 Job Data Flow

```
[Python Scraper] → [Supabase Database] → [Frontend API Calls] → [User]
     (Server-side)    (Cloud)            (Real-time queries)
```

### 10.2 Practice Test Flow

```
[User selects topic] → [Edge Function] → [MiniMax API] → [Edge Function] → [User]
                       (Validate)        (AI Generate)   (Transform)      (Display)
```

### 10.3 Offline Support
- Jobs data: Cached with SWR, refresh on app open
- Practice tests: Pre-loaded bank + last fetched questions
- Language preference: Local storage persistence

---

## 11. Localization Implementation

### 11.1 Translation Structure

```typescript
// lib/translations.ts
export const translations = {
  en: {
    home: "Home",
    jobs: "Jobs",
    practice: "Practice",
    settings: "Settings",
    lastDate: "Last Date to Apply",
    eligibility: "Eligibility",
    // ... more translations
  },
  gu: {
    home: "ઘર",
    jobs: "નોકરીઓ",
    practice: "અભ્યાસ",
    settings: "સેટિંગ્સ",
    lastDate: "અરજીની છેલ્લી તારીખ",
    eligibility: "પાત્રતા",
    // ... more translations
  }
};
```

### 11.2 Language Switching
- Use React Context for global language state
- All user-facing strings come from translation system
- Job content remains in original language (scraped)

---

## 12. Testing & Quality Requirements

### 12.1 Before Marking Task Complete
- [ ] Code compiles without errors
- [ ] All imports are present
- [ ] NativeWind styles applied correctly
- [ ] Language toggle functional
- [ ] No TypeScript errors

### 12.2 Custom Scripts Usage
- **App Restart:** `./scripts/start-clean.sh` - Use when UI bugs, styling issues, or module errors
- **Database Sync:** `./scripts/sync-db.sh` - Run after any `supabase_schema.sql` changes
- **Scraper Test:** `./scripts/test-scraper.sh` - Run after modifying Python scraping logic

---

## 13. Security Requirements

- **Supabase:** Use parameterized queries only, never expose Service Role Key in frontend
- **API Keys:** Store in environment variables, access via Edge Functions
- **User Data:** Minimal collection, local-first approach for preferences

---

## 14. Accessibility Requirements

- Minimum touch target size: 48x48dp
- Color contrast ratio: 4.5:1 minimum
- Font scaling: Support system font size preferences
- Screen reader support: Proper labels and accessibility hints

---

## 15. Future Considerations (Out of Scope for MVP)

- User authentication and saved jobs
- Push notifications for new jobs
- Offline job browsing
- Job application tracking
- Community discussion forums

---

## 16. Document Version

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-22 | Initial PRD created |

---

*This PRD serves as the guiding document for the Rojgar Mitra application development.*