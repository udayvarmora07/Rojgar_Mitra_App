# Rojgar Mitra — Brand & Product Direction

The visual and product reference for every screen. `DESIGN.md` owns the token and component
system; this file owns the audience, the evidence, the intent, and the non-negotiables.

Read `PRD.md` for requirements. Read this before any visual change.

---

## 1. Who we are building for

Farmers and rural youth in Gujarat looking for state government jobs. Many read Gujarati
more comfortably than English; some read with difficulty. Phones are mid-range Android,
often shared, often on limited data, frequently used outdoors in bright sun.

Three consequences drive every decision:

1. **The text is not decoration — it is the product.** A job title, a last date and a
   qualification are the whole value. Anything that shrinks, greys out or crowds that text is
   a regression, however good it looks in a screenshot.
2. **Glanceability beats density.** The user is scanning many advertisements to find the few
   they can apply to. Each card must answer three questions instantly: *what is the post, who
   is it for, and can I still apply?*
3. **Legibility in sunlight is a hard constraint.** High contrast is not an accessibility
   checkbox here; it is whether the app works at a bus stop at noon.

The audience's cultural world is the employment-exchange notice board, the index card, the
hall ticket, and the stamped official form. That world is the design source, not a costume:
it supplies the date stub, the stamp, the ruled field row, and the habit of putting the
status in words.

---

## 2. Reference evidence

### The authority: UX4G

`ux4g.gov.in` — the Government of India design system from MeitY, built for government
services, shipping with GIGW 3.0 accessibility baked in. Captured at
`design/references/ref-www-ux4g-gov-in.png`.

What we take from it, measured from its published tokens:

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

---

## 3. The design problem, measured

The previous pass made the app *consistent* — one navy, one green, one radius, 18px body,
0 critical/serious axe findings. It did not make it *distinctive or effortless*. The audit of
that build found:

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

The scanner result after the pass: `devibe_scan.py .` → **0 findings, vibe score 0**.
Axe: **0 critical, 0 serious** on all four tabs. Web E2E against the hosted project: pass.

---

## 4. Brand direction — The Employment Exchange Ledger

**One sentence:** a government job board that reads like a well-printed notice — plain,
confident, and legible at arm's length in daylight.

**Personality:** plain-spoken, official, unhurried. Not friendly-startup, not corporate-SaaS,
not editorial-magazine. It should feel like something a District Employment Office would be
proud to hand out.

### Colour

Primary stays **deep indigo-navy** rather than UX4G's violet. Measured: `#14315B` is
**12.96:1** on white (UX4G purple-600 is 8.69:1). This audience reads outdoors; the extra
contrast is worth more than matching the hex. The vermilion is functional urgency, never a
second accent.

```
navy       #14315B   12.96:1 on white   masthead, primary actions, active state
ink        #101828   16.27:1 on paper   body text
ink-soft   #475467    7.05:1 on paper   secondary text
stamp      #9A1B12    8.27:1 on white   closing deadlines, danger, the masthead rule
success    #00522C    9.36:1 on white   ready, eligible, correct
paper      #F4F5F7                      page ground
card       #FFFFFF                      surfaces
```

Status surfaces (from the UX4G ramps; always carry a text label):

```
open      #00522C on #F1FAF3, border #A7D9B4    "Open"
closing   #9A1B12 on #FFF7F6, border #E8B4AE    "Closing soon" + countdown
closed    #475467 on #F2F3F5, border #D5DAE3    "Closed"
```

Every status carries text. Colour is reinforcement, never the message — required by both
GIGW and our axe gate.

### Type

System fonts only. The app renders Gujarati, Devanagari and Latin; the platform's own fonts
have the best glyph coverage and shaping for all three, cost zero bytes, and need no loading
state. A webfont that fails to load would break the one thing that matters.

| Role | Size | Weight | Line height |
|---|---|---|---|
| Home app name | 30px | 800 | tight |
| Screen / section title | 24px | 800 | tight |
| Body / labels | **18px minimum** | 400–700 | **1.5** |
| Metadata / button labels | 16px | 400–700 | 1.4 |
| Uppercase field label / stamp | 13px | 700 | 1.2 + 0.08em |

