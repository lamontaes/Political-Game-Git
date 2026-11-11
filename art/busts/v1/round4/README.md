# Busts round 4: clothes as layers, in colors (front view)

Painted by the CTO with Codex on Nov 11, 2026, to Fable B's bust spec 2 (`docs/art/busts-spec.md`, #8559). The owner asked for it on Nov 10: "yes, I would like to be able to change ties and stuff ... I want to see colors and stuff changing as well."

**Status:** waiting for the owner's answer on his decisions page (call 13). Nothing here is in the game yet.

## Pieces

Every piece is 1254 × 1254 RGBA on round 3's canvas, at offset (0, 0), on round 3's neck join. The layer order is head, shirt, tie, jacket, facial hair, hair.

- **Men, 16 pieces:**
  - `shirt-dress` in white, lightblue and cream
  - `tie-silk` in navy, burgundy, forestgreen and navystripe
  - `jacket-suit` in charcoal, navy and brown
  - `top-sweater` in gray, green and maroon
  - `top-chambray` in blue, tan and olive
- **Women, 12 pieces:**
  - `shirt-dress` in white, lightblue and cream
  - `jacket-blazer` in charcoal, navy and burgundy
  - `top-henley` in gray, green and maroon
  - `top-cardigan` in cream, navy and rust

Each color is its own Codex painting from one master, never tinted. `tags.json` gives each piece's `kind`, `name`, `color` and `layer`, plus `use` for the whole tops.

## Checks

Every shirt × (no tie or each tie) × (no jacket or each jacket), plus every whole top, was checked on all six heads: 396 combinations for men and 108 for women. The results are in `men/front-checks.json` and `women/front-checks.json`.

- 0 holes.
- No shirt showing outside a jacket.
- No uncovered neck joins.
- No tie pixels outside a shirt.
- Ties drift at most 2.4 px from knot to bottom edge.

The sheets are in `sheets/`.
