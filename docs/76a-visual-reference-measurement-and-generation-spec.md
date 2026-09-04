# 76A — Visual Reference Measurement and Generation Spec

Companion to `74_GEMINI_VISUAL_GENERATION_AND_REVISION_ONE_STOP_PROMPT_PACK`.
Where 74 says _what to run_, this says _what was measured, how confidently, and
what must not be invented_.

- Accepted main this run started from: `5f735da209c59647e4b877717a40fe6cc045fc24`
  (merge of PR #86).
- Branch: `claude/post86-mass-visual-generation-command-center`.
- Machine-readable companions, regenerable and committed:
  - `art/qa/p76/reference_measurements.json` — `npm run measure:references`
  - `art/qa/p76/edge_despill_report.json` — `npm run despill:edges`
- Measured on 2026-09-04 against the rasters this repository holds. Every number
  below came out of one of those two files. Nothing here was eyeballed.

---

## 1. The confidence ladder

Every field in the JSON carries one of four labels. The labels are the point of
the document: a prompt that quotes a number should be able to say how the number
was obtained, and a number that cannot be obtained should say so rather than be
guessed.

| Label                    | What it means                                                                                                                         | Example                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `MEASURED`               | An operation with no free parameters read it off the pixels. Re-running gives the same answer.                                        | Canvas size, alpha bounding box, transparent margin, green-dominant share of the soft-edge band.        |
| `STRONG_VISUAL_ESTIMATE` | A heuristic produced it and the heuristic's own margin test passed. Usable; verify before it becomes a contract.                      | Head height from the crown-to-neck local minimum; a horizon that beats its runner-up by a clear margin. |
| `WEAK_VISUAL_ESTIMATE`   | A heuristic produced it and the margin was thin, or the heuristic is only loosely tied to the thing named. Treat as a starting frame. | Horizon on an illustration that is not a perspective construction; camera height read off that horizon. |
| `UNKNOWN`                | Not derivable from pixels by this tool. Left null with the reason.                                                                    | Furniture counts, chair/table leg topology, walkable floor, seat planes, occluder bounds.               |

**Raster truth wins.** Where this document and a prior packet disagree about a
dimension, the raster is right. Where a field is `UNKNOWN`, the answer is a human
looking at the image or an acceptance checklist inside the generation prompt —
never a plausible-sounding number written here.

### What was deliberately not measured

`furnitureCount`, `chairTableTopology`, `standingAnchors`, `seatedAnchors` and
`occluderBounds` are `UNKNOWN` on **every** scene card. They are the fields this
project cares most about and the ones a luminance measurement genuinely cannot
see. Counting desks requires recognising desks. A tool that reported "20 desks"
from variance blocks would be inventing precision, so it reports nothing and the
prompt carries the count as an acceptance criterion instead.

### The five Drive-root uploads

`IMG_5202`, `IMG_5203`, `IMG_5204`, `IMG_5205` and `IMG_5207` could not be
pixel-inspected in this environment: the proxy refuses `drive.google.com`
(`CONNECT tunnel failed, response 403`), the Drive read tool returns empty
content for `image/jpeg`, and `IMG_5205` alone is 3,068,039 bytes, which cannot
pass through the conversation as base64. **No intake verdict is claimed for
them.** Prompt pack items E1–E3 are held rather than replaced, and the pack
carries a fill-in-the-blanks edit template for whoever can see the pixels.

---

## 2. Scene Measurement Cards

Nine environment rasters, measured. Full cards with per-field notes are in
`art/qa/p76/reference_measurements.json` → `scenes[]`.

| Raster                                                            | Canvas `MEASURED` | Aspect   | Horizon                  | Camera height                     | Flat regions |
| ----------------------------------------------------------------- | ----------------- | -------- | ------------------------ | --------------------------------- | ------------ |
| `OCD_CANDIDATE_SCENE_GENERIC_LEGISLATIVE_CHAMBER_FLOOR_...01.jpg` | 5632×3072         | 11:6     | 1563 px / 50.88% `WEAK`  | standing eye level `WEAK`         | 12           |
| `OCD_SCENE_MASTER_APARTMENT_LIVING_CANONICAL_03_5504x3072.jpg`    | 5504×3072         | 43:24    | 692 px / 22.53% `WEAK`   | high, looking down `WEAK`         | 12           |
| `OCD_SCENE_MASTER_APARTMENT_LIVING_ORDINARY_02_5504x3072.jpg`     | 5504×3072         | 43:24    | 475 px / 15.46% `STRONG` | high, looking down `STRONG`       | 12           |
| `OCD_SCENE_MASTER_APARTMENT_LIVING_STARTER_01_1376x768.png`       | 1376×768          | 43:24    | 404 px / 52.60% `WEAK`   | standing eye level `WEAK`         | 12           |
| `OCD_SCENE_MASTER_CIVIC_HEARING_ROOM_5504x3072_01.jpg`            | 5504×3072         | 43:24    | 1273 px / 41.44% `WEAK`  | standing eye level `WEAK`         | 12           |
| `OCD_SCENE_MASTER_COURTROOM_EMPTY_5504x3072_01.jpg`               | 5504×3072         | 43:24    | 1345 px / 43.78% `WEAK`  | standing eye level `WEAK`         | 12           |
| `OCD_SCENE_MASTER_EXECUTIVE_PRIVATE_OFFICE_1672x941_01.png`       | 1672×941          | 1672:941 | 674 px / 71.63% `WEAK`   | low, near seated eye level `WEAK` | 12           |
| `OCD_SCENE_MASTER_SHARED_WORKROOM_OFFICE_5504x3072_01.jpg`        | 5504×3072         | 43:24    | 1355 px / 44.11% `WEAK`  | standing eye level `WEAK`         | 12           |
| `PG_TITLE_BG_COMMUNITY_MEETING_HERO_SLOT_02_5504x3072.png`        | 5504×3072         | 43:24    | 1049 px / 34.15% `WEAK`  | standing eye level `WEAK`         | 12           |

### What the scene cards establish

**The house canvas is 5504×3072 (43:24).** Six of nine masters are exactly that.
Every new scene prompt in pack 74 asks for 5504×3072 so the bank stops
accumulating one-off aspect ratios. The two small PNGs (1376×768, 1672×941) are
earlier fixtures at the same or near aspect, not a second standard.

**Horizon confidence is mostly weak, and that is the honest reading.** These are
illustrations, not perspective constructions. The measurement finds the strongest
horizontal luminance step between 15% and 85% of frame height and reports the
margin over its runner-up; only `..._ORDINARY_02` cleared 1.35×. So the horizon
is where the room _reads_ as turning, not a projected horizon, and character
scale must still be authored by hand against each plate.

**`dynamicSurfaceCandidates` is the no-bake map, not a furniture list.** Each
scene reports up to 12 contiguous low-variance blocks, largest first — for the
civic hearing room the largest is 2448×1344 at (2736, 0). These are where a
monitor, whiteboard, bulletin board or blank sign is _likely_ to sit, and
therefore where nothing readable may be baked into the plate. The measurement
finds flatness. It does not identify the object, and this document does not
pretend it does.

**`characterZones` are thirds of the floor region, offered as a starting frame.**
Foreground/midground/background bands are arithmetic, labelled `WEAK`. Real
anchors are authored against the plate by a human.

---

## 3. Figure Measurement Cards

Forty figure cards: 8 adult feminine bodies (p71 source), the same 8 after the
despill, 12 heads, 12 footwear. Full cards in
`art/qa/p76/reference_measurements.json` → `figures[]`.

`readsAsFigure` gates the body landmarks. A head sheet or a shoe sheet is not a
figure, so `headsTall`, `shoulderY` and the anchor recommendations report
`UNKNOWN` for them rather than measuring a shoe's "neck".

### 3.1 Body cards — the eight adult feminine poses

Canvas, figure box and clearance are `MEASURED`. `headsTall` is
`STRONG_VISUAL_ESTIMATE` (figure height over crown-to-neck head height, accepted
only inside the 3.5–10 range a human figure occupies).

| Pose                         | Canvas   | Figure box         | Heads tall | Green before | Green after |
| ---------------------------- | -------- | ------------------ | ---------- | ------------ | ----------- |
| `seated_conversational_left` | 908×1638 | 780×1510 @ (64,64) | 5.85       | 69.08%       | 0.00%       |
| `seated_gesture_forward`     | 826×1630 | 698×1502 @ (64,64) | 5.78       | 77.73%       | 0.00%       |
| `seated_guest_front`         | 859×1641 | 731×1513 @ (64,64) | 5.73       | 79.75%       | 0.00%       |
| `seated_guest_three_quarter` | 817×1603 | 689×1475 @ (64,64) | 5.92       | 74.81%       | 0.00%       |
| `standing_conversational_a`  | 864×1705 | 736×1577 @ (64,64) | 6.65       | 66.78%       | 0.00%       |
| `standing_conversational_b`  | 827×1728 | 699×1600 @ (64,64) | 6.96       | 68.77%       | 0.00%       |
| `standing_neutral_a`         | 892×1703 | 764×1575 @ (64,64) | 7.16       | 68.92%       | 0.00%       |
| `standing_neutral_b`         | 830×1704 | 702×1576 @ (64,64) | 6.82       | 67.18%       | 0.00%       |

Three readings that matter for generation:

1. **Clearance is a uniform 64 px on all four sides of every pose.** That is the
   chop tool's margin, and it is why the canvases differ: each figure was cut
   tight and padded, so the canvas encodes the figure's own width, not a shared
   frame.
2. **The canvases are not shared.** Widths run 817–908 px across eight poses of
   _one_ body family — an 11.1% spread before morphology is varied at all. Any
   claim that "components already share geometry" has to survive this number.
   Section 5 shows it does not.
3. **Seated poses read 5.73–5.92 heads, standing 6.65–7.16.** That is the pose
   compressing the figure, not a different body. Use the standing band as the
   adult proportion target in generation prompts; do not quote the seated band as
   an adult height.

The anchor recommendations in the JSON (`crown`, `head`, `torso`, `hips`, `feet`
as normalized pairs) are labelled **STARTING POINT ONLY**. D-068 requires a
production body's anchors to be measured from the raster that actually ships, by
someone who can see where a waistband sits. `hips` in particular has been placed
on the abdomen before, which hangs every trouser off the wrong line.

### 3.2 Head cards — twelve

| Property       | Reading                                           |
| -------------- | ------------------------------------------------- |
| Canvases       | 800×1156 to 849×1165 (`MEASURED`)                 |
| Figure boxes   | 672×1028 to 721×1037, all at (64,64) (`MEASURED`) |
| Clearance      | 64 px uniform (`MEASURED`)                        |
| Green fringe   | 0.00% on all twelve (`MEASURED`)                  |
| Body landmarks | `UNKNOWN` — `readsAsFigure` is false              |

The head sheets carry no green contamination and need no salvage. The p71 intake
passed 12/12, and the measurement agrees.

### 3.3 Footwear cards — twelve

| Property     | Reading                                           |
| ------------ | ------------------------------------------------- |
| Canvases     | 1164×739 to 1208×1060 (`MEASURED`)                |
| Figure boxes | 1036×611 to 1080×932, all at (64,64) (`MEASURED`) |
| Green fringe | 0.00% on all twelve (`MEASURED`)                  |
| Orientation  | Bonded three-quarter pairs (visual, not measured) |

The size spread is real content: boots (`olive_hiking_boot` 1178×1060,
`tan_work_boot` 1180×985, `taupe_chukka_boot` 1208×981) are genuinely taller than
flats (`black_cap_toe_oxford` 1199×739, `brown_penny_loafer` 1179×740). The
problem with this set is not quality — it is viewpoint, and section 5 explains
why that forces the one regeneration in the whole footwear category.

---

## 4. The salvage: chroma-key and despill before regeneration

The packet's instruction was to try deterministic despill **before** asking for
new bodies. Doing that changed the answer.

### 4.1 What the intake said

`art/qa/p71/source_intake_dispositions.json` classified all 8 body poses
`REVISE` for a green matte edge, with 66.78–79.75% of the soft-edge band
(alpha 32–200, the same metric `source-sheet-chop.ts` reports) green-dominant.
The default response would have been seven or eight regenerations.

### 4.2 What the pixels said

Measuring the alpha bands first, on `seated_conversational_left`:

| Alpha band      | Pixels  | Green-dominant |
| --------------- | ------- | -------------- |
| 1–31            | 7,295   | 7,287          |
| 32–200          | 33,536  | 23,166         |
| 201–249         | 22,131  | 1,106          |
| 250+ (interior) | 477,813 | **1**          |

The contamination is entirely on the boundary. The interior — 477,813 pixels at
alpha ≥ 250 — holds **one** green-dominant pixel out of nearly half a million,
and across the whole set the interior green count is 0 or 1. There is no green
garment to protect. That is what makes a deterministic repair legitimate here:
the operation only has to touch pixels that are provably matte.

### 4.3 The operation

`scripts/art-asset-factory/edge-despill.ts`, run by `npm run despill:edges`.
Options recorded in the report: `greenDominanceThreshold: 24` (identical to the
chop tool's), `interiorAlpha: 250`, `maxBoundaryDistance: 8`,
`reconstructionRadius: 14`, `reconstructionSamples: 6`.

For each pixel: skip if alpha ≥ 250 (provably interior); skip if not
green-dominant; then reconstruct RGB from inverse-distance-weighted nearest
_interior_ pixels, falling back to the arithmetic clamp `g' = min(g, (r+b)/2)`
when no interior neighbour is in reach.

Two properties make it a repair rather than a retouch:

- **Alpha is never written.** Not clamped, not feathered, not re-thresholded.
- **A material gate exists and is honest about not firing.** If the interior
  carries real green material — at least `max(64, 0.0005 × interior pixels)`
  green-dominant interior pixels — a distance gate engages so a green garment's
  own edge is left alone. On these eight files the gate measured
  `materialGreenInteriorPixels` of 0 or 1 against floors of 225–239 and correctly
  **did not** fire, which the report records as `boundaryGateApplied: false`. The
  floor is why: an earlier version tested `> 0` and one stray pixel out of 477,813
  was enough to protect a garment that does not exist, leaving 1.02% residual.

### 4.4 The result

| Asset                        | Green before | Green after | Pixels reconstructed | Clamp fallback | Disposition                          |
| ---------------------------- | ------------ | ----------- | -------------------- | -------------- | ------------------------------------ |
| `seated_conversational_left` | 69.08%       | 0.00%       | 31,559               | 0              | SALVAGEABLE BY DETERMINISTIC DESPILL |
| `seated_gesture_forward`     | 77.73%       | 0.00%       | 36,441               | 0              | SALVAGEABLE BY DETERMINISTIC DESPILL |
| `seated_guest_front`         | 79.75%       | 0.00%       | 41,558               | 0              | SALVAGEABLE BY DETERMINISTIC DESPILL |
| `seated_guest_three_quarter` | 74.81%       | 0.00%       | 39,218               | 0              | SALVAGEABLE BY DETERMINISTIC DESPILL |
| `standing_conversational_a`  | 66.78%       | 0.00%       | 35,058               | 0              | SALVAGEABLE BY DETERMINISTIC DESPILL |
| `standing_conversational_b`  | 68.77%       | 0.00%       | 37,150               | 0              | SALVAGEABLE BY DETERMINISTIC DESPILL |
| `standing_neutral_a`         | 68.92%       | 0.00%       | 45,517               | 0              | SALVAGEABLE BY DETERMINISTIC DESPILL |
| `standing_neutral_b`         | 67.18%       | 0.00%       | 43,358               | 0              | SALVAGEABLE BY DETERMINISTIC DESPILL |

**309,859 pixels repaired across eight files. Zero classified RE-EXPORT
PREFERRED. Zero classified REGENERATION REQUIRED. Eight regenerations avoided.**

Output: `art/generated/candidates/ocd-p76/bodies-despilled/`.

### 4.5 The proof, and why it is a digest rather than a claim

Every entry records four SHA-256 digests: the alpha plane before and after, and
the interior RGB before and after. On all eight, **both pairs are identical**.
The silhouette did not move, so morphology and pose did not move; the interior
did not move, so skin, fingers, feet, clothing edges, neck seam and hands are the
bytes they were. `tests/edge-despill.test.ts` asserts this with no tolerance —
a despill that moved one alpha byte moved the body, and that is a different
operation.

The same test builds a synthetic green-garment torso (solid green at full alpha
with a green matte edge), confirms the gate _does_ engage there, and confirms the
interior digest still cannot move. And it rejects a classifier that would call a
run salvaged on colour numbers alone while a digest had changed.

Where the repair landed, by figure band, on `seated_conversational_left`:
head 3,854 · torso 11,905 · hands and hips 4,261 · legs 7,198 · feet 4,341. It is
spread along the whole outline, which is what a matte edge looks like, rather
than concentrated anywhere a redraw would show.

### 4.6 The classification rule, for the next batch

| Disposition                            | Condition                                                                                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SALVAGEABLE BY DETERMINISTIC DESPILL` | Interior green-dominant count is below the material floor, soft-edge green clears to ≤ 0.5%, and both digests are unchanged.                                                              |
| `RE-EXPORT PREFERRED`                  | The despill would have to move alpha or an interior pixel to succeed — meaning the matte is bonded into the subject, and the source file should be re-exported from whatever produced it. |
| `REGENERATION REQUIRED`                | The defect is not the matte: wrong pose, wrong morphology, wrong viewpoint, anatomy that cannot be repaired by any colour operation.                                                      |

No resizing, generative fill, warping or redrawing is used at any tier. The
despill is arithmetic on RGB inside a mask derived from alpha it never writes.

---

## 5. Cross-Morphology Wearable Reuse Feasibility

The question: can one authored garment serve more than one body morphology
without runtime generative AI?

### 5.1 What the compositor can actually do

`projectCharacterLayers` in `src/presentation/character-components.ts:2079` is the
whole placement math:

```
width  = component.canvas.width  / body.canvas.width
height = component.canvas.height / body.canvas.height
left   = anchor.x - origin.x * width
top    = anchor.y - origin.y * height
```

That is a translate and an axis-aligned scale, and the scale is not a free
parameter — it is the ratio of two authored canvases. There is no rotation, no
warp, no mask, no per-recipe transform. `CharacterComponentDefinition` carries
exactly one `canvas` and one `origin` per component and **no per-family
override**, so a component's rendered size is a property of the component, shared
by every body family that lists it. A garment cannot be narrowed for a slim body
without being narrowed for the broad body too.

### 5.2 The existing "sharing works" proof is circular

The runtime bank has two adult body families, `dev-g2-broad` and `dev-g2-slim`,
and every top, bottom, footwear and accessory declares both. That looks like
proof that cross-morphology sharing works. It is not, because the two families
have **identical canvases and identical anchors**:

|                                | `dev-g2-broad`             | `dev-g2-slim`              |
| ------------------------------ | -------------------------- | -------------------------- |
| Standing canvas                | 420×840                    | 420×840                    |
| Seated canvas                  | 420×660                    | 420×660                    |
| Anchors (head/torso/hips/feet) | 0.12 / 0.16 / 0.54 / 0.955 | 0.12 / 0.16 / 0.54 / 0.955 |

So `width` and `left` come out the same number for both. The compositor is not
adapting anything; it is placing the same rectangle twice. What differs is only
the painted silhouette inside that rectangle, and it differs a lot (`MEASURED`,
alpha > 8, at the anchor rows):

| Silhouette span              | `dev-g2-broad` | `dev-g2-slim` | Difference        |
| ---------------------------- | -------------- | ------------- | ----------------- |
| Torso anchor row (y = 0.16)  | 254 px         | 210 px        | broad 21.0% wider |
| Hips anchor row (y = 0.54)   | 326 px         | 282 px        | broad 15.6% wider |
| Feet anchor row (y = 0.955)  | 200 px         | 168 px        | broad 19.0% wider |
| Widest row overall (y = 462) | 328 px         | 284 px        | broad 15.5% wider |

Two bodies 15–21% apart in width, wearing garments placed by identical numbers.
The sharing is not fitted; it is unfitted and currently tolerable.

### 5.3 Measuring the cost of the unfitted share

Composing each garment onto each family with the real placement math and
comparing, row by row, the garment's painted span against the body's painted span
at the row it lands on gives the maximum distance the garment sticks out past the
body:

| Component                              | Overhang on `dev-g2-broad` | Overhang on `dev-g2-slim` | Difference |
| -------------------------------------- | -------------------------- | ------------------------- | ---------- |
| `dev_g2_top_knit_olive_standing_v1`    | 7 px (1.67% of canvas)     | 29 px (6.90%)             | **4.1×**   |
| `dev_g2_bottom_trousers_standing_v1`   | 4 px (0.95%)               | 20 px (4.76%)             | **5.0×**   |
| `dev_g2_top_suit_charcoal_standing_v1` | 76 px (18.10%)             | 92 px (21.90%)            | 1.2×       |
| `dev_g2_footwear_derby_standing_v1`    | 105 px (25.00%)            | 105 px (25.00%)           | **1.0×**   |
| `dev_g2_accessory_lanyard_v1`          | 0 px                       | 0 px                      | **1.0×**   |
| `dev_g2_head_warm_round_v1`            | 102 px (24.29%)            | 102 px (24.29%)           | **1.0×**   |

Read this carefully, because the absolute numbers are misleading on their own.
Footwear and heads overhang by a lot on _both_ families for a correct reason: a
shoe sits below the ankle and a head sits above the shoulders, so at those rows
the body is narrow or absent and "overhang" is just the component doing its job.
The suit's 76/92 px is its hem, which correctly covers ground the body's legs do
not. **The signal is the ratio between families, not the magnitude.**

- Where the ratio is 1.0×, the body family is geometrically irrelevant. The
  component never competes with the torso silhouette, so a broad body and a slim
  body produce byte-identical placement and identical outcome.
- Where the ratio is 4–5×, the component is fitted to one morphology. The olive
  knit reads as a fitted garment on the broad body and floats 29 px past the slim
  body's outline; the trousers float 20 px. On a 284 px-wide figure, 29 px is
  10% of the whole silhouette hanging in air.

### 5.4 Verdict by category

| Category                                                                                              | Classification                        | Basis                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Footwear** (current contract: a strip below the ankle line, `attaches_to: feet`, `origin` 0.5/0.25) | **SAFE TO SHARE ACROSS MORPHOLOGIES** | Placement outcome is identical on both families (105 px / 25.00% on each). The shoe does not overlap the torso silhouette at any row, so morphology cannot affect it. It shares because it never touches the part that varies.                                                           |
| **Accessories** (lapel pin 40×40, lanyard 80×120, `attaches_to: torso`)                               | **SAFE TO SHARE ACROSS MORPHOLOGIES** | Zero overhang on both families. Small, anchored well inside the silhouette. Constraint: an accessory stays safe only while it is small relative to the torso — a sash or a full apron would be a top, not an accessory.                                                                  |
| **Heads, hair-front, hair-back, eyewear** (`attaches_to: head`)                                       | **SAFE TO SHARE ACROSS MORPHOLOGIES** | Identical placement outcome (102 px / 24.29% on each). Already declared for both families, and the declaration is geometrically true rather than merely tolerated. Head _family_ still constrains hair and eyewear, and complexion must still match the body — validation enforces that. |
| **Tops** (blazer, tee, suit, knit — `attaches_to: torso`)                                             | **SAFE ONLY WITHIN A BODY FAMILY**    | 4.1× overhang difference between families. A top authored to the broad silhouette floats past the slim one. The current bank ships this defect and it is currently below notice at UI size; it will not survive a real morphology matrix.                                                |
| **Bottoms** (slacks, trousers — `attaches_to: hips`)                                                  | **SAFE ONLY WITHIN A BODY FAMILY**    | 5.0× overhang difference, the worst in the set. The waistband is authored at one width (196 px top row on the shared trouser) against hip rows of 326 px and 282 px. Bottoms are also where an anchor error is most visible, per D-068.                                                  |
| **Outerwear** (none authored yet)                                                                     | **SAFE ONLY WITHIN A BODY FAMILY**    | Inherits the tops verdict and worsens it: a coat covers more of the silhouette than a top, so the same per-family width error applies over a longer span. Author outerwear per body family from the start.                                                                               |

**Not used, and why.** _SAFE WITH ANCHOR/AFFINE TRANSFORM_ is empty on purpose.
The transform technically exists — `width` and `height` are computed
independently, so a non-uniform scale is expressible — but it is **not
addressable per body family**, because it is derived from the component's own
canvas against the body's canvas, and the two adult families share a canvas.
There is no place to put a per-family number. Any component needing a different
fit per family is therefore _POSSIBLE ONLY WITH A CONTRACT CHANGE_, and the
cheaper answer today is a per-family variant of the art.

_NOT SAFE — MORPHOLOGY-SPECIFIC ART REQUIRED_ is also empty for the current bank,
because nothing currently authored is worse than per-family. It will not stay
empty once child and adolescent bodies land: a child is not a scaled adult, and
an adult garment scaled down is the classic failure that makes a child read as a
dwarfed adult.

### 5.5 The footwear question the packet asked specifically

_Can the existing shoe source be adapted to front-on orientation?_

**No — and this is the one regeneration in the category that is genuinely
justified.** The twelve p71 footwear sheets are bonded three-quarter pairs at
1164–1208 × 739–1060. The manifest contract expects a front-on strip at 400×60 or
420×64. The gap is not size, and not the 20:1 aspect difference; it is
**viewpoint**. Turning a three-quarter shoe into a front-on shoe means revealing
geometry the source does not contain — the front of the toe box, the inner
sidewall, the true left-right symmetry of the pair. No affine transform produces
unseen geometry, and the compositor has no warp to attempt it with. Any pipeline
that claimed to do it would be a generative redraw wearing a transform's name.

So: pack 74 item **B2** regenerates footwear front-on as a 12-up sheet, and it is
the only wearable regeneration this run asks for. The existing three-quarter
sheets are not discarded — they remain valid source for any future three-quarter
pose family, which is a real thing the pose bank will want.

### 5.6 The validation gap this exposes

`compatible_body_families` is checked for presence, non-emptiness, that named
families exist, that head complexion matches an available body complexion, and
that compatibility is uniform within a family
(`src/presentation/character-components.ts:841–1130`). It is **never checked
against geometry.** A component can declare compatibility with a body whose
silhouette it misses by 29 px and nothing complains.

That is not a defect to fix in this packet — it is a visual-generation run, and
adding a geometry gate would change runtime behaviour the graphics work does not
own. It is recorded here because the next contract change should carry it: when
per-family placement lands, the validator should compare each garment's painted
span against the body's at the rows it covers, and fail a declared compatibility
that overhangs beyond a stated tolerance.

---

## 6. Body and morphology matrix

### 6.1 The rule, stated before the table

Body geometry has two axes and only two: **build** (lean / ordinary / heavy) and
**life stage** (child / adolescent / adult / older adult), crossed with a
presentation lean (masculine / feminine). **Race and ethnicity are never a
body-geometry category.** Complexion is a separate art property already modelled
as `complexion` on bodies and heads, and head shape is its own family axis. A
body family exists because of build and life stage; skin and features vary
independently across it.

Two failure modes to refuse by name:

- Not every masculine body is athletic. _Ordinary_ masculine means ordinary —
  softer midline, sloped rather than squared shoulders, no taper.
- Not every feminine body is an hourglass. _Ordinary_ feminine means ordinary —
  waist definition modest or absent, hip-to-shoulder ratio near even.

### 6.2 Minimum pose bank

Six poses per body family, from the packet:

`standing-neutral` · `standing-conversational` · `standing-listening` ·
`seated-guest-neutral` · `seated-at-desk` · `standing-podium-or-lectern`

### 6.3 Coverage today

From `art/qa/p71/source_intake_dispositions.json`, against the one family that
has real art:

| Pose family                  | Status      | Reading                                                                                              |
| ---------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `standing-neutral`           | SATISFIED   | Two variants (sheet cells R1C1, R1C3).                                                               |
| `standing-conversational`    | SATISFIED   | Two variants (R1C2, R2C1).                                                                           |
| `seated-guest-neutral`       | SATISFIED   | Four seated cells (R1C4, R2C2, R2C3, R2C4).                                                          |
| `standing-listening`         | **PARTIAL** | No cell shows the settled weight and stilled hands the family means, distinct from neutral.          |
| `seated-at-desk`             | **PARTIAL** | Seated cells rest hands on lap, knees or forward in gesture. None places forearms at a work surface. |
| `standing-podium-or-lectern` | **MISSING** | No cell stands at a lectern or rests hands on a raised surface.                                      |

### 6.4 The matrix and what pack 74 asks for

| Family                    | Build    | Life stage  | State                                               | Pack 74 item                     |
| ------------------------- | -------- | ----------- | --------------------------------------------------- | -------------------------------- |
| adult feminine, heavy     | heavy    | adult       | 8 poses despilled and usable; 3 pose families short | **B1** (the three missing poses) |
| adult masculine, ordinary | ordinary | adult       | none                                                | **A1**                           |
| adult masculine, lean     | lean     | adult       | none                                                | **A2**                           |
| adult masculine, heavy    | heavy    | adult       | none                                                | **A3**                           |
| adult feminine, lean      | lean     | adult       | none                                                | **A4**                           |
| adult feminine, ordinary  | ordinary | adult       | none                                                | **A5**                           |
| older adult               | ordinary | older adult | none                                                | **A6**                           |
| child, ~9                 | ordinary | child       | none                                                | **C1** (6 heads tall)            |
| adolescent, ~15           | ordinary | adolescent  | none                                                | **C2** (7 heads tall)            |

Six new authorities in wave A, each an 8-pose 4×2 sheet at 5056×3392, covering
the six required pose families plus two variants. The existing feminine heavy
family is **not** promoted to universal body authority: it is one cell of the
matrix and stays one cell.

The child and adolescent items carry an explicit pass/fail proportion because it
is the specific thing generators get wrong: **a child is not a scaled adult.** A
9-year-old is about 6 heads tall with a proportionally larger cranium and shorter
limbs; an adolescent about 7. A sheet that comes back at adult proportions is a
fail even if it is beautiful.

---

## 7. UI and branding visual direction

Recorded here because the packet asks for direction, and deliberately **not**
implemented as raster art.

### 7.1 Branding

The player-facing name is **Our Civic Duty**. "Political Game" is the repository
name and appears in paths, not in anything a player reads. Any generated plate,
title treatment or mock that shows a product name shows _Our Civic Duty_.

### 7.2 Controls are code-owned

**Do not generate raster button art merely because this is a visual task.**
Buttons, menus, tabs, focus rings and icons stay CSS and SVG. Reasons, in order
of weight:

1. **Accessibility.** A raster button has no focus state, no forced-colours
   response, no text scaling, and no accessible name that follows the label.
2. **Text.** Control labels change with life stage, pronouns and content. Baked
   text goes stale the first time a string changes, and the project already
   forbids baked readable text in plates.
3. **Density.** Controls must survive the viewport range the game already
   supports; a raster survives one width.

The direction for the flat dark-green prototype controls is therefore a CSS
direction, not an art request: replace the single flat fill with a surface that
distinguishes rest, hover, active, focus-visible, disabled and selected states by
more than one channel each (fill _and_ border, or fill _and_ elevation), so a
state is legible without colour discrimination. Keep the civic palette; drop the
prototype's uniform slab.

### 7.3 Do not rebuild the #87 shell

PR #87 owns the page shell, semantic hierarchy and narrative presentation. This
run inspected it read-only and changed nothing in it. Any visual direction here
that touches layout is a note for whoever reconciles #87 onto merged main — not a
change to make from the graphics side.

---

## 8. Standing rules for everything generated from this spec

1. **No baked readable text.** No signage, no clock faces with hands, no document
   text, no name plates, no screen content, no branded packaging. The flat-region
   map in section 2 is where this is most tempting and most forbidden.
2. **No impossible furniture.** Chairs have four legs that meet the floor; tables
   have legs at corners; nothing floats, merges or grows an extra leg. This is
   `UNKNOWN` to the measurement tool and therefore a human acceptance check on
   every scene.
3. **No jurisdiction facts.** Depicted details are never sourced civic facts.
4. **Transparency where the contract asks for it.** Body, head and wearable
   sheets ship with real alpha; environment plates do not.
5. **Raster truth wins.** If a generated sheet disagrees with a number in this
   document, re-measure with `npm run measure:references` and fix the document.
