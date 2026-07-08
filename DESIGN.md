---
name: Certification Tracker
description: A calm, warm home base for studying toward professional certifications.
colors:
  rose: "oklch(0.53 0.18 12)"
  rose-deep: "oklch(0.48 0.18 12)"
  rose-press: "oklch(0.44 0.17 12)"
  rose-page: "oklch(0.955 0.022 14)"
  rose-sunken: "oklch(0.91 0.032 14)"
  surface: "oklch(1 0 0)"
  on-rose: "oklch(0.99 0.01 20)"
  ink: "oklch(0.3 0.028 14)"
  ink-muted: "oklch(0.46 0.03 14)"
  ink-faint: "oklch(0.5 0.03 14)"
  border: "oklch(0.885 0.024 14)"
  border-strong: "oklch(0.8 0.032 14)"
  track: "oklch(0.9 0.02 14)"
  amber: "oklch(0.52 0.12 58)"
  blue: "oklch(0.5 0.12 250)"
typography:
  display:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 680
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 640
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 560
    lineHeight: 1.35
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 550
    lineHeight: 1.35
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.rose}"
    textColor: "{colors.on-rose}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.rose-deep}"
    textColor: "{colors.on-rose}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  status-pill:
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.625rem"
    typography: "{typography.label}"
---

# Design System: Certification Tracker

## 1. Overview

**Creative North Star: "The Warm Ledger"**

A soft, warmly-lit ledger of your progress. The page is a faint rose-tinted
off-white; the content lives on crisp white cards that lift cleanly off it. One
deep-rose accent carries everything that means *forward motion* — progress fills,
scores, the primary action. The result is friendly and human without being loud:
warmth comes from the page temperature and the rose, not from clutter.

The system stays restrained in the Linear tradition — tight typography, generous
space, almost no chrome — but its temperature is warm, not clinical. It is
light-first (studying happens in daylight as often as at night); a rose-accented
dark theme ships alongside and is a genuine peer, not an afterthought. Both meet
WCAG AA.

It explicitly rejects the two things the product is not: the **corporate LMS look**
(dense tables, stock photography, clip-art badges) and **cheesy gamification**
(confetti, mascots, XP theatrics). Progress is shown honestly — a bar that fills
because you did the work — never performed.

**Key Characteristics:**
- Faint rose page + white cards; a single deep-rose accent for progress & action.
- Semantic color is disciplined: rose = progress/success, amber = below the line, blue = booked exam, gray = queued/mid.
- Light-first, with a rose-accented warm-charcoal dark theme. Both WCAG AA.
- Single humanist sans (Figtree), differentiated by weight; tabular figures for dates/scores.
- Responsive motion (130–320ms), never choreographed.

## 2. Colors

A warm, low-saturation rose environment: a faint rose page, white cards, and one
deep-rose accent doing all the "progress" work. Neutrals are tinted a hair toward
the rose hue (~14) so the whole surface reads warm rather than cool-gray.

### Primary
- **Deep Rose** (`oklch(0.53 0.18 12)`): the single brand accent. Progress-bar
  fills, the score-trend line, active navigation, and the one primary action per
  screen (`Start practice test`). Hover deepens to `oklch(0.48 0.18 12)`. In the
  dark theme it brightens to `oklch(0.68 0.17 14)`.

### Neutral
- **Rose Page** (`oklch(0.955 0.022 14)`): the app background — a faint,
  unmistakably-rose off-white. Dark theme: warm charcoal `oklch(0.2 0.006 14)`.
- **White** (`oklch(1 0 0)`): cards and panels, lifting off the rose page.
- **Rose Sunken** (`oklch(0.91 0.032 14)` ≈ `#F2C7C7`): inset wells, segmented tracks.
- **Ink ramp** — `ink` `oklch(0.3 0.028 14)` (body/headings), `ink-muted`
  `oklch(0.46 0.03 14)` (secondary), `ink-faint` `oklch(0.5 0.03 14)` (tertiary).
  All clear 4.5:1 on both the page and white cards.
