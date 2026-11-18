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

## 2. Tokens

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
  except the timer switch and the progress track, which are capsule controls.
- `borderCurve: 'continuous'` on non-capsule rounded surfaces (iOS squircle; ignored elsewhere).
- Hairline borders, no shadows. Depth comes from the white surface on `paper` and a single
  rule, not from elevation.
- Touch targets ≥ 48dp; primary actions 56dp. One card is one tap target.

---

## 3. Component grammar

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
salary), then a "Last Date" label and the status stamp. Chevron at the trailing edge. One
press target; no nested actions.

### Action card
Home's primary action is a filled navy card with a live count in mono and the count label
under it (e.g. `94` / `OPEN NOTICES`). The two peer actions are white cards with an icon
tile, title, hint, and chevron. Widths are `flex-1 basis-0 min-w-0` so translations cannot
push one wider.

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
icon-plus-label stack; long values (qualification, advert number) get the full width.

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

## 4. Screen composition

- **Home** — masthead → "What do you want to do?" → live primary jobs action → Practice and
  Documents peers → "Latest Jobs" with View all → one-line official-notice footnote.
- **Jobs** — masthead with search → deadline segment + Filters → "Sorted by last date" /
  clear → job cards. Department filter is a searchable sheet with counts.
- **Job detail** — masthead → NOTICE block with title and deadline panel → facts → eligibility
  → documents → practice CTA → lexically last, a sticky Apply bar.
- **Practice** — timer switch → 2-column topic grid (icon, name, 10 Q) → past scores.
- **Test** — masthead progress in white → question card → answered count → sticky Previous/Next.
- **Results** — score panel with verdict stamp and mono score → New Test / Go Back → review.
- **Documents** — overall progress block → two phase cards → checklist rows.
- **Eligibility** — progress → one grouped question card → verdict stamp → next actions.
- **Settings** — language first, then checklists, about, saved data.

---

## 5. Motion

Almost none, deliberately. A 150ms opacity response on press is the whole vocabulary.
No list entry animations, no parallax, no shimmer, no decorative transitions. The date stub
and stamp carry the personality statically. Motion on a mid-range phone is delay.

---

## 6. Accessibility contract (gates)

- `bash scripts/a11y-audit.sh`: 0 critical, 0 serious on Home / Jobs / Practice / Settings.
- `bash scripts/e2e-web.sh`: live data, four tabs, axe on home.
- Body text not below 18px; UI labels 16px; micro labels 13px. Touch targets ≥ 48dp.
- Every status is text first. Colour is reinforcement.
- The date stub is hidden from assistive tech; the job card exposes the full date.
- The language control has an explicit accessible name; the switch exposes checked state.
- `npm run typecheck`, `npm run lint`, `NODE_ENV=test npx jest` stay green.

## 7. Platform

Adaptive: Expo SDK 54 / React Native 0.81 on iOS and Android, with a web preview. The design
is phone-first and constrained to a 600px column on wide screens. Safe areas are handled by
the masthead and sticky bars. Native stack/tab gestures remain intact; the custom masthead is
a deliberate brand surface, not a replacement for the navigation back behaviour.

## 8. Source map

| Concern | Location |
|---|---|
| Colour + radius values | `design/tokens.json` |
| Tailwind token names | `tailwind.config.js` |
| JS-side palette, `curve` | `constants/theme.ts` |
| Masthead, screen frame, section heading | `components/ui/Masthead.tsx`, `Screen.tsx`, `SectionHeading.tsx` |
| Date stub, stamp, job card | `components/jobs/DateStub.tsx`, `ui/Stamp.tsx`, `jobs/JobCard.tsx` |
| Language control | `components/ui/LanguagePicker.tsx` |
| States | `components/ui/States.tsx`, `ProgressBar.tsx` |
| Screens | `app/(tabs)/*`, `app/job/[id].tsx`, `app/practice/test/[category].tsx`, `app/documents/*`, `app/eligibility/[jobId].tsx` |
| App icon, adaptive icon, splash, favicon | `assets/` + `app.json` |

## 9. Do / don't

**Do** lead with the date and the status; write labels as words; use mono for numbers; keep
one primary action per view; group with space and hairlines; use the stamp for state; leave
the rest of the screen quiet.

**Don't** add a gradient, a shadow stack, an emoji icon, a row of action pills, a card inside
a card, a second accent hue, a decorative eyebrow, or a webfont. Don't hide a primary action
under a long scroller; pin it. Don't put the count only in colour; write it.

---

*Measured on 2026-11-18 against the hosted project (94 live job advertisements). Screenshots:
`design/references/app-*-redesign.png`.*
