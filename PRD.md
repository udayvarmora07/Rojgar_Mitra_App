# Rojgar Mitra - Product Requirements Document

## 1. Project Overview

### Project Name
Rojgar Mitra (Employment Friend)

### Core Functionality
Mobile application that aggregates and displays Gujarat government job postings from multiple official sources, featuring AI-powered practice tests and multi-language support (English, Gujarati, Hindi) for rural users with low technical literacy.

### Target Users
- Rural Gujarat youth seeking government employment
- Farmers looking for supplementary income opportunities
- Users with low technical literacy - needs simple, high-contrast UI

## 2. UI/UX Specification

### Screen Structure

#### Tab Navigation (Bottom tabs - 5 tabs)
1. **Home** - Dashboard with latest jobs and quick links
2. **Jobs** - Full job listing with search/filter
3. **Practice** - AI-powered practice tests
4. **Resources** - Study materials and links
5. **Settings** - Language, notifications, about

#### Screen Hierarchy
```
TabNavigator
├── HomeStack
│   └── HomeScreen
│       └── JobDetailScreen (/job/:id)
├── JobsStack
│   └── JobsListScreen
│       └── JobDetailScreen (/job/:id)
├── PracticeStack
│   └── PracticeHomeScreen
│       ├── TestTypeSelectScreen
│       └── TestTakingScreen
├── ResourcesStack
│   └── ResourcesListScreen
│       └── ResourceDetailScreen (/resources/:id)
└── SettingsStack
    └── SettingsScreen
```

### Visual Design

#### Color Palette
- **Primary:** #1E40AF (Deep Blue - trust, government)
- **Secondary:** #059669 (Green - growth, opportunity)
- **Accent:** #F59E0B (Amber - attention, highlights)
- **Background:** #FFFFFF (White)
- **Surface:** #F3F4F6 (Light Gray)
- **Text Primary:** #111827 (Near Black)
- **Text Secondary:** #6B7280 (Gray)
- **Error:** #DC2626 (Red)
- **Success:** #16A34A (Green)

#### Typography
- **Font Family:** System default (San Francisco on iOS, Roboto on Android)
- **Heading 1:** 32px, Bold (Screen titles)
- **Heading 2:** 24px, SemiBold (Section headers)
- **Heading 3:** 20px, Medium (Card titles)
- **Body Large:** 18px, Regular (Primary content)
- **Body:** 16px, Regular (Secondary content)
- **Caption:** 14px, Regular (Metadata, dates)

#### Spacing System (8pt grid)
- **xs:** 4px
- **sm:** 8px
- **md:** 16px
- **lg:** 24px
- **xl:** 32px
- **xxl:** 48px

#### Component States
- **Default:** Normal appearance
- **Pressed:** Opacity 0.8 or background darken
- **Disabled:** Opacity 0.5, non-interactive
- **Loading:** Skeleton or spinner

### Features & Interactions

#### Home Screen
- Welcome message with user's selected language
- "Latest Jobs" horizontal scroll (max 10 jobs)
- "View All" button to Jobs tab
- Quick links grid (4 items): Latest Jobs, Practice Tests, Resources, Settings
- Recent resources list (max 5)

#### Jobs List Screen
- Search bar (filters by title, organization)
- Filter chips: All, Government, Private, Freshers
- Job cards showing: Title, Organization, Location, Deadline, Source badge
- Pull-to-refresh
- Pagination (20 jobs per page)
- Empty state: "No jobs found" message

#### Job Detail Screen
- Full job information layout
- Sections: Header, Details, Requirements, How to Apply
- "Apply Now" button (opens external link)
- Share button (native share sheet)
- Language toggle

#### Practice Tests Screen
- Test type selection (General Knowledge, Math, Reasoning, English, Gujarati/Hindi)
- Generate test button (calls AI endpoint)
- List of recent tests with scores
- Test taking interface:
  - Question display (one at a time)
  - 4 options as buttons
  - Submit/Next buttons
  - Progress indicator
- Results screen with score and explanations

#### Settings Screen
- Language selector (English, Gujarati, Hindi)
- Notification toggle
- About section (version, links)
- Clear cache button

### Data Handling

#### Local Storage (AsyncStorage)
- User language preference
- Cached jobs data (24-hour TTL)
- Test results history

#### API Integration (Supabase)
- Jobs table (read)
- Resources table (read)
- Practice tests (read/write for user progress)
- AI generated content (write)

#### State Management
- React Context for global state (language, user)
- Local state for component-specific data

### Error Handling
- Network error: Show retry button with message
- Empty data: Show appropriate empty state
- Loading: Show skeleton loaders
- Form validation: Inline error messages

## 3. Technical Specification

### Required Packages
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~4.0.0",
    "nativewind": "^4.0.36",
    "@supabase/supabase-js": "^2.39.0",
    "i18next": "^23.10.0",
    "react-i18next": "^14.1.0",
    "@react-native-async-storage/async-storage": "1.23.1"
  }
}
```

### Project Structure
```
app/
├── _layout.tsx          # Root layout with providers
├── index.tsx            # Home screen
├── job/
│   └── [id].tsx         # Job detail screen
├── jobs/
│   └── index.tsx        # Jobs list screen
├── practice/
│   └── index.tsx        # Practice tests screen
├── resources/
│   └── [id].tsx         # Resource detail screen
└── settings/
    └── index.tsx        # Settings screen

lib/
├── supabase.ts          # Supabase client
├── i18n.ts              # i18n configuration
└── database.types.ts    # TypeScript types

scraper/
├── scraper.py           # Python scraper
└── requirements.txt     # Python dependencies
```

### Database Schema (Supabase)

#### jobs
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Job title |
| organization | text | Hiring organization |
| location | text | Job location |
| salary_min | integer | Minimum salary |
| salary_max | integer | Maximum salary |
| job_type | text | full-time/part-time/contract |
| description | text | Full job description |
| requirements | text[] | Array of requirements |
| deadline | date | Application deadline |
| apply_link | text | External apply URL |
| source | text | Source website name |
| source_url | text | Source URL |
| language | enum | 'en', 'gu', 'hi' |
| created_at | timestamp | Record creation time |
| updated_at | timestamp | Last update time |

#### resources
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Resource title |
| description | text | Resource description |
| category | text | Category name |
| url | text | Resource URL |
| language | enum | 'en', 'gu', 'hi' |
| created_at | timestamp | Record creation time |

#### practice_tests
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Test title |
| description | text | Test description |
| questions | jsonb | Array of question objects |
| language | enum | 'en', 'gu', 'hi' |
| created_at | timestamp | Record creation time |

#### user_progress
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | text | User identifier |
| test_id | uuid | Reference to practice_tests |
| score | integer | User's score |
| answers | jsonb | User's answers |
| completed_at | timestamp | Completion time |
| created_at | timestamp | Record creation time |

### API Endpoints (Supabase RPC)

#### generate_practice_test
- Input: test_type (text), language (text), count (integer)
- Output: practice_test object
- Logic: Call AI to generate questions, store in database

### Asset Requirements
- App icon (1024x1024 for app store)
- No custom fonts (use system fonts)
- No external images (use text/shapes/icons only for simplicity)
