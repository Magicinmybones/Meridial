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

The dashboard is unit-faithful: 1198 units wide, centred exactly as the
artboard has it (204 clear each side), columns at 328 / 407 / 407 units. This
is what makes the transition's card travel translate-only — the hero panel's
cards and the board's first-column cards measure byte-identical widths at
every viewport (305.11px == 305.11px at 1920×1080), so the handover cannot
show a size jump.

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

### Stored colour is not painted colour

The board carried three colours the artboard never paints: a green radar
outline, a chartreuse hatch bitmap, and three blue indicator chips. All three
are in the file, and none of them renders.

- `Area 1`'s stroke is `#4AFAA9`, bound to a library variable. The artboard
  resolves it monochrome.
- Its fill is a bitmap of chartreuse lines (`#D7FF5E` on transparent), themed
  the same way.
- The chips are instances of one indicator component whose master is
  `#32A7D4`. Each instance overrides it — the first to `#1C1C1C`, which all
  but vanishes against the card, the other two to white with near-black text.
  Reading the master instead of the overrides is what produced three blue
  pills.
- The bar hatch is an instance of the same line component, whose 144 line
  children are `#8E62EF` in the file.

Sampled across the whole region of the reference render, every channel comes
back equal — R = G = B at every point. The rendered values are the
specification; the stored ones are a theme away from it. The texture asset is
now rewritten with its RGB forced to white and its alpha untouched, so the
pattern's geometry and feathering stay byte-identical and only the hue changes.

Two hatch faults came out of the same pass, both measured by autocorrelation
along a scan line rather than by eye:

| hatch | reference | before | after |
|---|---|---|---|
| radar | 8.65 units | 2.89 | 8.46 |
| bars | 11.56 units | 11.55 | 11.55 |

The radar's was three times too dense because the bitmap was being *stretched*
into the polygon. The artboard crops it instead: the paint transform maps the
node's box onto the middle third of the image's width (`m00` 0.3333, `m02`
0.3333) and the middle 39.3% of its height (`m11` 0.39266, `m12` 0.30367) —
one uniform 0.7443 scale, so 530 × 414 draws at 394.5 × 308.1, offset to put
that crop at the origin.

The bars' period was already right but the contrast was not: a horizontal scan
across a bar in the reference sweeps 0 to 82 of 255, where ours reached 18. The
stops now ramp to 0.32 white and back rather than switching on and off, because
the artboard's lines are feathered at this scale. Measured after: 13–88 against
the reference's 0–81.

### The two panel cards

The recording gives a better reference than the embedded export: at 1800 × 1350
it renders the artboard 1:1 (offset 29 px down), so the cards can be cropped
from a settled hero frame and compared against the same crop of our own render,
unit for unit.

That comparison found one thing, and it was the thing the eye reads first. The
card fill alone is 10% black, which over the glow barely separates the card
from it. Figma's `BACKGROUND_BLUR` on both rectangles carries a **25% black
tint** alongside its 155.3 radius, and that tint had not been reproduced. Two
pure blacks compose as one, so the pair is a single value: 1 − 0.75 × 0.90 =
**0.325**.

Measured across the card's left edge, where the wash is brightest, as the drop
in luminance from just outside the card to just inside:

| sample | reference | before | after |
|---|---|---|---|
| card 1, y380–420 | −46.7 | −20.8 | −58.5 |
| card 1, y600–660 | −44.8 | −23.7 | −50.9 |
| card 2, y880–940 | −43.8 | −19.9 | −40.4 |

Mean transmittance is 0.657 in the reference against 0.627 now, where before it
was 0.835. The residual 5% is the two blur implementations disagreeing about
how much of the darker surround they pull in — Chromium's `backdrop-filter`
samples wider than Figma's — not the tint. Dialling the alpha off the file's
own composite to close it would be encoding a browser difference as a design
token, so 0.325 stands.

Three smaller corrections came out of the same extraction:

- Uppercase labels run at the artboard's raw line height of **1.05**, not the
  1.08333 implied by rounding the node's 13-unit box against its 12-unit type.
- Every one of the six board rectangles carries that identical blur effect, not
  just the two in the first column, so the modifier that limited it to those
  two is gone and the blur belongs to `.board-card` itself.
- The board's trend chart is **290** units wide, matching the hero's. Section
  two's own artboard draws it at 260, but the two artboards disagree and it is
  the same card in both — it travels from the panel into that column — so a
  differing width would show as a jump at the handover.

The figures (`60%`, `40%`, the value, the delta) now carry their artboard box
width and Figma's `CENTER` alignment. Figma sizes those boxes to the glyphs, so
the alignment costs nothing there; here it keeps a substituted face growing
about the artboard's centre rather than pushing right, which is what holds the
60 / 40 row balanced around its separator.

