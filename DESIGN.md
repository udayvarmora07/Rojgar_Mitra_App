# DESIGN.md — The Employment Exchange Ledger

The durable visual record for Rojgar Mitra. `PRODUCT.md` owns product truth and audience;
this file owns how the product looks and behaves. Read both before changing UI.

---

## 1. The world

Rojgar Mitra is a Gujarat government-jobs service for farmers and rural youth with low
technical literacy. The interface is built from the visual language of the artefacts this
audience already trusts: the employment-exchange notice board, the index card, the hall
ticket, and the stamped official form.

That produces one rule: **a screen is a notice, not a web page.** Information is set in
reading order, dated at the edge, stamped when its state matters, and never buried under
decoration. The product should feel like something a District Employment Office would be
proud to hand out — plain, official, and readable at arm's length in daylight.

What the world is not: a startup dashboard, a job-board marketplace, a cream-and-serif
editorial page, a gradient hero, or a card for every sentence.

---

## 2. Reference evidence

Captured at `design/references/`; measured from published tokens where a value is quoted.

### The authority: UX4G

`ux4g.gov.in` — the Government of India design system from MeitY, built for government
services, shipping with GIGW 3.0 accessibility baked in. Captured at
`design/references/ref-www-ux4g-gov-in.png`.

| Token | Value | Measured |
|---|---|---|
| Brand purple (primary-600) | `#4A2BC2` | 8.69:1 on white |
| Neutral-900 (primary text) | `#171717` | 19.0:1 on white |
| Neutral-700 (secondary text) | `#404040` | 10.37:1 on white |
| Neutral-50 (surface) | `#FAFAFA` | — |
| Error-800 (danger text) | `#8A1A16` | 8.94:1 on error-50 |
| Success-800 | `#00522C` | 8.89:1 on success-50 |

Its guidance is explicit: *"Use Purple (#4a2bc2) on white for body text — 16.75:1"*, and
*"Don't use Saffron for body text (insufficient contrast)"*. Its card treatment is a white
surface on a near-white page, one hairline border, generous internal padding, and a soft
lavender tint for illustration areas — not gradients or glass.

**Why we follow it rather than an award-winning site:** this is a government-services app for
citizens with low digital confidence. Familiarity *is* trust. A citizen who has used UMANG or
DigiLocker should recognise the grammar of this app immediately.

### The audience's real apps: UMANG

Captured at `design/references/ref-umang-gov-in.png`. Government blue header with the emblem,
an enormous illustrated banner, four big labelled icon tiles (*Departments, Services,
Registrations, Transactions*) carrying the entire navigation, and an accessibility/ISL/language
cluster in the top bar. The lesson: **big icon-plus-label targets as primary navigation,
visible language switching, and nothing hidden behind a gesture.**

### The screen we must not become: FreeJobAlert

Captured at `design/references/ref-www-freejobalert-com.png` — the deep-scroll view of the very
listing our scraper reads. Ten columns of 12px text, colour-coded borders, no hierarchy, no
touch targets, no whitespace. It is information-rich and unusable on a phone in sunlight. It is
also our data source, which is the whole opportunity: **we present the same advertisements as
a scannable notice list that a low-literacy reader can act on.**

### The adjacent job-app grammar

The iOS job-app listing reviewed for this pass (Indeed) confirms the useful constants: a job
card leads with title and employer, one meta line carries the practical facts, and the primary
action is always visible. It also confirms what not to import: marketplace chrome, saved-search
widgets, resume funnels, and dense salary filters that this audience does not need. Our
difference is the date stub and the stamped status, which make the deadline the first thing the
eye lands on.

### Sources that failed to yield evidence

`ojas.gujarat.gov.in` serves a CAPTCHA wall to automated browsers (captured, unusable);
`naukri.com` returns "Access Denied" to this network. Recorded so the gap is honest.

### The redesign audit

The system replaced in 2026-11-18 was *consistent* — one navy, one green, one radius, 18px
body, 0 critical/serious axe findings — but not *distinctive or effortless*. What the audit of
that build found, and what replaced it:

