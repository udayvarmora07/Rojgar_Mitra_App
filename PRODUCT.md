# Rojgar Mitra

<!-- impeccable:product-schema 1 -->

Product truth for Rojgar Mitra. This file owns the audience, the jobs they are doing, and the
constraints future work must preserve. `DESIGN.md` owns the visual system — the world, tokens,
component grammar, screen composition, motion, accessibility gates and reference evidence.
`PRD.md` owns requirements; `I18N.md` the localization contract; `HANDOFF.md` current state.

---

## Platform

Adaptive

Expo SDK 54 / React Native 0.81 ships iOS and Android; the web build is a preview and the E2E
surface. The design is phone-first, constrained to a 600px column on wide screens, and adapts
its design language per OS while keeping one visual identity.

---

## Users

Farmers and rural youth in Gujarat looking for state government jobs. Many read Gujarati more
comfortably than English; some read with difficulty. Phones are mid-range Android, often
shared, often on limited data, frequently used outdoors in bright sun.

Three consequences drive every decision:

1. **The text is not decoration — it is the product.** A job title, a last date and a
   qualification are the whole value. Anything that shrinks, greys out or crowds that text is a
   regression, however good it looks in a screenshot.
2. **Glanceability beats density.** The user is scanning many advertisements to find the few
   they can apply to. Each card must answer three questions instantly: *what is the post, who
   is it for, and can I still apply?*
3. **Legibility in sunlight is a hard constraint.** High contrast is not an accessibility
   checkbox here; it is whether the app works at a bus stop at noon.

Two secondary audiences are real but are not design drivers: a first-time smartphone user being
helped by a family member, and anyone checking whether one specific department has an open post.

---

## Product Purpose

Rojgar Mitra aggregates Gujarat government job advertisements from official sources and turns
each one into something a reader can act on: what the post is, who may apply, when it closes,
which documents are needed, and whether they are ready.

Success means a reader who cannot read a dense official PDF still knows, from one screen,
whether a notice is worth their data and their time.

---

## Positioning

Most Gujarat job boards are search results. Rojgar Mitra is a notice ledger: every
advertisement arrives with its deadline, the minimum education it accepts, and the documents it
demands, in Gujarati, Hindi or English. A reader never has to open the official PDF to decide
whether it is worth their data.

The mechanism a neighbouring product could not truthfully copy is the derivation itself:
`jobs.education_level` is computed from the advertisement's raw qualification text by a
database trigger, and eligibility is answered from stored facts rather than from a reader's
interpretation of prose.

---

## Operating Context

- **Discovery happens by scanning, not searching.** A reader opens the app most days, looks at
  what is open, and checks the deadline. Filters are used for one dimension at a time —
  usually education level or department.
- **Applications happen outside the app.** The app sends the reader to the official website and
  must never imply it can submit an application.
- **Exam preparation is the second job.** Practice tests are taken in short sittings, often
  without reliable connectivity, sometimes on a phone another family member also uses.
- **Documents are tracked across weeks.** Two phases are real: applying (before the deadline)
  and exam day. A reminder may be scheduled, but it is always local to the device.
- **The terminology is official Gujarati/English, not startup plain-English.** "Advertisement
  number", "last date" and "qualification" are the words the reader already meets on paper.

---

## Capabilities and Constraints

Confirmed functionality:

- Aggregation of live advertisements from OJAS, GPSC and FreeJobAlert (the last supplies
  vacancies, qualification and advertisement number). Sources that answer automated fetches
  with a CAPTCHA wall are deliberately not scraped.
- A six-level education taxonomy (`10th`, `12th`, `ITI`, `Diploma`, `Graduate`, `PostGraduate`)
  derived from qualification text; the app never parses free text itself.
- Job location, category shortcuts, and search across title, department, qualification,
  education level and location.
- Eligibility answered from four yes/no questions, producing a verdict and next steps.
- A two-phase document checklist with a local notification reminder while items are pending.
- **An application guide** transcribing the official OJAS order, with the
  registration-is-not-an-application trap marked and the exact photo/signature upload limits.
- **Local application tracking**: mark a notice applied, keep its confirmation number, and see
  the reader's own list including notices whose deadline has passed.
- **"New since your last visit"**: the count of notices that appeared since the previous
  session, so a daily reader does not re-scan the whole list.
