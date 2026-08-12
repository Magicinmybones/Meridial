# Meridial

The Meridial hero, built from the source Figma document as plain HTML, CSS and
vanilla JavaScript. No frameworks, no build step, no dependencies — open
`src/index.html` and it runs.

The hero fills exactly one screen at any desktop viewport, edge to edge, with
no breakpoints: columns are proportions of the viewport, vertical space is
distributed, and a single design unit — artboard numbers read out of the `.fig`
node graph — carries the type scale. See
[docs/design-unit.md](docs/design-unit.md).

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
  design-unit.md           scale vs layout, and how to add a section
  typography.md            swapping Geist for licensed Suisse Intl
  provenance.md            how the assets were extracted from the .fig
  verification.md          measured behaviour across nine viewports

tools/
  verify-layout.py         headless-Chromium layout assertions

.github/workflows/         GitHub Pages deployment
```

## Verifying a change

```bash
python3 tools/verify-layout.py            # assert layout at nine viewports
python3 tools/verify-layout.py --shots    # + screenshots and pixel checks
python3 tools/verify-layout.py --sections # + prove sections stack cleanly
```

Standard library only; it finds Chromium on `PATH`, or set `CHROME=`.

## Deployment

There is no build step, so deployment is just "serve `src/`".

- **Vercel** — `vercel.json` sets `src/` as the output directory with no build
  or install command, so importing the repository deploys it as is.
- **GitHub Pages** — `.github/workflows/deploy.yml` publishes `src/` on every
  push to `main`. Enable it once under **Settings → Pages → Source → GitHub
  Actions**.

Any other static host works the same way: point it at `src/`.

## Working on it

- **Adding a section.** Add a `<section class="section">` sibling and lay it out
  in a shell capped at `--shell-max`, the way `.hero__grid` does. Sizes come
  from Figma multiplied by `--u`; structure uses fractions and auto margins,
  never fixed offsets. See [docs/design-unit.md](docs/design-unit.md).
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
