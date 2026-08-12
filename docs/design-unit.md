# The design unit

The artboard is 1606 × 1161. Rather than hardcode pixels, the stylesheet states
every measurement in **artboard units** — the numbers read out of the Figma
document — multiplied by `--u`, the length one unit occupies on screen:

```css
--u: min(
  calc(100vh / var(--artboard-h)),
  calc(100vw / var(--artboard-w)),
  1.35px
);
```

Taking the smaller of the two viewport ratios makes the artboard *contain*
itself: the hero always fits one screen in both axes, so no scrollbar appears.
The upper bound stops the composition ballooning on very tall displays.

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

## Structure

```
main.page
└── section.hero              one screen tall, full-bleed gradient
    └── .hero__canvas         1606 × 1161 units, centred
        ├── .hero__content    1037 units — masthead, hero, marquee
        └── .hero__panel       569 units — glow, cards, caption
```

The background bleeds the full width, so the artboard's own width reads as a
centred container rather than as letterboxing. Further sections are added as
siblings of `.hero` and can reuse `--u` and the colour tokens.

The 1606 canvas splits 1037 / 569, and that split is structural: the hero (842
units) is centred on x520 — the centre of the content column, not of the page —
and the masthead's navigation is centred on x520 too. Absolute positioning is
used only where Figma genuinely overlaps things: the glow, the timeline dots and
connectors, and the card contents, which carry their artboard coordinates as
unitless `--x` / `--y` custom properties.
