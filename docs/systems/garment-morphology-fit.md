# Garment Morphology Fit

Status: **Graphics core contract** — extends
[Scene and Person Presentation](./scene-and-person-presentation.md).

One canonical garment raster, reused deterministically across compatible body
morphologies by fitting it to the target silhouette instead of regenerating the
art per build.

## The defect

Packet 76 (76A §5.2) measured the two adult body families in the bank and found
they share a canvas (420x840 standing, 420x660 seated) and share their
attachment anchors (head 0.12, torso 0.16, hips 0.54, feet 0.955), while their
PAINTED silhouettes differ by 15–21%.

`projectCharacterLayers` sized a component as

```
width = component.canvas.width / body.canvas.width
left  = anchor.x - origin.x * width
```

— a translate and a scale, where the scale is the ratio of two authored
canvases and is not a free parameter. For two families that share a canvas it
computes the same rectangle twice. A `CharacterComponentDefinition` carries one
canvas and one origin and **no per-family override**, so a garment could not be
narrowed for a slim body without being narrowed for the broad one too.

76A's verdict was that tops, bottoms and outerwear were "SAFE ONLY WITHIN A BODY
FAMILY", and that anything needing a different fit per family was "POSSIBLE ONLY
WITH A CONTRACT CHANGE". This is that contract change.

## Where a fit lives

In its own bank, `art/manifest/garment_fit_profiles.json` — **not** on
`CharacterComponentDefinition`.

A catalog generation's signature hashes the complete component definitions
(`computeCharacterGenerationSignature`). Adding a fit field to a definition would
rewrite the signature of a frozen generation and move every person pinned to it.
The same reasoning already put `availability` on the manifest record rather than
the definition.

A fit is keyed by three things and never fewer:

| Key part           | Why                                                                      |
| ------------------ | ------------------------------------------------------------------------ |
| component family   | The garment being fitted.                                                |
| target body family | The morphology it is being fitted TO. Dropping this is the defect above. |
| pose family        | Dropping this would apply a standing fit to a seated raster.             |

## Which kinds are governed

`top`, `bottom`, `footwear`, `accessory` — the body-attached kinds. A component
that hangs off `torso`, `hips` or `feet` sits against a silhouette that changes
shape from family to family. Outerwear is a `top`; there is no separate kind.

`body` is what everything is fitted to, so it is never fitted. `head`,
`hair-front`, `hair-back`, `facial-hair` and `eyewear` hang off the `head`
anchor, above the shoulder line, where no morphology difference is painted —
76A §5.4 measured identical placement outcomes for heads on both families. Head
family still constrains hair and eyewear, and complexion still has to match;
those rules are unchanged.

## Classification

Every governed family declares exactly one class, and the declaration is checked
against measured pixels rather than taken on trust.

| Class                   | Meaning                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| `safe-direct-reuse`     | Reused with no transform. It never meets the varying part of the silhouette. |
| `affine-reusable`       | Reused with one axis-aligned scale and translate per target.                 |
| `bounded-warp-reusable` | Reused with the bounded horizontal band warp per target.                     |
| `morphology-specific`   | Not reusable. The art is authored per body family.                           |

A family's class is the **worst** of its measured pairings. A garment that shares
safely onto one family and needs a warp onto another is a warp case that got
lucky once.

## The transform vocabulary

**Affine** — authoring values `{ scaleX, scaleY, translateX, translateY }`,
scaled about the component's origin (the point that lands on the anchor) and
compiled at projection time to a 2x3 matrix in body-canvas normalized
coordinates:

```
a = scaleX, b = 0, c = 0, d = scaleY
e = anchor.x * (1 - scaleX) + translateX
f = anchor.y * (1 - scaleY) + translateY
```

**There is no rotation and no shear, and their absence is a finding.** Every
measured difference between the morphologies in this project is a WIDTH
difference along horizontal rows. Nothing in the evidence rotates. A sheared
garment would also stop being an axis-aligned rectangle, which is what every
consumer downstream assumes; `b` and `d` are carried so the form is a real
matrix a reviewer can multiply out, and validation refuses anything else.

**Bounded warp** — horizontal only, with explicit control points:

- 2 to 8 control points, `{ at, scaleX, offsetX }`, strictly ascending, first at
  0 and last at 1 so no row is fitted by a number nobody authored;
- compiled to a fixed 16 uniform bands, each sampling the piecewise-linear
  interpolation at its own midpoint, every value rounded to 6 places;
- vertical stays affine, because hem length is a uniform difference and the
  measured non-uniformity is all in the width of a row.

Nine or more control points is a mesh, and a mesh is the arbitrary runtime
deformation this contract refuses.

## Bounds

