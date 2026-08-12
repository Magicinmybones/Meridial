# Typography — action required

The artboard is set in **Suisse Intl**:

| Role | PostScript name | CSS weight used here |
|---|---|---|
| Body, navigation, figures | `SuisseIntl-Regular` | 400 |
| Panel heading (*Real-time drift detection*) | `SuisseIntl-Book` | 500 |

Suisse Intl is a commercial face (Swiss Typefaces) and cannot be redistributed,
so **Geist** currently stands in — the closest open face by measured advance
width.

## Switching to the licensed face

1. Drop `SuisseIntl-Regular.otf` and `SuisseIntl-Book.otf` into
   `src/assets/fonts/`.
2. Uncomment the two `@font-face` rules in §1 of `src/css/style.css`.

Nothing else changes — the font stack already prefers `'Suisse Intl'`. Doing
this also closes the last measurable gap against the artboard: the 2.8-unit
drift on the `Meridial` wordmark recorded in
[verification.md](verification.md) is the signature of the substitution and
should go to zero.