| Finding | Evidence | Decision |
|---|---|---|
| A generic Tailwind card stack: white cards on grey, left colour border, everything the same weight | Home, Jobs, Job detail | Replace the card grammar with a notice grammar: date stub, stamp, ruled field rows |
| The live count was absent from the first viewport | Home | Put the number of open notices inside the primary action, in mono |
| Status was a rounded pill and colour did much of the work | `DeadlineBadge` | Rectangular stamp with an uppercase label and a countdown; words first |
| Department filters sprawled into a 50-chip scroller | Jobs | A searchable bottom sheet with counts and a pinned action |
| The detail screen repeated the department in the masthead and again in the card | Job detail | A `NOTICE` kicker; department lives once |
| An icon-only, above-the-fold Apply action was below three cards of facts | Job detail | A sticky Apply bar at the bottom edge |
| No data face: dates, counts and scores were set in body sans | Everywhere | A mono face for measurements only |
| The launcher icon and splash were the Expo placeholder | `assets/` | A navy notice-stamp mark: white frame, RM monogram, vermilion rule |
| Desktop stretched the phone layout across the window | Web | A 600px column, centred, with a centred tab bar |

---

## 3. Tokens

All colour values live in `design/tokens.json`. `tailwind.config.js` and `constants/theme.ts`
both read that file, so a class and an icon colour cannot drift.

### Colour

| Token | Value | Measured | Role |
|---|---|---|---|
| `navy` | `#14315B` | 12.96:1 on white; 11.88:1 on paper | Masthead, primary action, active state |
| `navy-deep` | `#0E2444` | 15.50:1 on white | Rare deep field (splash) |
| `navy-tint` | `#E8EDF6` | — | Selected surfaces, icon tiles, deadline panel |
| `navy-line` | `#C9D3E6` | 8.61:1 on navy | Hairlines and secondary text on navy |
| `ink` | `#101828` | 16.27:1 on paper | Body and headings |
| `ink-soft` | `#475467` | 7.05:1 on paper | Secondary text |
| `ink-mute` | `#667085` | 4.97:1 on white | Labels, placeholders, chevrons |
| `paper` | `#F4F5F7` | — | Page ground |
| `card` | `#FFFFFF` | — | Surfaces |
| `rule` | `#D5DAE3` | — | Hairlines and borders |
| `rule-strong` | `#AEB6C4` | — | Unselected control borders |
| `stamp` | `#9A1B12` | 8.27:1 on white | Urgency marks, danger text, the masthead rule |
| `success` | `#00522C` | 9.36:1 on white | Ready, eligible, correct |

Status surfaces (always carry a written label):

| State | Background | Border | Text |
|---|---|---|---|
| Open | `#F1FAF3` | `#A7D9B4` | `#00522C` (8.79:1) |
| Closing soon | `#FFF7F6` | `#E8B4AE` | `#9A1B12` (7.83:1) |
| Closed | `#F2F3F5` | `#D5DAE3` | `#475467` |

The vermilion `stamp` is not a second brand accent. It is functional: the 3px rule under
the masthead, a closing deadline, a destructive action. It never decorates a neutral card.

### Type

System fonts only. The app renders Latin, Gujarati, and Devanagari; platform fonts have the
best coverage and zero load cost. No webfont may replace them.

| Role | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| Display | 30px | 800 | tight | Home app name |
| Title | 24px | 800 | tight | Screen titles, section headings |
| Reading | 18px | 400–700 | 1.5 | Body, labels, form values |
| Label | 16px | 400–700 | 1.4 | Metadata, hints, button labels |
| Micro | 13px | 700 | 1.2 + 0.08em tracking | Uppercase field labels, stamps |

`Mono` (platform monospace) is reserved for **data**: dates in the stub, counts, scores,
reference numbers, percentages. It is not a "technical" costume; every use is a number a
reader may compare or copy.

Dates are written `18 Nov 2026`, never `18/11/26`. Numbers of posts and scores show their
unit (`6 posts`, `0/10`).

### Space, shape, touch

- 4px base. Page gutter 16px. Card padding 20px. Section heading: more space above than below.
- Radius scale: `card 16px`, `control 12px`, `stub 10px`, `stamp 6px`. No `rounded-full`
  except switches and the progress track, which are capsule controls.
- `borderCurve: 'continuous'` on non-capsule rounded surfaces (iOS squircle; ignored elsewhere).
- Hairline borders, no shadows. Depth comes from the white surface on `paper` and a single
  rule, not from elevation.
- Touch targets ≥ 48dp; primary actions 56dp. One notice is one tap target. The browse-list
  card adds an Apply strip as a separate sibling target, never a control nested inside it.

---

## 4. Component grammar

### Masthead
Deep navy field, safe-area top, an RM monogram in a hairline frame, a tracked kicker, the
screen title, an optional subtitle, and a compact language control. A 3px vermilion rule
closes the field. On detail screens the back control replaces the monogram row; the title
and language control stay.