- **Border** (`oklch(0.885 0.024 14)`) / **Border-strong** (`oklch(0.8 0.032 14)`).

### Secondary (semantic status)
- **Amber** (`oklch(0.52 0.12 58)`): "below the passing line" — weak topics, the
  `Focus here` label, the under-line hero bar, and the "Studying" pill.
- **Blue** (`oklch(0.5 0.12 250)`): informational — a booked exam ("Exam booked").
- Passed/strong reuse the rose accent; queued/mid use the neutral ink ramp.

### Named Rules
**The One Warm Signal Rule.** Rose means *progress and forward motion* — and only
that. If something rose isn't about progress or the primary action, it's wrong.

**The Amber-Not-Rose Rule.** "Needs work" is always amber, never rose. Since rose
reads as success here, a weak area in rose would invert the meaning.

**The White-Card Rule.** Content sits on white cards, not on the rose page. The
page tint is atmosphere; legible content lives on white. Never tint a content
card toward a deeper pink "for warmth."

**The Status-Never-By-Color Rule.** Every status carries an icon + label as well
as color, so meaning survives colorblindness and grayscale.

## 3. Typography

**Display / Body Font:** Figtree (with `ui-sans-serif, system-ui, sans-serif`)

**Character:** One warm humanist sans across the entire UI, differentiated by
weight rather than by mixing families. Friendly and approachable in its
letterforms, crisp and legible at small sizes for dense study content.
Grown-up, not cute. Numeric UI (dates, scores, counts) uses tabular figures.

### Hierarchy
- **Display** (680, 2.25rem, 1.05, -0.02em): the focused certification name.
- **Headline** (640, 1.25rem, -0.01em): section headers ("Topics to study").
- **Title** (560, 1.0625rem): card titles, material names, topic names.
- **Body** (400, 0.9375rem, 1.55): notes and descriptions; measure capped 65–75ch.
- **Label** (550, 0.8125rem): metadata, dates, pills, small UI labels.

### Named Rules
**The One Family Rule.** Figtree carries the whole interface. Hierarchy comes from
weight, size, and space — never from pairing a second similar sans. Fixed rem
scale (~1.2 ratio), not fluid clamps — this is product UI at consistent DPI.

## 4. Elevation

Flat by default, with warm tonal layering rather than heavy shadows. Depth is a
white card stepping off the rose page; grouped content steps one tone further
(`rose-sunken`). Shadows are soft, low, and reserved for state — hover lift on the
switchable cards, and the elevation of transient surfaces (the mobile drawer).

### Named Rules
**The Tonal-Depth Rule.** Layering is done with tone (white card on rose page),
not with heavy shadows. Any shadow that appears is a response to state, never a
default decoration.

## 5. Components

### Buttons
- **Shape:** gently rounded (`10px`, `--r-md`).
- **Primary:** rose fill (`{colors.rose}`), white text, `0.625rem 1rem` padding;
  hover deepens and lifts 1px. One per screen (`Start practice test`).
- **Ghost / Secondary:** transparent on white, 1px border, muted-ink label; hover
  fills to `surface-hover` and strengthens the border. Used for `Open course`.

### Status Pills
- **Style:** pill radius, tinted-soft background + saturated text of the same hue,
  a leading icon. Tones: passed = rose, booked = blue, studying = amber, queued =
  neutral gray. Always icon + label, never color alone.

### Cards / Containers
- **Corner Style:** `14px` (`--r-lg`); the focus hero uses `20px` (`--r-xl`).
- **Background:** white (`{colors.surface}`) on the rose page.
- **Border:** 1px `border`. **Shadow:** none at rest (see Elevation).
- **Internal Padding:** `24px` (`1.5rem`), tightening to `16px` on mobile.

### Mastery / Progress Bar
- Rounded track (`track`) with a filled portion and an optional passing-line tick.
- **Fill tones:** rose = at/above the line (progress), amber = below, gray = mid.
- Fills animate width on mount (`320ms` ease-out); instant under reduced motion.

