# Meridial

The Meridial hero, built from the source Figma document as plain HTML, CSS and
vanilla JavaScript. No frameworks, no build step, no dependencies — open
`src/index.html` and it runs.

Every measurement in the stylesheet is stated in *artboard units* read out of
the `.fig` node graph and multiplied by a single design unit, so the
composition holds its proportions at any viewport.

## Quick start

```bash
git clone https://github.com/Magicinmybones/Meridial.git
cd Meridial
python3 -m http.server 8000 --directory src
# → http://localhost:8000
```

Opening `src/index.html` directly from the filesystem also works, though a
local server is preferable — `file://` blocks the web font requests in some
browsers.

## Repository layout

```
src/                       the site — this directory is what gets deployed
  index.html               single page; the hero artboard
  css/style.css            all styling, organised in ten numbered sections
  js/main.js               chart backdrop + marquee measurement
  assets/
    fonts/                 Geist woff2 (Suisse Intl stand-in)
    images/                gradient-08.png — the panel glow
    logos/
      meridial-mark.svg    the Meridial mark, standalone
      favicon.svg          the same mark on the hero's top surface colour
      brands/              customer logos used in the marquee

docs/                      design and provenance notes
  design-unit.md           how `--u` works and how to add a section
  typography.md            swapping Geist for licensed Suisse Intl
  provenance.md            how the assets were extracted from the .fig
  verification.md          measured accuracy against the artboard

.github/workflows/         GitHub Pages deployment
```

## Deployment

`.github/workflows/deploy.yml` publishes `src/` to GitHub Pages on every push
to `main`. Enable it once under **Settings → Pages → Source → GitHub Actions**.

Because there is no build step, any static host works just as well: point it at
`src/` and serve.

## Working on it

- **Adding a section.** Read the numbers out of Figma and multiply them by
  `--u`; see [docs/design-unit.md](docs/design-unit.md). New sections are
  siblings of `.hero` and reuse the same unit and colour tokens.
- **Typeface.** The artboard is set in Suisse Intl, a commercial face that
  cannot be redistributed. Geist stands in until the licensed files are
  dropped in — see [docs/typography.md](docs/typography.md).
- **Scope.** Laptop and desktop. Narrower viewports still render intact, but no
  reflow has been designed for them; tablet and handheld belong in §10 of the
  stylesheet.

Conventions and the review checklist are in
[CONTRIBUTING.md](CONTRIBUTING.md).

## Third-party assets

The brand marks in `src/assets/logos/brands/` are the trademarks of their
respective owners and are included as design placeholders only. Geist is used
under the SIL Open Font License. Suisse Intl, if installed, requires a licence
from Swiss Typefaces.