### Date stub
The signature detail. A 68px tear-off edge on every job card: month, a 30px day numeral,
year. The surface is navy-tinted when open, closing-tinted when urgent, grey when closed.
The stub is decorative reinforcement; the card's accessibility label carries the full date.

### Stamp
A rectangular status mark with a 6px radius, uppercase tracked label, and optional detail
("3 days left", "0 of 9"). It is the only pill-like element allowed, and it is never a
button. Status is always words first.

### Job card
Left date stub, then title (20px bold), department, one meta line (posts · qualification ·
salary), then a "Last Date" label and the status stamp. Chevron at the trailing edge. The
notice block is one press target; no control is nested inside it.

On the Jobs list the card closes with a ruled action strip: an open glyph, a label that names
the destination (`Apply on Official Website`, `Open Application Form`, `Open Official
Notification`, or `Read the Full Notice` for the third-party summary), and an arrow. It is a
sibling press target below the notice, so a screen reader can reach it on iOS, and it is hidden
for a closed notice. Home's preview cards keep the single target, because Home is for scanning
and the list is for acting.

### Category board
One white card, not six floating cards: a two-column grid of education levels that have open
notices, each with a written count, closed by a full-width "All departments" row. Hairlines
separate the cells; an odd final level spans both columns. The card is a catalogue, not a
badge wall.

### Study-material row
A 76dp row in a grouped card: type icon tile, title (18px bold), optional description and
optional job source, then a chevron (practice) or an open glyph (external). The group heading
already names the type, so the row does not repeat it; the accessible name still does.

### Action card
Home's primary action is a filled navy card with a live count in mono and the count label
under it (e.g. `94` / `OPEN NOTICES`). The two peer actions are white cards with an icon
tile, title, hint, and chevron. Widths are `flex-1 basis-0 min-w-0` so translations cannot
push one wider.

### Reminder row
One ruled card: a bell tile, `Document reminders`, a hint, and a capsule switch. When the
reminder is on and documents are pending, a ruled footer states the time in the reader's
locale. A blocked permission is its own ruled footer with `Open phone settings`; a platform
without local notifications keeps the row disabled and says so. The switch is never left
looking on when the OS would not deliver anything.

### Deadline reminder

One card on a notice: bell tile, `Deadline reminder`, and one line of state. Before it is set,
the action names the date (`Remind me on 13 Dec 2026`); after it is set, the line names the
date and time and the action becomes `Remove reminder`. The card turns open-green only when a
reminder is actually scheduled with permission granted. A blocked permission replaces the
action with `Open phone settings`; a notice with no useful morning left says so and offers no
control. `/reminders` repeats the same facts in one row per notice, with removal as a sibling
strip below the notice target.

### Freshness line

One quiet line under the masthead on Home and Jobs: a clock glyph and `Checked just now`,
`Checked 12 min ago`, `Checked today`, `Checked yesterday`, or `Checked on 15 Nov 2026`. It comes
from the cache timestamp, so it is honest while offline. It is 16px `ink-mute`; it never becomes
a badge and never pushes the first action below the fold.

### Source and share

The job-detail NOTICE block carries a 48dp share control in its top row and one `Source:
freejobalert.com` line under the deadline panel. The source is a hostname, not a raw URL, and is
omitted when the link is not safe HTTP(S). Sharing sends only facts already on the notice: title,
department, last date, source link and the official-notice warning. The confirmation (`Link
copied...`) is a live region and clears itself after five seconds.

### Recovery screens

A render error shows a navy card, the sentence that the saved jobs are still on the phone, and
Retry / Go to Home. A wrong URL shows the same frame with `Page not found` and one way home.
Neither screen uses the safe-area context, because either can be rendered in place of the root
layout.

### Section heading

Title + optional mono count + optional single action, closed by a 1px rule. No eyebrow
above it; the heading carries its own weight.

### Segmented control
A ruled track with 8px inner segments; the selected segment is filled navy. Used for the
deadline filter only. Department selection is a bottom sheet, not a chip scroller.

### Bottom sheet
Native-modal pattern: dimmed backdrop, rounded top, a handle, a title, and a pinned footer.
The footer keeps "Show N jobs" and "Clear filters" visible above a long list.