## Scope

Laptop, desktop and ultrawide keep the two-column architecture. Within that
range there are no breakpoints — the columns are proportions and the vertical
stack distributes its slack, so the layout is resolution-independent rather
than tuned per size.

### Where the desktop architecture actually fails

Measured rather than assumed. Walking the viewport down from 1920 to 744
produces no collision, no overflow and no wrapping fault at any width — the
composition is a pure scale, so nothing breaks geometrically. What degrades is
`--u`, and with it legibility and touch size:

| viewport | `--u` | subtitle | card label | button |
|---|---|---|---|---|
| 1366 × 768 * | 0.661 | 13.2px | 7.9px | 41px |
| 1194 × 834 | 0.718 | 14.4px | 8.6px | 45px |
| 1080 × 810 | 0.642 | 13.4px | 8.1px | 42px |
| 1024 × 768 | 0.638 | 12.8px | 7.7px | 40px |
| 962 × 601 | 0.518 | 10.4px | 6.2px | 32px |
| 834 × 1194 | 0.519 | 10.4px | 6.2px | 32px |
| 768 × 1024 | 0.478 | 9.6px | 5.7px | 30px |

\* the smallest size this design already ships at

Two things follow. The landscape tablets are **better** than the smallest
shipping desktop size — 1194 × 834 beats 1366 × 768 — so moving them to another
architecture would be a downgrade. And because `--u` is
`min(100vh/1161, 100vw/1606, 1.35px)`, it is the viewport's *aspect* that
decides which term wins: below the artboard's own 1606/1161 the width drives
it, the design shrinks into a tall screen and the vertical slack goes to waste.
That is what a portrait tablet does, and it is the real failure.

So the transition is not a width. It is `(max-width: 1023px) and
(max-aspect-ratio: 5/4)` — narrow enough that the split can no longer hold a
legible content column, *and* proportioned such that stacking is the better use
of the space. A short landscape window (962 × 601) therefore keeps the desktop
architecture: stacking needs height it does not have. Everything at or above
1024px wide is untouched, which is the whole verified desktop range.

### The tablet architecture

Desktop fits the whole 1606 × 1161 artboard on screen. Tablet cannot, so it
fits the tablet composition instead: 917 units across — the closing line's 847
plus a gutter each side, which is wider than the card pair's 737 and is what
actually binds — and 1440 down, the signal section's three rows plus its
masthead, its closing line and 40 units held back so the line clears the bottom
edge. The unit is still one number and every length still reads from it, so no
size below the media query needed a second value.

- **Hero** — one column. Content to the top, panel to the bottom. The title
  keeps its three authored lines because the content column is now the full
  width; in two columns at this width the same title wraps to six and the
  section no longer fits a screen. The glow stops being the right-hand column
  and becomes the band the panel sits in, sized from what it holds — 30 above
  the cards, 386 of card, the caption's 34 + 28 + 16 + 44, 40 below — so its
  edge lands clear of the marquee by construction.
- **Signal** — the board's 328 / 407 / 407 columns become three rows of two.
  Every card keeps its artboard width. Their contents are positioned at fixed
  artboard coordinates, so a card narrower than the artboard draws its own text
  past its edge — letting the 407-unit cards share a 667-unit row clipped
  'Cash & alt', collided the activity figures with the radar and ran the
  asset-class heading into its own title. The board is therefore as wide as its
  widest row, and the travelling pair's row centres inside it.
- **The two cards move from a stack to a pair**, and the board's first row does
  the same, so the travel between them stays a single translate. Verified: at
  every tablet width both cards share one delta and their widths match the
  board's to under a pixel, exactly as on desktop.
- **Navigation** — the links and call to action move into a menu behind a
  burger. Same destinations, same words, same call to action; the panel's
  surface is the card's own (10% black over the card's blur, a 10% gradient
  hairline, the 25-unit radius) and the links carry the masthead's size,
  tracking and 50% rest opacity.

### Result

23 viewports from 3440 × 1440 to 600 × 960: no horizontal or vertical
overflow, nothing clipped, every desktop value unchanged.

| viewport | mode | subtitle | card label | button |
|---|---|---|---|---|
| 1366 × 768 | desktop | 13.2px | 7.9px | 41px |
| 1024 × 768 | desktop | 12.8px | 7.7px | 40px |
| 912 × 1368 | tablet | 19.0px | 11.4px | 59px |
| 834 × 1194 | tablet | 16.6px | 10.0px | 51px |
| 768 × 1024 | tablet | 14.2px | 8.5px | 44px |
| 600 × 960 | tablet | 13.1px | 7.9px | 41px |

