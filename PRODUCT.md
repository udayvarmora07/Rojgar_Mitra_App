# Rojgar Mitra — Brand & Product Direction

The visual reference for every screen. Written before the redesign, from measured evidence
rather than taste: the official Indian government design system, the two reference apps this
audience actually uses, the screens we must beat, and the screens we must fix.

Read `PRD.md` for requirements. This file governs how they look and feel.

---

## 1. Who we are building for

Farmers and rural youth in Gujarat looking for state government jobs. Many read Gujarati more
comfortably than English; some read with difficulty. Phones are mid-range Android, often
shared, often on limited data, frequently used outdoors in bright sun.

Three consequences drive every decision below:

1. **The text is not decoration — it is the product.** A job title, a last date and a
   qualification are the whole value. Anything that shrinks, greys out or crowds that text is
   a regression, however good it looks in a screenshot.
2. **Glanceability beats density.** The user is scanning many ads to find the few they can
   apply to. The job is to make each card answer three questions instantly: *what is the post,
   who is it for, and can I still apply?*
3. **Legibility in sunlight is a hard constraint.** High contrast is not an accessibility
   checkbox here; it is whether the app works at a bus stop at noon.

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

Its own guidance is explicit: *"Use Purple (#4a2bc2) on white for body text — 16.75:1"*, and
*"Don't use Saffron for body text (insufficient contrast)"*. Its card treatment is a white
surface on a near-white page, one hairline border, generous internal padding, and a soft
lavender tint for illustration areas — not gradients or glass.

**Why we follow it rather than an award-winning site:** this is a government-services app for
citizens with low digital confidence. Familiarity *is* trust. A citizen who has used UMANG or
DigiLocker should recognise the grammar of this app immediately. Originality is not worth a
moment of confusion for this audience.

### The audience's real apps: UMANG

Captured at `design/references/ref-umang-gov-in.png`. Government blue header with the emblem,
enormous illustrated banner, four big labelled icon tiles (*Departments, Services, Registrations,
Transactions*) carrying the entire navigation, and an accessibility/ISL/language cluster in the
top bar. The lesson: **big icon-plus-label tiles as the primary navigation, visible language
switching, and nothing hidden behind a gesture.** Our three quick-action tiles already follow
this pattern; the redesign keeps and refines them.

### The screen we must not become: FreeJobAlert

Captured at `design/references/ref-www-freejobalert-com.png` — the deep-scroll view of the very
listing our scraper reads. Ten columns of 12px text, colour-coded borders, no hierarchy, no
touch targets, no whitespace. It is information-rich and unusable on a phone in sunlight. It is
also our data source, which is the whole opportunity: **we can present the same 105
advertisements as a scannable list that a low-literacy user can actually act on.**

### Sources that failed to yield evidence

`ojas.gujarat.gov.in` serves a CAPTCHA wall to automated browsers (captured, unusable);
`naukri.com` returns "Access Denied" to this network. Neither is a design reference. Recorded
so the gap is honest rather than invisible.

---

## 3. The design problem, measured

An `unslop-ui` scan of the codebase and a four-tab axe audit found these, all real:

| Finding | Evidence | Decision |
|---|---|---|
| Indigo accent `#6D28D9` on the Gujarati topic | `constants/testCategories.ts:13` | Replace with the UX4G brand purple family |
| Six unrelated topic hues (green, blue, teal, indigo, amber, red) | `testCategories.ts:10-15` | One accent family; colour must not be the only differentiator |
| Uniform pill chips everywhere | `FilterChips.tsx:29`, `DeadlineBadge.tsx:31` | Rectangular controls with a small radius; pills only for status |
| Cream/yellow warning tint | audit scan | Remove; use the semantic warning surface |
| No line-height anywhere | zero `leading-*` classes in `app/` | Set a reading rhythm for Gujarati/Devanagari |
| 16px body text | 10 uses of `text-base` | Raised to 18px (done) |
| Job card shows up to 8 rows of detail | `JobCard.tsx:22-56` | Two-line hierarchy: title, department, then a single meta row |

---

## 4. Brand direction

**One sentence:** a government job board that reads like a well-printed notice — plain,
confident, and legible at arm's length in daylight.

**Personality:** plain-spoken, official, unhurried. Not friendly-startup, not corporate-SaaS,
not editorial-magazine. It should feel like something a District Employment Office would be
proud to hand out.

