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

Timings come from the reference recording — 574 frames at 60fps — measured
rather than eyeballed: per-element luminance curves give each reveal's start,
midpoint and end to within a frame. They live in one place, §17 of the
stylesheet.

The reveal is opacity only. The title's luminance centroid holds steady at ~123
through the recorded reveal, so nothing travels into place; adding a rise would
have been an invention.

The transition between the sections is not a scroll. Tracking the bright region
across frames 262→332 shows the hero's glow expanding from x227–249 to the full
width, while the hero's two panel cards travel into the board's first column —
the same elements in both artboards. It is reproduced as a scroll-scrubbed
morph over one screen of pinned scroll, with both ends measured at runtime.

Asserted at each viewport, by scrubbing the morph to 0, 0.5 and 1:

| viewport | column one at 0 | at 1 | settled layout |
|---|---|---|---|
| 1920×1080 | x1415 w305 | x255 w393 | x255 w393 |
| 1366×768 | x1003 w217 | x181 w279 | x181 w279 |

The morph lands exactly on the settled layout, and the layout assertions above
still pass unchanged — the animation moves nothing permanently.

**A regression worth recording.** Animating opacity on the title's three lines
gives each its own stacking context, and a composited child cannot show through
an ancestor's `background-clip: text`: the headline vanished entirely. Each line
now carries its own slice of the gradient, sized to three line-heights and
stepped 0% / 50% / 100%, which reproduces the single wash exactly.