- Practice tests over six topics in three languages. The question pool is read first, AI
  generation second, cache third, an offline bank last.
- Study material: practice links, official PDFs, videos and official websites.
- English, Gujarati and Hindi throughout, with the language control first in Settings.

Technical constraints:

- The backend is Supabase (Postgres + PostgREST + Edge Functions); RLS is on and anon writes
  are rejected. There is no custom server.
- `generate-test` runs on Deno; the daily pool generator is Python. Question text is capped
  (160 characters per question, 70 per option, 120 per explanation) because a longer question
  does not fit the card.
- Provider keys live in Supabase secrets, never behind an `EXPO_PUBLIC_` prefix.
- Two scrapers exist: Rust (production) and Python (legacy parity).

Explicitly undecided:

- Native iOS has not been run on a device or simulator. The code ships; the rendering is
  unverified.
- Sounds, haptics and celebratory feedback. None exist and none were requested.
- Accounts, sync or multi-device state. Everything personal is local to one device.

---

## Brand Commitments

The name **Rojgar Mitra** (રોજગાર મિત્ર) and the RM monogram are fixed. The voice is
plain-spoken, official and unhurried — a District Employment Office handing out a well-printed
notice, not a startup and not a SaaS dashboard. Every status is written in words; colour only
reinforces it.

The audience's cultural world is the employment-exchange notice board, the index card, the hall
ticket and the stamped official form. That world is the design source, not a costume: it
supplies the date stub, the stamp, the ruled field row and the habit of putting the status in
words. `DESIGN.md` records how far that is allowed to go.

---

## Evidence on Hand

- **94 live job advertisements** in the hosted Supabase project (`wiyryfopgjdzirndyxzp`),
  scraped from three official sources. Measured coverage on the 87 that are not expired:
  location 75, salary 69, eligibility (`job_details`) 40, education level 72, vacancies 74.
- **180 pooled practice questions**, 10–12 per topic × language pair.
- Captured competitor and design-system evidence in `design/references/`: UX4G, UMANG,
  FreeJobAlert, OJAS (CAPTCHA wall) and Naukri (Access Denied), plus before/after screenshots of
  every app screen at 390×844 **and native captures from the Android emulator**
  (`app-guide-native.png`, `app-applied-native.png`, `app-detail-eligibility-native.png`).
- No testimonials, user counts, download figures, ratings or press exist. **Future work must not
  invent any.** There is no real-user evidence beyond the owner's own testing.

---

## Product Principles

1. **The notice is the unit.** Every surface is organised around one advertisement's facts —
   what, who, until when — not around a feed, a recommendation or a profile.
2. **Answer before asking.** Show the deadline, the minimum education and the document list
   before requesting anything from the reader. Nothing is gated behind a form.
3. **Words carry meaning; colour confirms it.** A status that is only a colour is not a status.
4. **Respect the data and the device.** Reads work offline, nothing is downloaded twice, no
   motion only delays, and no feature needs a fast connection to be understood.
5. **Fail to the official source.** When data is uncertain the app says so and links out. It
   never paraphrases an official requirement in a way a reader could act on wrongly.

---

## Accessibility & Inclusion

GIGW 3.0 is the reference standard, because this is a government-service surface. Translated
into gates:

- Zero critical and zero serious axe findings on Home, Jobs, Practice and Settings. The only
  tolerated finding is the moderate `region` contributed by the tab bar.
- Body text never below 18px; touch targets never below 48dp; contrast at least 4.5:1.
- Every status is conveyed by text, not colour alone.
- Line height 1.5 on body text is required for Gujarati and Devanagari, whose glyphs carry marks
  above and below the baseline that Latin does not.
- Taps only: no swipes, no long-presses, nothing hidden behind a gesture.
- Dates are written `18 Nov 2026`, never `18/11/26`, for readers who may not parse numeric date
  order confidently.

---

## Where the record lives

- Requirements: `PRD.md`. Localization: `I18N.md`. Current state: `HANDOFF.md`.
- Visual system, tokens, components, screens and reference evidence: `DESIGN.md`.
- Tokens: `design/tokens.json` → `tailwind.config.js` and `constants/theme.ts`.
- Screens: `app/(tabs)/`, `app/job/[id].tsx`, `app/resources.tsx`,
  `app/practice/test/[category].tsx`, `app/documents/`, `app/eligibility/[jobId].tsx`.