834 × 1194 goes from a 10.4px subtitle and a 32px button to 16.6px and 51px.
The burger holds a 44px minimum whatever the unit does.

The board's surface is an absolutely-positioned `::before` inset to it, so the
board has to stay `positioned` on tablet. Left `static`, that pseudo-element
resolved against the signal shell instead and drew from above the masthead to
below the closing line — which hid the navigation and made the panel look far
larger than the cards it holds. Positioning it back also means the artboard's
`top: 236u`, inert while the board was static, applies again; the offsets are
reset with it.

Faults found by measurement along the way: the board kept the artboard's
fixed 689-unit height and its three rows overflowed it; the closing line wrapped at 800 × 1280 and pushed the section
15px past the screen, which is what made the line the width constraint; and the
hero grid centred its two rows, which floated the masthead down the screen
until the burger sat underneath the menu it opens. A fourth was structural — a
closed menu that keeps its box swallows every click aimed at that control, so
the closed state is `visibility: hidden` in CSS rather than an attribute
toggled from script.

Handheld is still not addressed.

## Motion

**The site never scrolls.** One screen, `overflow: hidden`, both sections
stacked on it. Moving between them is a transition, not a scroll position.

**Only one section is ever painted.** The signal section is hidden until the
travel lands; the hero is hidden the moment it takes over. Nothing overlaps and
nothing is drawn twice.

### The hero's entry, tracked per element at 60fps

Frames stream from the recording as raw greyscale and are measured in place —
an edge-energy curve per element per frame, normalised against the settled hero
and crossed at 5% and 95%. Times are relative to the black frame at f28, where
the loop restarts.

| element | delay | duration |
|---|---|---|
| masthead | 70ms | 615ms |
| glow | 90ms | 970ms |
| title line 1 | 267ms | 483ms |
| title line 2 | 417ms | 450ms |
| title line 3 | 567ms | 467ms |
| subtitle | 833ms | 617ms |
| buttons | 833ms | 600ms |
| marquee | 850ms | 600ms |
| eyebrow pill | 1017ms | **50ms** |
| panel title & caption | 1675ms | 760ms |
| card one, shell | 1783ms | 350ms |
| card two, shell | 1867ms | 350ms |
| 'Target allocation' + its dot | 2000ms | 300ms |
| '+7.2% YTD' + its dot | 2117ms | 417ms |
| the dashed rail | 2133ms | 333ms |
| 'Whitmore Family Trust' | 2317ms | 350ms |
| 'next review: Q3' + dot + connector | 2367ms | 417ms |
| '60% / 40%' | 2383ms | 100ms |
| 'equity' / 'bonds' | 2467ms | 50ms |
| '$18,420,500' and its delta | 2533ms | 350ms |
| 'Rebalance needed' | 2550ms | 50ms |
| 'next review: Q4' + dot + connector | 2600ms | 383ms |
| chart | 2667ms | 367ms |
| 'Bond allocation drifted 4.2%' | 2683ms | 183ms |

Three findings changed the implementation.

**The ramp is linear.** Sampled at each tenth of their rise, the masthead, the
glow, the subtitle and the buttons all track a straight line to within 0.02,
where the eased curve they were authored with was already at 0.42 by three
tenths.

**The title's stagger is 150ms, not 70ms.** The three lines start at 267, 417
and 567 and each runs about 470ms. Earlier bands put them at 210 / 280 / 350
because the bands overlapped: line one's descenders fall inside line two's
box, so a rect stepped by the 96-unit line pitch measures its neighbour before
it measures itself. Reading the ink bands off a settled frame (518–581,
624–677, 720–772 in video rows) separates them.

**The panel is a second act.** The two cards do not fade in as one block at
1030ms. Their shells arrive at about 1780ms — measured as the collapse of
texture variance inside a blank patch of each card, 18.7 to 0.7 as the panel
covers the glow behind it — and their contents then arrive one at a time over
the following second, finishing at 3050ms. That is why the card rects appear to
*lose* energy around f126: the smooth panel is covering the noisy texture. The
first pass read that dip as the cards fading out.

Each card item now carries its own delay and duration in the markup, as data in
the same sense as `--x` and `--y`: the artboard says where, the recording says
when. Read back through `getAnimations()`, all 36 animated elements carry
exactly the values above, all linear.

Two faults surfaced while wiring it up, both from the reveal filling forwards:

- A filled animation outranks a normal declaration for as long as it is
  attached, so an element that had finished revealing could not afterwards be
  faded by anything else. The marquee carries `data-reveal`, so the travel had
  **never** been able to fade it out. Reveals now release on `animationend`,
  handing the property back to the cascade.