`GARMENT_FIT_DEFAULT_BOUNDS`, tightenable per bank and validated on every
profile:

| Bound                   | Default     | Meaning                                                                  |
| ----------------------- | ----------- | ------------------------------------------------------------------------ |
| `minScale` / `maxScale` | 0.70 / 1.45 | Any scale, affine or per band.                                           |
| `maxTranslate`          | 0.12        | Body-canvas normalized units.                                            |
| `maxWarpOffset`         | 0.08        | Per control point.                                                       |
| `maxWarpBandStep`       | 1.06        | Ratio between adjacent compiled bands — a bigger step is a visible seam. |
| `maxWarpScaleSpread`    | 1.60        | Widest band over narrowest. More than this is a different garment.       |
| `maxEdgeErrorFraction`  | 0.03        | Acceptance bound, as a share of the target body's span at the worst row. |

**The limits are validated before anything is compared against them.** The
independent audit of the first head set `maxScale` to the string `"unlimited"`
and a profile to a million-fold scale, and nothing objected, because only the
transform's numbers were checked — never the numbers they were checked against.
`validateGarmentFitBounds` now requires every bound to be a finite number of the
right sign, inside `GARMENT_FIT_BOUNDS_ENVELOPE` (the widest any bank may go:
`maxScale` ≤ 4, `minScale` ≥ 0.25, translations ≤ 0.5, band step ≤ 2, spread ≤
4, edge-error ≤ 0.5), coherent with its partner (`minScale < maxScale`, band
step ≤ spread), and to carry no key the contract does not know. Strings, `NaN`,
`±Infinity`, `null`, nested objects, arrays and inverted pairs are all refused.

This holds at runtime as well as in validation. A bank whose bounds fail is
created with `bounds: null`, and `resolveGarmentFit` refuses **every** governed
garment in it — safe-share ones included — with `fit-bank-invalid`. A bank
nobody could have read is not evidence of anything.

The transform schema is closed for the same reason. Each kind declares exactly
its fields; an extra `shearX`, `rotation` or anything else is a structural error
that fails validation and refuses the profile at runtime, never a field that is
silently ignored.

## Failing closed

A garment with no usable answer is refused, not placed. The layer keeps its
unfitted geometry so a debug view can show where it would have gone, reports
`released: false`, and carries a named refusal.

| Code                        | When                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| `fit-garment-unknown`       | The bank has never heard of this garment family.                                                  |
| `fit-profile-missing`       | No profile for this body family in this pose. Never borrowed from another family or another pose. |
| `fit-morphology-specific`   | The garment is morphology-specific and this is not the family it was drawn for.                   |
| `fit-profile-out-of-bounds` | The authored profile fails the bank's limits, or carries a field its kind does not declare.       |
| `fit-bank-invalid`          | The bank's own bounds are malformed. Every governed garment in it is refused.                     |
| `fit-warp-not-renderable`   | The fit is a bounded warp. Issued by the projection itself, for every consumer.                   |

Every refusal is issued in `projectCharacterLayers`, once. That is the one
boundary every consumer passes through — the render plan, scene composition, the
pose proof and anything written later — so no consumer can turn a refused fit
into a drawable rectangle by not knowing about it. The first head guarded only
the render plan, and the audit showed scene composition and the pose proof
happily drawing a warped top's bounding box; the guard now lives where the
geometry is made.

A library assembled with **no** fit bank keeps the pre-fit contract exactly:
place a component by its own canvas against the body's, and accept whatever
silhouette it lands on. That is what every existing caller and every existing
catalog generation already means.

## Deriving a fit from measured anchors

Nobody types a matrix. `npm run derive:garment-fit` measures the silhouettes and
writes the bank from the difference between them.

**Category anchors** — the rows where a garment of that category actually meets
the body. A span is the distance between the left and right painted edges at a
row, so one span carries the left and right anchor of a symmetric pair.

| Category  | Anchors                         |
| --------- | ------------------------------- |
| top       | shoulder, waist, hip, hem, cuff |
| bottom    | waist, hip, crotch, knee, ankle |
| footwear  | ankle, heel, toe, sole          |
| accessory | torso                           |

Anchors outside the component's own vertical extent are dropped: fitting a
waistband against a shoulder row the garment does not reach drags the fit away
from the rows that are covered.

- **Affine** (`anchor-span-minimax-v1`): the geometric mean of the smallest and
  largest required span ratio, which minimises the WORST proportional error
  rather than the average one. The worst row is the one a viewer sees.
- **Bounded warp** (`anchor-span-piecewise-v1`): one control point per measured
  anchor row, placed where that row falls inside the component's canvas, with
  the first and last held flat to 0 and 1.

Both refuse outright to derive across two poses.

