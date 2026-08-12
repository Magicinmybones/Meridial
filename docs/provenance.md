# Provenance

## Source of truth

The `.fig` file is a ZIP holding `canvas.fig`, Figma's binary **fig-kiwi**
format: an 8-byte magic, a version word, then two length-prefixed chunks — a
Kiwi *schema* (raw DEFLATE) and the *message* data (**zstd**). Parsing the
schema yields 629 type definitions, which decode 640 nodes.

All coordinates, sizes, colours, gradient stops and transforms, tracking, line
heights, dash patterns, blur radii and vector paths were read out of that node
graph, not sampled from an image.

Note the design as delivered was a presentation shot: the 1606 × 1161 artboard
sat inset inside an 1800 × 1350 frame with its own backdrop. That outer frame is
presentation chrome and is not part of the site; only the artboard is built.

## Assets

- **Brand marks and the Meridial logo** were reconstructed from the path
  geometry in the file's blob table and written out as SVG. Nothing was
  substituted from an icon library. The mark is inlined in the HTML because it
  carries a gradient fill; `src/assets/logos/meridial-mark.svg` is the same
  geometry standalone.
- **The glow** is the original `gradient-08` bitmap, re-encoded losslessly
  (pixel-identical). Figma applies `vibrance: -100`, which resolves fully
  desaturated — reproduced with `filter: grayscale(1)` so the asset stays
  untouched. It is drawn `center / cover`, confirmed by correlating candidate
  crops against the exported thumbnail (0.967 for cover-center; next best 0.86).
- A second bitmap, `gradient-01`, sits beneath an opaque image fill that covers
  it completely. Omitted — 100% occluded, 3 MB of invisible download.
- **The chart** is Figma's own vector data. The area is the fill geometry
  verbatim; the line is its centreline, recovered by reversing the cubic chain
  along the shape's top edge, so line and fill share exact control points.

## The signal section

A second `.fig` supplied the signal section. Same container format; parsing it
yielded 917 nodes and 295 blobs.

The file holds more than one shot of the page. The signal section is
`Dribbble shot HD - 177`, which the file's own `render_coordinates` point at;
a neighbouring frame, `178`, holds an earlier arrangement of the same content
with the board offset left and no masthead. They differ only in framing — the
1198 x 689 dashboard and its cards are identical in both — so it is easy to
build the wrong one. Frame 177 is the section: a 1573 x 1138 wash at x11/y8,
the dashboard centred at x204/y236, the closing line at y1008, and a masthead
running the full board width rather than sitting inside a column as the hero's
does.

Vector geometry comes from each node's `fillGeometry` / `strokeGeometry`
command blobs — a byte stream of one-byte opcodes followed by little-endian
float32 arguments (`0` close, `1` move, `2` line, `3` quadratic, `4` cubic), in
the node's own coordinate space. All 43 geometry blobs in the section decode,
so every path in the radar, the trend chart and the asset bars is the file's
own geometry rather than a redrawing.

- **The chart line** is again the fill shape's centreline, recovered by
  reversing the cubic chain along its top edge, so line and fill share exact
  control points. It is 260 units wide here against the hero's 290 — the same
  component drawn narrower, reproduced as drawn.
- **The hatch** on the asset bars is the file's own pattern: 2-unit stripes on
  a 4-unit period, rotated -20.209°, rebuilt as a CSS repeating gradient rather
  than as 144 individual stripe rectangles. The radar area does *not* take that
  treatment — its image fill is already a rendered hatch at the same 530 x 414
  size as the pattern component, so drawing both doubles it.
- **The radar chips** resolve through their component instances to
  `Size=Small, Type=Primary` — `#32A7D4` with white DM Sans, the one piece of
  colour in an otherwise monochrome design. Reproduced as found.
- **The wash** carries two stacked 3 MB image fills. The upper one is opaque
  RGB drawn to cover, so the lower is 100% occluded and omitted — the same
  judgement made for `gradient-01` in the hero, and 3.18 MB saved.
- **DM Sans Medium** is a second face, used only for the radar's month axis
  and chips. It is openly licensed, so unlike Suisse Intl it ships with the
  site rather than standing in.

Two outer frames in the file — a backdrop image and a presentation rectangle —
are shot chrome and are not part of the site. Both are marked invisible in the
source and are not built.
