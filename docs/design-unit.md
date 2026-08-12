# The design unit

Two things scale independently in this stylesheet, and keeping them separate
is what lets the hero fill any screen without a breakpoint.

- **`--u`, the design unit, is a *scale*.** It sizes type, controls, radii and
  card geometry — nothing else.
- **Structure is proportion.** Columns are fractions of the viewport, and
  vertical space is distributed rather than assigned.

Mixing the two is what produced the original bug: the artboard was rebuilt as a
fixed 1606 × 1161 box, so on a 1920 × 1080 screen 22% of the width was dead
background, and on an ultrawide 42%.

## The unit

```css
--u: min(
  calc(100vh / var(--artboard-h)),
  calc(100vw / var(--artboard-w)),
  var(--u-max)
);
```

Taking the smaller of the two viewport ratios keeps the vertical stack inside
one screen at any aspect. The ceiling (`--u-max: 1.35px`) stops type ballooning
on very large displays.

Two consequences worth knowing:

- **Values stay legible.** `calc(96 * var(--u))` is recognisably the artboard's
  96. Adding a section means reading numbers out of Figma and multiplying —
  there is no conversion table to maintain.
- **Tracking and leading need no scaling.** Letter-spacing is stored as a ratio
  of type size (`-0.04em`), and line-height as a unitless ratio, exactly as
  Figma stores them. They follow the type size automatically.

`text-rendering: geometricPrecision` is set on `body`. Without it the rasteriser
rounds glyph advances to whole pixels, and the navigation row drifted up to 10
units off at smaller scales; with it, the layout is scale-invariant.

## The structure

```
section.section.section--hero        one screen, full bleed
├── .hero__glow                      panel column's left edge → viewport right
└── .hero__grid                      1fr / --split-panel, capped at --shell-max
    ├── .hero__content               flex column
    │   ├── .masthead                1fr auto 1fr — nav centred by construction
    │   ├── .hero__body              margin-block: auto — takes the slack
    │   └── .trusted                 foot of the column
    └── .hero__panel                 flex column, card stack centred
```

`--split-panel` is `--column-panel / --artboard-w` = 0.3543 — the artboard's own
569-of-1606 split, held at every width. Change the column tokens and the layout
follows.

`--shell-max` is the one deliberate constant in the file. Below it the hero
fills the viewport edge to edge; above it the grid centres while the gradient
and the glow keep bleeding, so no letterbox ever appears.

## Coordinates that were really centring

Most artboard offsets were centring expressed as a number. Each one is
`(container − child) / 2`, so replacing it with `margin-inline: auto` is
faithful to the artboard rather than a redesign:

| element | was | `(container − child) / 2` |
|---|---|---|
| `.hero__body` | `margin-left: 99u` | (1037 − 842)/2 = 97.5 |
| `.hero__sub` | `margin-left: 185u` | (842 − 472)/2 = 185 |
| `.hero__actions` | `margin-left: 235u` | (842 − 372)/2 = 235 |
| `.trusted__label` | `margin-left: 214u` | (645 − 227)/2 = 209 |
| `.panel` | `margin-left: 114u` | (569 − 328)/2 = 120.5 |
| `.panel__title` | `margin-left: 19u` | (328 − 290)/2 = 19 |

The masthead is the same idea in a different form: the artboard centres the
navigation on x520, the middle of the content column, so a `1fr auto 1fr` grid
reproduces it by construction. Measured, the nav centre lands within 1px of the
column centre from 1366 px up to 3440 px.

Absolute positioning survives only where Figma genuinely overlaps things: the
timeline dots and connectors, and the card contents, which carry their artboard
coordinates as unitless `--x` / `--y` custom properties.

## Adding a section

```html
<section class="section"> … </section>
```

`.section` gives full-bleed positioning. Give the section its own block size and
lay its content out in a shell capped at `--shell-max`, the way `.hero__grid`
does. Sizes inside it are `calc(<artboard number> * var(--u))`; structure is
fractions and auto margins, never fixed offsets.

Verify with `python3 tools/verify-layout.py --sections`, which stacks a second
section and re-asserts that the hero still owns exactly one viewport and that
nothing overflows horizontally.
