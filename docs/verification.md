# Verification

`python3 tools/verify-layout.py` renders the page in headless Chromium at nine
laptop, desktop and ultrawide viewports and asserts the properties the layout is
supposed to guarantee. `--shots` adds screenshots and a pixel check; `--sections`
stacks a second section and re-runs the parts that must still hold.

## What is asserted

1. `scrollWidth == clientWidth` — no horizontal scrollbar, at any width
2. `scrollHeight == clientHeight x <sections>` — every section owns exactly
   one screen, and the page is their sum
3. Each section spans `left === 0` to `right === clientWidth` — full bleed.
   Comparisons use the layout viewport, not `innerWidth`: once the page is
   taller than one screen a scrollbar exists, and `innerWidth` still counts
   the space it takes
4. The glow's right edge equals the viewport's right edge — no dead band
5. The hero panel holds 35.43% of the shell — the artboard's 569-of-1606
   split — and the signal board holds 328 / 407 / 407 across its columns
6. Sampled pixels prove the glow *paints* to the right edge, not merely
   measures to it
7. No console errors, no failed requests

## Results

All nine viewports pass, with zero dead band:

| viewport | `--u` | shell width | panel share | gap at right |
|---|---|---|---|---|
| 1280 × 800 | 0.6891 | 1280 | 35.43% | 0 |
| 1280 × 1024 | 0.7970 | 1280 | 35.43% | 0 |
| 1366 × 768 | 0.6615 | 1366 | 35.43% | 0 |
| 1440 × 900 | 0.7752 | 1440 | 35.43% | 0 |
| 1536 × 864 | 0.7442 | 1536 | 35.43% | 0 |
| 1600 × 900 | 0.7752 | 1600 | 35.43% | 0 |
| 1920 × 1080 | 0.9302 | 1920 | 35.43% | 0 |
| 2560 × 1440 | 1.2403 | 2560 | 35.43% | 0 |
| 3440 × 1440 | 1.2403 | 2560 (capped) | 35.43% | 0 |

For comparison, the same measurement against the fixed-canvas build it
replaces — the regression this fixes:

| viewport | canvas width | dead gradient each side |
|---|---|---|
| 1440 × 900 | 1245 | 97 px (13.5%) |
| 1920 × 1080 | 1494 | 213 px (22.2%) |
| 3440 × 1440 | 1992 | 724 px (42.1%) |

At 3440 the shell caps at 2560 and centres (inset 440 px each side) while the
glow bleeds the full 440 px to the viewport edge, so the composition stays
designed rather than stretched and still shows no letterbox.

**The type scale is unchanged.** `--u` and every computed font size match the
previous build exactly at all nine viewports, which confirms the change is
layout-only and leaves the typography untouched.

## The signal section

Section two passes the same nine viewports. Measured at 1920 x 1080 it spans
y1080 to y2160 — exactly one viewport, immediately after the hero — and its
board columns measure 393.19 / 487.89 / 487.89, a ratio of 0.8059 against the
artboard's 328 / 407 = 0.8059.

Both sections together make the page exactly two viewports tall, with no
scrollbar in either axis beyond the single vertical one the second section
necessarily introduces.

## Fidelity to the artboard

- Navigation centre lands within **1 px** of the content column's centre from
  1366 px through 3440 px, reproducing the artboard's "centred on x520".
- Worst drift on the `Meridial` wordmark remains **2.8 units**, identical at
  every viewport. A constant drift is the signature of font substitution rather
  than a layout fault; it should go to zero once Suisse Intl is installed (see
  [typography.md](typography.md)).
- Region correlation against the artboard exported from the file: 0.969 whole
  canvas, 0.994 glow, 0.960 masthead. These were measured against the
  fixed-canvas build and still describe the composition, but they are no longer
  a pixel-for-pixel claim: the layout is now proportional by design, so it
  matches the artboard's *ratios* at the artboard's aspect and adapts away from
  it elsewhere.

Text-heavy regions cannot be corroborated more precisely: the reference export
embedded in the `.fig` is 359 × 269, at which size its type is illegible. It
confirms placement, tone and mass; the numeric extraction covers the rest.

## Scope

Laptop, desktop and ultrawide. Within that range there are no breakpoints —
the columns are proportions and the vertical stack distributes its slack, so
the layout is resolution-independent rather than tuned per size.

Narrower viewports still render intact, but the two-column split holds all the
way down, which is wrong below roughly 900 units of width. Tablet and handheld
want the panel stacked under the content; that reflow is the one thing the
stylesheet still owes, and §10 is where it belongs.

## Motion

**The site never scrolls.** One screen, `overflow: hidden`, both sections
stacked on it. Moving between them is a transition, not a scroll position.

**Only one section is ever painted.** The signal section is hidden until the
travel lands; the hero is hidden the moment it takes over. Nothing overlaps and
nothing is drawn twice.

### The choreography, tracked per element at 60fps

Every element was tracked through frames 240-430 — edge-energy and landmark
curves per frame, not sampled. Times relative to the travel's start (f272):

| element | behaviour | timing |
|---|---|---|
| hero title, subtitle, buttons, marquee | fade out, drifting left | 0–330ms |
| hero glow / wash edge | sweeps left, decelerating, to own the screen | 0–1070ms |
| panel cards | travel left with the panel | 0–1000ms |
| **masthead nav + CTA** | **slide right — never fade** | 150–1000ms |
| swap of sections | single frame, geometrically aligned | 1000ms |
| board box | grows from its top edge, behind the cards | 1130–1430ms |
| columns two & three | fade in | ~1470ms |
| closing line | fades in **last** | ~1900ms |

The masthead finding is the important one: its navigation slides from the
hero's column-bound layout to the signal's full-width one (CTA x388→x615 in
the 720-wide reference), handing over at the swap. Both deltas are measured
from the two laid-out mastheads at runtime — nothing is hardcoded, so the
slide is correct at every viewport.

Cascade verified with transitions disabled (headless cannot animate them):
during the travel the nav computes `translateX(334.5px)` and the CTA
`translateX(661px)` at 1920×1080, the hero body computes opacity 0, the
masthead stays at 1, and every value returns to rest on the way back.

**Not verifiable here.** CSS transitions need produced frames, and headless
Chromium starves them once the page goes idle. End states, classes and measured
transforms are asserted; the interpolation between them needs a real browser.