A mono face is used only for measurements: the date stub, counts, scores, reference numbers,
percentages. Line height 1.5 on body text is a documented need for Devanagari and Gujarati,
whose glyphs carry marks above and below the baseline that Latin does not.

Dates are written `18 Nov 2026` (never `18/11/26`): unambiguous for readers who may not parse
numeric date order confidently.

### Shape, space, touch

- Radius: `card 16px`, `control 12px`, `stub 10px`, `stamp 6px`. Capsules only for the timer
  switch and progress track. No row of action pills.
- Spacing follows a 4px base with a 16px page gutter and 20px card padding.
- Touch targets are **48dp minimum** everywhere; primary actions are 56dp.
- One job card is one tap target with a single clear chevron. No nested tap zones.
- Depth is a hairline border and a white surface. No shadow stacks.

### Motion

Almost none. A 150ms opacity response on press, and nothing else. No entry animations on lists,
no parallax, no skeleton shimmer. For a user on a mid-range phone looking for a date, motion is
only ever delay.

---

## 5. Screen-by-screen intent

**Home** — "what do I need to do?" The masthead carries the brand and the language control.
Three actions: a filled Jobs card with the live count of open notices, and two peer cards for
Practice and Documents. Then the latest eight notices as cards, and a one-line reminder to
check the official notice.

**Jobs** — the working surface. A search field that is obviously a search field, a three-part
deadline segment, and a Filters control that opens a searchable department sheet with counts.
Cards answer: date, post name, department, posts/qualification/salary, days left.

**Job detail** — a notice, not a webpage. A `NOTICE` block with title and a deadline panel,
then labelled facts (posts, qualification, salary, post date, advert number), eligibility,
documents, and a practice link. The one primary action, Apply, is pinned to the bottom edge.

**Practice** — six topics in a 2-column grid, each with an icon, a name, and "10 questions".
The timer is one switch. Past scores are a short ruled list with a mono score and a bar.

**Test** — progress in white on the navy masthead, one question card, large option rows, and a
pinned Previous/Next. Results show a verdict stamp, a mono score, New Test, and the review.

**Documents** — overall progress first, then two phase cards (applying, exam day). Each
checklist row is one tap, with a square checkbox and a written Ready / Not Ready.

**Eligibility** — four yes/no questions grouped in one card, a progress line, then a verdict
stamp (`ELIGIBLE` / `NOT ELIGIBLE`) with next steps and a route to the document checklist.

**Settings** — language first (the highest-value control for this audience), then the document
checklist, about, and saved data. Language choices are written in their own scripts.

---

## 6. Non-negotiables (each is a gate)

1. `bash scripts/e2e-web.sh` and `bash scripts/a11y-audit.sh` must exit 0. Zero critical and
   zero serious axe findings on all four tabs; the only tolerated finding is the moderate
   tab-bar `region`.
2. Body text never below 18px; touch targets never below 48dp.
3. Every status is conveyed by text, not colour alone.
4. Typecheck, lint, Jest and the Rust/Python scraper tests stay green.
5. No cream-and-serif, no uniform pill rows, no gradient hero, no emoji as iconography,
   no card inside a card, no second accent hue.
6. The date stub and the stamp are the identity. Do not replace them with generic badges or
   coloured left borders.
7. All colour values come from `design/tokens.json`. No raw hex in a component.

---

## 7. Platform

Adaptive. Expo SDK 54 / React Native 0.81 ships iOS and Android; the web build is a preview
and the E2E surface. The design is phone-first, constrained to a 600px column on wide screens.
Safe areas are handled by the masthead and the sticky action bar. Native navigation, back
gestures and tab semantics remain intact; the masthead is a deliberate brand surface.

---

## 8. Where the system lives

- Tokens: `design/tokens.json` → `tailwind.config.js` and `constants/theme.ts`.
- Components: `components/ui/` and `components/jobs/`, `components/practice/`.
- Screens: `app/(tabs)/`, `app/job/[id].tsx`, `app/practice/test/[category].tsx`,
  `app/documents/`, `app/eligibility/[jobId].tsx`.
- The full token/component record: `DESIGN.md`.
- Rendered evidence: `design/references/app-*-redesign.png`.