### Score-Trend Sparkline
- A small rose line over a soft-rose well, with a dashed passing baseline. Scales
  tight to the data so the trend is legible, not compressed against a 0–100 axis.

### Navigation
- **Sidebar (desktop):** vertical list; the active item is rose text on a rose-soft
  chip with a rose rail marker. Collapses to a slide-in drawer under 860px behind a
  top-bar menu button.

### Focus Cert (signature)
- The hero: a rose-page panel with a warm rose "lamp glow" from the top edge, the
  certification name in display type, a status pill + exam countdown, a directive
  hint ("N topics still under the line…"), and a white readiness card carrying the
  last score vs. the passing line, the trend, and the primary action.
- **Passed / earned state:** for a completed cert the hero drops the exam countdown
  and practice CTA — it shows "Earned {date}", a "Certified" readiness badge, and a
  quiet "this certification is complete" line. Progress shown, not performed.

### Cert Card (Certifications grid)
- White card; whole card is a stretched click target that opens the cert in the
  dashboard. Header carries the status pill and, for earned certs, a **"Credential ↗"**
  link (a real `<a>` layered above the stretched button via z-index — never a nested
  interactive element).
- Body: provider, name, a meta line (exam countdown / last practice / "Earned {date}"),
  a mastery bar vs. the passing line, and a footer (readiness badge + amber
  "N under the line", or "Certified" for passed).
- **Earned-without-score:** when a passed cert has no recorded score, the bar is
  omitted entirely — the "Certified" footer and earned date carry the meaning (no
  misleading 0%).

### Segmented Control
- Rose-sunken track with a white active segment (soft shadow) and an accent count
  chip. Used for status filters and the Schedule view toggle. Radiogroup semantics
  with arrow-key navigation.

### Schedule Calendar
- Month grid (semantic `<table>`) plotting booked exams (blue chip), earned certs
  (rose "✓ Passed" chip), and practice attempts (rose at/above line, amber below).
  Today gets a rose day-marker; a legend keeps status off color-alone. Prev/next +
  "Today" navigation. Compacts chips to colour markers on narrow screens.

### Add Certification Form
- Inline expanding panel (never a modal — progressive over interruptive). White
  inputs with an accent focus ring, inline validation, a submitting state, and a
  soft-amber error banner for server errors.

### Loading & Error States
- Initial load: a calm centered "breathing" rose dot (not a spinner in content),
  honoring reduced motion. Error: a soft-amber mark, plain message, and a rose
  "Try again" action. Empty states teach rather than say "nothing here".

## 6. Do's and Don'ts

### Do:
- **Do** reserve rose for progress, success, and the single primary action (**The One Warm Signal Rule**).
- **Do** flag "needs work" in amber, never rose (**The Amber-Not-Rose Rule**).
- **Do** keep content on white cards; let the rose page stay atmosphere (**The White-Card Rule**).
- **Do** hold both light and dark themes to WCAG AA (body ≥4.5:1, large text ≥3:1).
- **Do** pair every status with an icon + label; keep body measure at 65–75ch; give every interactive element a visible focus ring.
- **Do** provide a `prefers-reduced-motion` alternative (crossfade or instant) for every transition.

### Don't:
- **Don't** make it look like a **corporate LMS / compliance dashboard** — no dense data-table walls, stock photography, clip-art badges, or enterprise drabness.
- **Don't** use **cheesy gamification** — no confetti, mascots, XP-bar theatrics, or badge walls. Progress is earned and honest, not celebrated.
- **Don't** tint content cards pink — the rose belongs to the page and the accent, not the cards.
- **Don't** pair two similar sans-serifs; one humanist family (Figtree), varied by weight (**The One Family Rule**).
- **Don't** add tiny all-caps tracked eyebrows above sections, or use color as the only signal for status.
- **Don't** spread the rose onto non-progress decoration — its meaning is the point.
