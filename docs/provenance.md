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
