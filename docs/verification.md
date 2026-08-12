# Verification

25 elements were measured in headless Chromium at seven laptop and desktop
viewports (1280×800 through 1920×1080) and compared against their artboard
coordinates.

- **No scrollbar** — horizontal or vertical — at any tested viewport.
- **Worst drift: 2.8 units**, on the `Meridial` wordmark, identical at every
  viewport. A constant drift is the signature of font substitution rather than
  a layout fault; it should go to zero once Suisse Intl is installed (see
  [typography.md](typography.md)).
- Region correlation against the artboard exported from the file: 0.969 whole
  canvas, 0.994 glow, 0.960 masthead.
- No console errors, no failed requests.

Text-heavy regions cannot be corroborated more precisely: the reference export
embedded in the `.fig` is 359 × 269, at which size its type is illegible. It
confirms placement, tone and mass; the numeric extraction covers the rest.

## Scope

Laptop and desktop. Narrower viewports still render — `--u` simply becomes
width-driven and the artboard scales down intact — but no reflow has been
designed for them. Tablet and handheld layouts belong in §10 of the stylesheet
when specified.