- Several of these elements rest below full opacity — the drift note at 0.4,
  the two future reviews and their connectors at 0.2, the separator at 0.3, the
  chart grid at 0.45. Animating them to 1 made each overshoot and snap back at
  the moment of release. The keyframe now ends at `var(--o)`, the same token
  that states the resting value.

### The choreography, tracked per element at 60fps

Every element was tracked through frames 240-430 — edge-energy and landmark
curves per frame, not sampled. Times relative to the travel's start (f272):

| element | behaviour | timing |
|---|---|---|
| hero title, subtitle, buttons, marquee | fade out, drifting left | 0–330ms |
| hero glow / wash edge | **widens** left to own the screen — left edge animates, cover crop recomputes, texture revealed not stretched | 0–1070ms |
| panel cards | travel left with the panel | 0–1000ms |
| **masthead nav + CTA** | **slide right — never fade** | 150–1000ms |
| swap of sections | single frame, geometrically aligned | 1000ms |
| board box | **top-anchored downward wipe** — top edge pinned, bottom sweeps 132→350, ease-in-out | 1170–1540ms |
| panel title & caption | **stay where they are** and fade out during the travel's second half | 350–850ms |
| columns two & three | fade in | ~1470ms |
| closing line | fades in **last**, in place, slowly | 1900–2280ms |

The masthead finding is the important one: its navigation slides from the
hero's column-bound layout to the signal's full-width one (CTA x388→x615 in
the 720-wide reference), handing over at the swap. Every delta is measured
from the two laid-out mastheads at runtime — nothing is hardcoded, so the
slide is correct at every viewport.

### The wordmark's snap

Traced through the travel in a real browser at nine viewports, in both
directions, sampling every masthead part per animation frame: **nothing in the
masthead moves vertically** — the hero's top and the signal's agree to 0.00 px
at every viewport, and the page never scrolls or changes width. The fault was
horizontal, and it was on the one part of the masthead that was not being
carried.

The two mastheads sit in the same box — the shell, capped and centred — but
stated their insets in different terms. The hero's came from `.hero__content`'s
padding, in units (`35 × --u`); the signal's were a fraction of the artboard
(`34 / 1606 × 100%`). Those agree only at the artboard's own aspect and drift
apart everywhere else:

| viewport | wordmark gap, before | after |
|---|---|---|
| 1280 × 800 | +2.98 px | −0.69 px |
| 1440 × 900 | +3.35 px | −0.79 px |
| 1536 × 864 | +6.49 px | −0.73 px |
| 1920 × 1080 | +8.09 px | −0.92 px |
| 2560 × 1440 | +10.78 px | −1.25 px |

The travel slides the navigation and the call to action onto their signal
positions, so the whole of that drift landed on the wordmark, which snapped
sideways at the swap — right as everything else settled. Holding both insets in
units leaves the two boxes differing by the one unit the artboards actually
differ by (x35 against x34), and the wordmark now travels on the same measured,
translate-only terms as the other two.

Measured on the frames either side of the handover, the visible masthead is now
continuous to within **0.05 px** on the wordmark and **0.22 px** on the call to
action, at every viewport — against 3–11 px before. Confirmed in the recording
too: the wordmark's left edge holds at one column through the swap where it
previously stepped across.

Cascade verified with transitions disabled (headless cannot animate them):
during the travel the nav computes `translateX(334.5px)` and the CTA
`translateX(661px)` at 1920×1080, the hero body computes opacity 0, the
masthead stays at 1, and every value returns to rest on the way back.

**The background handover.** The reference keeps the texture at the glow's
full strength: the settled section-two margins measure 131–146 in luminance,
where the artboard's 0.2-opacity wash over the dark base would sit near 50.
The wash is therefore the glow's own declaration at full strength, and the
glow expands by animating its left edge to the viewport's rather than by
transform — the cover crop recomputes as it widens, so the texture is
progressively revealed the way the recording shows instead of being stretched
2.8×, and at left 0 it renders pixel-identically to the wash it hands over to.
Verified: glow travels (1239.8, w680.3) → (0, w1920), wash at (0, w1920).

**Only the cards travel.** The panel's title and caption do not follow them:
their edge energy holds at their own position until ~350ms into the travel,
then decays over ~500ms, completing before the swap. The travel transform is
applied to the two cards individually (the same translate — it is
translate-only), and the title and caption fade where they stand.

**A probe lesson.** `* { transition: none !important }` does not match
pseudo-elements, so a `::before` transition survives it; under starved frames
its computed value then freezes at the transition's start, which looks exactly
like a cascade failure. The kill-switch needs `*, *::before, *::after`.

**Not verifiable here.** CSS transitions need produced frames, and headless
Chromium starves them once the page goes idle. End states, classes and measured
transforms are asserted; the interpolation between them needs a real browser.