## How a fit is measured

`art/qa/garment-fit/fit_report.json`, regenerated by the same command. Every
number is read from the alpha of the rasters **after** `projectCharacterLayers`
placed them, so a fit-layer defect shows up as a defect rather than as its own
intention.

The judged number for a top or a bottom is the **per-side placement residual
against the garment's own ease**. On the source body — the one the garment was
drawn for — at each row `y` the body's painted edges `[bLo, bHi)` and the
garment's `[gLo, gHi)` give two eases in units of the body span `|B|`:

```
easeLeft(y)  = (bLo − gLo) / |B|
easeRight(y) = (gHi − bHi) / |B|
```

On the target body at the same normalized row, with edges `[bLo′, bHi′)` and
span `|B′|`, the fitted garment's edges are held to where they would sit
carrying the same ease scaled to this body:

```
expectedLo = bLo′ − easeLeft(y)  · |B′|
expectedHi = bHi′ + easeRight(y) · |B′|
residual(y) = max( |gLo′ − expectedLo| , |gHi′ − expectedHi| )
```

The verdict is the largest residual over the category's row window. It is zero
for a perfect fit whatever the drape, so ease is preserved rather than demanded
away. It is **not** zero for a garment of the right width in the wrong place:
each edge is held to its own expected position, so a sideways shift, a
one-sided displacement, a symmetric overhang and an undercoverage all score as
the pixels they are. The first head compared spans only, and a top shifted
twelve pixels sideways scored a perfect zero while hanging off one side of the
body and leaving the other bare.

**No data is not a perfect fit.** Every measurement carries a status:
`measured`, `insufficient-coverage` (fewer than 4 comparable rows or under 25%
of the window) or `invalid-geometry` (a raster with no paint, or an empty
window). Only `measured` is evidence. A case whose unfitted measurement is not
`measured` is classified `morphology-specific` with `evidence: "insufficient"`
— a refusal to conclude, not a verdict about the art — and a fitted transform
whose measurement is not `measured` is never within bound. A blank footwear
raster used to score zero coverage error and classify as safe to share; it now
classifies as nothing.

Footwear is judged on whether it **contains** the foot, from the contact row
down. A shoe is not sized by the width of the ankle above it. An accessory is
judged on whether it stays **inside** the silhouette; the body extending well
beyond a lapel pin is the pin doing its job. Neither category is ever scaled:
scaling them would resize the object rather than fit it, so each is either safe
as drawn or morphology-specific.

Raw overhang and undercoverage against the body's own edge are still reported,
because they are what 76A §5.3 quoted, but they are descriptive rather than the
verdict.

## What the measurements say

### The bank set — real released art, `dev-g2-broad` to `dev-g2-slim`

| Garment                 | Kind      | Unfitted | Fitted | Class               |
| ----------------------- | --------- | -------- | ------ | ------------------- |
| `dev-g2-knit-olive`     | top       | 23.0 px  | 2.8 px | `affine-reusable`   |
| `dev-g2-suit-charcoal`  | top       | 23.0 px  | 3.2 px | `affine-reusable`   |
| `dev-g2-trousers-slate` | bottom    | 17.9 px  | 3.0 px | `affine-reusable`   |
| `dev-g2-derby-oxblood`  | footwear  | 0.0 px   | —      | `safe-direct-reuse` |
| `dev-g2-lanyard`        | accessory | 0.0 px   | —      | `safe-direct-reuse` |

Worst per-side residual in body-canvas pixels, standing pose; the seated pose is
in the report and reaches the same verdicts.

Footwear and accessories keep 76A §5.4's answer, and now for a checked reason
rather than a tolerated one. Tops and bottoms move from "SAFE ONLY WITHIN A BODY
FAMILY" to `affine-reusable` with a measured profile.

### The fixture set — a declared lean / average / heavy triple

`art/fixtures/garment-fit`, drawn by
`scripts/art-asset-factory/garment-fit-fixtures.ts`. **The morphology table is
declared, not observed**: no measured lean / average / heavy production body
exists in this repository yet, and Pack 74 wave A is the request for one. Every
conclusion here is conditional on that table, which is chosen so the thing that
varies is the thing that varies on real people — from average to heavy the waist
grows 31% while the shoulder grows 10%.

