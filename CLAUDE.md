# Project Core
- **App:** Gujarat Govt Jobs Aggregator.
- **Audience:** Farmers, rural youth, low technical literacy.
- **Tech Stack:** React Native (Expo), NativeWind, Supabase (PostgreSQL), Python (BeautifulSoup).

# UI/UX & Localization Rules
- **Simplicity:** UIs must be extremely simple, high contrast, and use large typography.
- **Language:** Default components to support both English and Gujarati. 
- **Styling:** Strictly use NativeWind.

# Coding Standards & Workflow
- **Expo Router:** Use file-based routing exclusively (`app/` directory).
- **Supabase:** Always use parameterized queries. Never expose the Service Role Key.
- **Testing:** Always run `npx tsc` (if using TypeScript) or verify imports before finishing a task.

# Setup & Commands
- **App Start:** `npx expo start -c`
- **DB Sync:** `npx supabase db push`

Language: The app must support three languages: English, Gujarati, and Hindi. Implement a localization system (i18next). Default components should adapt to the user's selected language.
# currentDate
Todayʼs date is 2026-04-23.