### Fact row
Micro uppercase label above an 18px value, separated by hairlines. Replaces the old
icon-plus-label stack; long values (qualification, advert number) get the full width. A value
over 240 characters is clamped to five lines with a 48dp `Show full text` control; the full
wording stays in the tree and in the accessible label, and the control announces `expanded`.
Nothing official is paraphrased or dropped.

### Checklist row
A square checkbox, title, description, and a written Ready / Not Ready state. Ready rows
tint open-green; the checkbox is a shape, not the only signal.

### Test option
A 64dp row with a square letter tile and the option text. Idle = hairline; selected = navy
tint and navy border; correct = open surface; wrong = closing surface. Review mode keeps
the correct answer and explanation in a green panel.

### Progress
A 2px capsule track. `primary` (navy) on light surfaces, `accent` (green) for completion,
`onDark` (white on 25% white) inside the navy masthead. Label + `%` in mono.

### States
Loading is a still skeleton of the list, not a spinner. Empty states explain why and offer
the next action. Refetch errors keep cached content and add a labelled notice with retry.
No shimmer, no full-screen spinner between states.

### Tab bar
White, hairline top, 24px icons, 13px bold labels. The active tab gets a 3px vermilion mark
above a filled icon; inactive tabs are `ink-mute` outlines. The bar is centred at 600px on web.

---

## 5. Screen composition

- **Home** — masthead → freshness line → "What do you want to do?" → live primary jobs action →
  Practice and Documents peers → "Browse by category" index card (education levels with counts,
  then all departments) → "Latest Jobs" with View all → one-line official-notice footnote.
- **Jobs** — masthead with search → deadline segment + Filters → summary line (education ·
  department) → freshness line → "Sorted by last date" / clear → job cards. The filter sheet
  carries education levels first, then the searchable department list with counts.
- **Job detail** — masthead → NOTICE block with title, share control, deadline panel and source
  → facts (including Location) → eligibility → documents → deadline reminder → Study material
  → practice CTA → lexically last, a sticky Apply bar. A cached copy paints first; when the
  refresh fails, an offline banner and the freshness line sit above the notice instead of a
  failure screen. After the last date the sticky bar becomes the closed sentence plus a
  secondary `Open the official notice`; it never offers an application that cannot be made.
- **Deadline reminders** — masthead → one row per scheduled notice (title, last date, reminder
  date and time) with a remove strip; the empty state offers the job list.
- **Settings** — language first, then checklists, guide, applications, deadline reminders,
  about, saved data.
- **Recovery** — an error boundary or a wrong URL shows a navy card, one sentence of context,
  and Retry / Go to Home.
- **Practice** — timer switch → 2-column topic grid (icon, name, 10 Q) → Study material link
  → past scores.
- **Study material** — masthead → grouped rows: Practice tests, PDF documents, Videos,
  Official websites. A practice row opens its topic; an external row opens the browser. Each
  row has a type icon, title, optional description and optional job source.
- **Test** — masthead progress in white → question card → answered count → sticky Previous/Next.
- **Results** — score panel with verdict stamp and mono score → New Test / Go Back → review.
- **Documents** — overall progress block → two phase cards → checklist rows.
- **Eligibility** — progress → one grouped question card → verdict stamp → next actions.
- **Settings** — language first, then checklists, about, saved data.

---

## 6. Motion

Almost none, deliberately. A 150ms opacity response on press is the whole vocabulary.
No list entry animations, no parallax, no shimmer, no decorative transitions. The date stub
and stamp carry the personality statically. Motion on a mid-range phone is delay.

---

## 7. Accessibility contract (gates)

- `bash scripts/a11y-audit.sh`: 0 critical, 0 serious on Home / Jobs / Practice / Settings.
- `bash scripts/e2e-web.sh`: live data, four tabs, axe on home.
- Body text not below 18px; UI labels 16px; micro labels 13px. Touch targets ≥ 48dp.
- Every status is text first. Colour is reinforcement.
- The date stub is hidden from assistive tech; the job card exposes the full date.
- The language control has an explicit accessible name; the switch exposes checked state.
- Masthead titles are level 1 and section headings level 2. `components/ui/Heading.tsx` adds
  the web `aria-level` that React Native's own types do not carry.
- On web, `<html lang>` follows the selected language (`en-IN`, `gu-IN`, `hi-IN`) so a screen
  reader pronounces Gujarati as Gujarati.
- `npm run typecheck`, `npm run lint`, `NODE_ENV=test npx jest` stay green.

## 8. Platform