| Garment              | Target | Unfitted | Affine  | Warp   | Class                   |
| -------------------- | ------ | -------- | ------- | ------ | ----------------------- |
| `fit-knit-olive`     | lean   | 18.1 px  | 6.0 px  | 1.9 px | `affine-reusable`       |
| `fit-knit-olive`     | heavy  | 31.2 px  | 12.7 px | 5.1 px | `bounded-warp-reusable` |
| `fit-trousers-slate` | lean   | 13.8 px  | 1.8 px  | 1.4 px | `affine-reusable`       |
| `fit-trousers-slate` | heavy  | 22.7 px  | 3.2 px  | 2.1 px | `affine-reusable`       |
| `fit-derby-oxblood`  | lean   | 0.0 px   | —       | —      | `safe-direct-reuse`     |
| `fit-derby-oxblood`  | heavy  | 2.0 px   | —       | —      | `safe-direct-reuse`     |
| `fit-badge`          | lean   | 0.0 px   | —       | —      | `safe-direct-reuse`     |
| `fit-badge`          | heavy  | 0.0 px   | —       | —      | `safe-direct-reuse`     |

**A single affine does not solve the heavy direction for a top.** It improves it
— 31.2 px to 12.7 px — and still misses: 12.7 px is 5.1% of the heavy
silhouette, outside the 3% bound. The reason is in the table above: the waist
grows three times as much as the shoulder, and no single horizontal scale sits on
both. The bounded warp reaches 5.1 px (2.0%) with a widest-to-narrowest band
spread of 1.18x and a maximum seam step of 1.02x, inside the limits.

Read the lean row honestly too: the knit's affine lands at 2.88%, inside the 3%
bound by a tenth of a percent. Under the first head's span-only metric it read
2.4%; the placement residual is stricter and this is the margin it leaves.

That is the whole case for the escape hatch, and it is also its whole scope: the
warp exists for the one thing an affine measurably cannot do. It is derivation
evidence, not a drawing instruction — see below.

## Which categories still need regenerating

- **Footwear, front-on.** Unchanged from 76A §5.5 and not a fit problem: the
  twelve p71 sheets are bonded three-quarter pairs and the contract expects a
  front-on strip. The gap is viewpoint. No transform in this contract produces
  unseen geometry, and one that claimed to would be a generative redraw wearing
  a transform's name.
- **Child and adolescent bodies.** A child is not a scaled adult. No measured
  evidence of adult-to-child proportional compatibility exists, so no fit is
  derived and none may be authored.
- **Any pairing that fails the bounds.** A garment that cannot be fitted inside
  the stated limits is classified `morphology-specific` and the art is
  regenerated for that morphology. Nothing is distorted indefinitely to avoid
  drawing it.

## A bounded warp is not renderable

A warped layer resolves to 16 ordered bands. Each band records the slice it
shows, the fraction of the source raster it reveals, and — the piece the first
head's documentation lacked — where the **whole** raster would be drawn so that
exactly those source rows land in the slice. Drawing the full image at
`band.image` and clipping to the band reproduces the geometry; drawing the full
image _into_ the band, as the earlier CSS `inset()` recipe described, would
compress the whole raster into a sixteenth of its height and clip it again. The
representation is now sufficient and the recipe is gone.

**No renderer in this repository draws bands, and the contract says so rather
than hoping.** `projectCharacterLayers` withholds a warped layer for every
consumer: it keeps the unfitted rectangle, reports `released: false`, and names
`fit-warp-not-renderable`. The bands ride along on `fit.bands` as evidence.
`validateGarmentFitBank` refuses a production bank that carries a warp profile
at all, so a person cannot lose a garment to a fit nobody can draw. The one
exception is the measurement harness, which passes `admitUnrenderableWarps` to
read the bands back and measure what the warp would achieve; a test keeps that
option out of `src/`. `bounded-warp-reusable` is therefore a derivation verdict
— "an affine cannot do this and a bounded warp can" — that today resolves to
regeneration, not to a transform.

## Commands

| Command                        | What it does                                               |
| ------------------------------ | ---------------------------------------------------------- |
| `npm run fixtures:garment-fit` | Redraws the lean / average / heavy fixtures.               |
| `npm run derive:garment-fit`   | Measures every pairing and writes the bank and the report. |
| `npm run validate:art`         | Includes the fit bank's structural and coverage checks.    |

## What validation enforces

- Every fit-governed component family appears in the bank, even if the answer is
  that it shares safely.
- Every (garment, body family, pose) pairing the component library declares as
  compatible has an authored answer; a pairing with none would fail closed at
  render time.
- A profile may not create a compatibility the components themselves refuse, and
  may not name the family the garment was authored for.
- A `safe-direct-reuse` family carries no profiles and names no authoring
  morphology.
- A `morphology-specific` family may not still declare compatibility with another
  body family: withdraw the declaration or author the art.
- An `affine-reusable` family may not smuggle a warp in through a profile, and
  no family may carry a warp profile at all: a warp is not renderable.
- The bank's bounds are finite, signed, inside the envelope, coherent and
  closed; the transform schema is closed; every transform satisfies the bounds.
