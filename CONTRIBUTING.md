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

- Check at 1280×800 and 1920×1080 — no scrollbar should appear in either axis.
- Confirm the console is clean and no request 404s.
- If you touched type, spacing or the canvas split, re-measure against the
  artboard numbers and update [docs/verification.md](docs/verification.md).
- Keep asset weight honest: nothing occluded, nothing unused, images encoded
  losslessly.
