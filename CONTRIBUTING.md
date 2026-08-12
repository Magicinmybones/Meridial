# Contributing

## Running it

```bash
python3 -m http.server 8000 --directory src
```

There is no build step and no package manager. If a change introduces one, that
is a decision worth raising in an issue first — the absence of a toolchain is
deliberate.

## Conventions

- **Units.** Never write a raw pixel length. Read the number out of Figma and
  multiply it by `--u` — `calc(96 * var(--u))`. Ratios (`em` tracking, unitless
  line-height) stay as ratios; they scale on their own. See
  [docs/design-unit.md](docs/design-unit.md).
- **Scale is not layout.** `--u` sizes things; it must never position them.
  Structure is fractions of the viewport (`--split-panel`) and auto margins.
  If you find yourself writing `margin-left: calc(<n> * var(--u))` to place
  something, check whether that number is `(container − child) / 2` — it
  usually is, and `margin-inline: auto` is the honest way to say it.
- **No breakpoints inside the desktop range.** The layout is proportional, so
  it should not need tuning per size. A media query is a signal that something
  is pinned that ought to be fluid.
- **Stylesheet order.** `src/css/style.css` is organised into ten numbered
  sections. Put new rules in the section they belong to rather than appending
  to the end, and keep the section header comments accurate.
- **Naming.** BEM — `.block__element--modifier`. Layout hooks the
  JavaScript reads are `data-` attributes (`data-marquee-track`), never
  classes, so styling and behaviour can move independently.
- **Positioning.** Absolute positioning is for elements Figma genuinely
  overlaps. Where it is used, the artboard coordinates ride on the element as
  unitless `--x` / `--y` custom properties.
- **JavaScript.** Vanilla, IIFE-scoped, no globals, no dependencies. Anything
  measured from layout must be re-measured on resize and after
  `document.fonts.ready`.

## Before opening a pull request

- Run `python3 tools/verify-layout.py`. It must report `FAILURES: 0`.
- If you added a section, run it with `--sections` too.
- Confirm the console is clean and no request 404s.
- If you touched type, spacing or the column split, update the numbers in
  [docs/verification.md](docs/verification.md).
- Keep asset weight honest: nothing occluded, nothing unused, images encoded
  losslessly.