Adaptive: Expo SDK 54 / React Native 0.81 on iOS and Android, with a web preview. The design
is phone-first and constrained to a 600px column on wide screens. Safe areas are handled by
the masthead and sticky bars. Native stack/tab gestures remain intact; the custom masthead is
a deliberate brand surface, not a replacement for the navigation back behaviour.

The web build is a single-page export with `app.json` web metadata (name, language,
description, theme colour, background) and a document language that follows the UI. Direct
URLs need a rewrite to `index.html`; `vercel.json` and `public/_redirects` provide it, so a
shared link opens the same screen instead of a 404. Production responses also carry the CSP,
`nosniff`, a strict referrer policy, frame denial, a restrictive permissions policy, COOP and
HSTS (`vercel.json`, `public/_headers`); `style-src` allows inline styles because React Native
Web writes computed styles as attributes. The build was exercised under that CSP with zero
violations.

## 9. Source map

| Concern | Location |
|---|---|
| Colour + radius values | `design/tokens.json` |
| Tailwind token names | `tailwind.config.js` |
| JS-side palette, `curve` | `constants/theme.ts` |
| Masthead, screen frame, section heading | `components/ui/Masthead.tsx`, `Screen.tsx`, `SectionHeading.tsx` |
| Heading levels (web `aria-level`) | `components/ui/Heading.tsx` |
| Freshness and source | `lib/freshness.ts`, `components/ui/FreshnessLine.tsx`, `lib/url.ts` |
| Share text and platform share | `lib/share.ts` |
| Deadline reminder rule, storage and scheduling | `lib/deadlineReminders.ts` |
| Reminder control, list and notification tap | `components/jobs/DeadlineReminderPanel.tsx`, `app/reminders.tsx`, `lib/reminders.ts`, `app/_layout.tsx` |
| Scraped-text entity decoding | `lib/text.ts` (read time), `scraper-rs/src/parse.rs::clean` (write time) |
| Offline notice cache | `lib/jobCache.ts` (read in `app/job/[id].tsx`) |
| Fact row and long-value collapse | `components/ui/Card.tsx` |
| Error and not-found screens | `components/ui/ErrorScreen.tsx`, `app/_layout.tsx` (`ErrorBoundary`), `app/+not-found.tsx` |
| Web shell, rewrites and metadata | `app.json`, `vercel.json`, `public/_redirects`, `public/robots.txt` |
| Web security headers and policy | `vercel.json`, `public/_headers`, `SECURITY.md` |
| Date stub, stamp, job card | `components/jobs/DateStub.tsx`, `ui/Stamp.tsx`, `jobs/JobCard.tsx` |
| Category shortcuts | `components/jobs/CategoryBoard.tsx` |
| Study-material row | `components/resources/ResourceRow.tsx` |
| Applied tracker (job detail) | `components/jobs/ApplyTracker.tsx` |
| Language control | `components/ui/LanguagePicker.tsx` |
| States | `components/ui/States.tsx`, `ProgressBar.tsx` |
| Screens | `app/(tabs)/*`, `app/job/[id].tsx`, `app/guide.tsx`, `app/applications.tsx`, `app/resources.tsx`, `app/practice/test/[category].tsx`, `app/documents/*`, `app/eligibility/[jobId].tsx` |
| App icon, adaptive icon, splash, favicon | `assets/` + `app.json` |

## 10. Do / don't

**Do** lead with the date and the status; write labels as words; use mono for numbers; keep
one primary action per view; group with space and hairlines; use the stamp for state; leave
the rest of the screen quiet. Say when the list was last checked. Name the source of a notice.
Let a reader send a notice on. Keep an opened notice readable after the network is gone. A
screen made only of static text needs `tabIndex={0}` on its
scroll container, or a keyboard user cannot scroll it at all (axe `scrollable-region-focusable`,
serious).

**Don't** add a gradient, a shadow stack, an emoji icon, a row of action pills, a card inside
a card, a second accent hue, a decorative eyebrow, or a webfont. Don't hide a primary action
under a long scroller; pin it. Don't put the count only in colour; write it. Don't convey a
verdict (correct/wrong, applied/not applied) with tint alone — write it, and put it in the
accessible name. Don't show raw scraped markup (`&amp;`, `&rsquo;`) to a reader; decode it at
the data layer.

---

*Measured on 2026-11-19 against the hosted project (87 live job advertisements). Screenshots:
`design/references/app-*-redesign.png` at 390×844, plus native emulator captures
(`app-guide-native.png`, `app-applied-native.png`, `app-detail-eligibility-native.png`).*