### Colour

The primary stays **deep indigo-navy** rather than moving to UX4G's violet. Rationale from
measured evidence: our current `#1E3A8A` is **10.36:1** on white, against UX4G purple-600's
8.69:1. The audience needs maximum contrast in sunlight, and navy reads as institutional
without being partisan. The violet stays available as the *interactive/accent* family because
it is the government system's own choice for links and focus.

```
primary    #1E3A8A   10.36:1 on white   headers, primary actions
accent     #047857    5.48:1 on white   success, "open" state, secondary actions
alert      #DC2626    4.83:1 on white   borders/icons only, never body text
surface    #F9FAFB                     page background
ink        #111827   16.98:1 on surface body text
```

Semantic surfaces follow UX4G's ramps so status never depends on hue alone:

```
open      ink on #F2FCEF, border #80DA88        "still open"     (has a label)
closing   #8A1A16 on #FFF8F8, border #FFB3AE    "closing soon"   (has a countdown)
expired   #404040 on #F5F5F5, border #D9D9D9    "closed"         (struck-through date)
```

Every status carries text. Colour is reinforcement, never the message — required by both
GIGW and our own axe gate.

### Type

System fonts only, deliberately. The app renders Gujarati, Devanagari and Latin; the platform's
own fonts have the best glyph coverage and shaping for all three, cost zero bytes, and need no
loading state. A webfont that fails to load would break the one thing that matters.

The scale is set by the user's needs, not by a ratio:

| Role | Size | Weight | Line height |
|---|---|---|---|
| Screen title | 24px | 700 | tight |
| Section heading | 20px | 700 | tight |
| Body / labels | **18px minimum** | 400–600 | **1.5** |
| Job title in card | 20px | 700 | 1.3 |
| Metadata | 18px | 400 | 1.4 |

Line height 1.5 on body text is a documented need for Devanagari and Gujarati, whose glyphs
carry marks above and below the baseline that Latin does not. This is the single largest
readability gain available to us and it currently does not exist in the app.

Arabic-numeral dates are shown as `12 Nov 2026` (never `12/11/26`): unambiguous for readers who
may not parse numeric date order confidently.

### Shape, space, touch

- Radius: `card 14px`, `control 12px`. Pills are reserved for status badges, not for actions —
  a row of identical pills is the generic-AI tell.
- Spacing follows a 4px base with a 16px page gutter and 20px card padding.
- Touch targets are **48dp minimum** everywhere; primary actions are 56dp.
- One job card is one tap target with a single clear chevron. No nested tap zones.

### Motion

Almost none. A 150ms opacity response on press, and nothing else. No entry animations on lists,
no parallax, no skeleton shimmer. For a user on a mid-range phone looking for a date, motion is
only ever delay.

---

## 5. Screen-by-screen intent

**Home** — "what do I need to do?" Three large icon tiles (Jobs, Practice, Documents), then the
ten nearest-deadline advertisements as cards. Language switch always visible in the header.

**Jobs** — the working surface. A search field that is obviously a search field, a deadline
filter row, and cards. Each card answers: post name, department, and days left, in that order.
Vacancies and qualification appear as one quiet meta line, not four separate rows. Department
filter collapses behind a single control once the list passes ~8 departments instead of
rendering 50 chips in a horizontal scroller.

**Job detail** — a notice, not a webpage. Title, department, deadline block, then labelled
facts (vacancies, qualification, salary), then one primary action: apply.

**Practice** — six topic cards in a 2-column grid, each with an icon, a label, and "10
questions". The timer is one switch. History is a short list of scores.

**Settings** — language first (it is the highest-value control for this audience), then
documents, then about.

---

## 6. Non-negotiables (each is a gate)

1. `bash scripts/e2e-web.sh` and `bash scripts/a11y-audit.sh` must exit 0. Zero critical and
   zero serious axe findings on all four tabs; the only tolerated finding is the moderate
   tab-bar `region`.
2. Body text never below 18px; touch targets never below 48dp.
3. Every status is conveyed by text, not colour alone.
4. Typecheck, lint, Jest and the Rust/Python scraper tests stay green.
5. No cream-and-serif, no uniform pill rows, no gradient hero, no emoji as iconography.
