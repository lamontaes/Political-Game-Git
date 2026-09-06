# Scene and Person Presentation

Status: **Graphics core contract**

This is the substrate every scene and every person is drawn through. Adding a
room or a component is authoring data against the contracts below; it is not
another bespoke React or CSS rewrite.

## Responsive raster tiers

One logical asset identity owns an ordered ladder of rasters. The production
environment ladder is 1024 / 2048 / 3072 / 4096 wide, all preserving the
source aspect, all deterministic reductions of one master.

Selection, implemented in `src/presentation/raster-tiers.ts`:

```
requiredDeviceWidth = paintedPlateCssWidth * devicePixelRatio
chosen              = smallest registered tier whose width >= requiredDeviceWidth
if none qualifies   -> largest tier, plus a development warning naming the
                       asset, the shortfall ratio, the viewport and the DPR
```

There is no safety multiplier: the margin is already in the ladder.

- **Hysteresis.** Step up immediately; step down only after the smaller tier
  has been sufficient continuously for 250 ms, so dragging a window edge does
  not thrash the network.
- **Decode before swap.** Keep painting the current raster until its
  replacement has decoded. The scene never blanks mid-resize, and a decode the
  runtime has already moved past is ignored rather than flashing backwards.
- **Never synthesize a tier.** The pipeline does not enlarge anything. A raster
  that carries less real detail than its pixel width claims must declare
  `native_detail_width`, and the runtime reports the shortfall.

### The supported fidelity envelope

> No-upscale fidelity is guaranteed wherever the required device width is 4096
> pixels or fewer. Above that the largest registered tier is used and the
> runtime records a development warning. No asset is ever upscaled by the asset
> pipeline; only the browser may upscale, only above the envelope, and only
> from the top tier.

The envelope is stated on **required device width**, not display width, and the
difference matters. For a viewport at or wider than the plate's aspect the
cover-fit camera paints the plate at roughly the display width, so the two are
interchangeable. For a viewport **taller** than the plate, height governs the
scale, the plate is painted wider than the screen and the sides are cropped: a
1920x1200 window at DPR 2 is a 3840-wide panel that still needs about 4297
device pixels of plate. Stating the envelope on display width would promise
fidelity there that no 4096 tier can deliver.

Phone portrait is a documented **compatibility observation**, not a shipping
target. At 390x844 the scene letterboxes into a band; it loads, it does not
distort, and it is not claimed as supported anywhere.

## Scenes are registered data

`EnvironmentSceneSpec` is the one scene contract. There is no second scene
schema. A spec carries the evidence fields it always had, plus the runtime
presentation fields: plate, camera policy, safe areas, UI safe zones, the
raster ladder, floor calibration, typed anchors, named occluders and surface
slots.

`src/presentation/scene-registry.ts` validates a spec and projects it into the
shape the compositor consumes. `registerScene` throws rather than registering a
scene a person could not be placed in.

Two coordinate spaces, both plate-relative, so cropping never moves anything:

- rectangles that bound the composition (`safe_area`,
  `essential_content_area`, UI safe zones) are in **plate units**;
- points and regions that pin content to the picture (anchors, contacts,
  occluder regions, surface slots) are **percentages of the plate**.

A scene may register with **no raster**. That is the honest state of a room
whose plate has not been made, and the runtime says the picture is missing
rather than borrowing another room's.

## Dynamic scene surfaces

A room stops being a static backdrop when the world already knows something
that belongs in it. A scene declares `surface_slots`; a resolver decides what
is actually on them; and text is drawn in the document over the plate, never
baked into it. Changing what a screen says never requires a new background.

Three questions have to be answered YES before a fact reaches a surface, and
each is answered by a different owner:

1. **Does the world contain it?** The simulation answers. Only canonical
   records qualify.
2. **Could this surface have come by it?** The ROOM answers, through
   `information_access` on the slot — a closed ladder of
   `public-broadcast`, `personal-household`, `public-record` and
   `institutional-working`. A television is fed by a broadcaster; a clerk's
   terminal is fed by the body's own systems.
3. **May the player-facing presentation reveal it?**
   `src/presentation/surface-projection.ts` answers. Every fact it can produce
   is enumerated there, carries the **disclosure channel** it travelled down
   (`published`, `public-record`, `institutional-working`), and is derived from
   projections that were already written for a player to read —
   `projectMeasureBriefing` and the open working document. Nothing reads a
   person's mind, memories, appraisals, setup priors, metric values or a vote
   that has not been taken.

`dynamicSurfacePayloads` joins the second and third answers, and
`bindSceneSurfaces` reports one of five states per slot: `bound`, `empty` (an
owner with nothing), `unowned` (no owner at all), `withheld` (an owner has it
and this surface has no path to it) and `decorative`. Only `bound` draws
anything. Everything else shows the decoration the scene was painted with —
never a placeholder, a skeleton, or an "awaiting data" panel, each of which is
a way of drawing something on a surface that has nothing to say.

Two directions are deliberately fail-closed. A dynamic slot that declares no
access clears nothing, because treating silence as permission is how a private
draft ends up on a television. And a class with no canonical owner — today:
headlines, election results, campaign and candidate names, seals, flags,
portraits, map labels — stays `unowned` rather than acquiring a plausible
value.

`?view=scene-gallery` binds every registered room against one named review
world so all five states are visible side by side.

An explicitly open working document owns `document-body`; measure text is a
fallback only when no working document was supplied. The current projection
input cannot prove a stable document link, so even matching titles cannot
justify replacement. Measure identity and agenda projections are independent.
The office's working-document surface and transparent semantic entry target
share the authored slot rectangle. Only the surface paints the paper; focus
and hover mark the same target without moving it away from the paper.

## Contact, perspective and depth

Placement is computed, never hand-tuned per sprite.

- The **scene** declares a floor line per anchor, and for a seat also the seat
  plane, the seat front, the seat width, and the seat and backrest z-orders.
  A seated person's feet are on the FLOOR, so a seat anchor declares both.
- The **body** declares its own contacts: left and right sole, and for a seated
  pose the seated pelvis.
- **Standing** places the sole line on the floor line, with the midpoint
  between the soles on the anchor's x.
- **Seated** places the seated pelvis on the seat plane, then checks the
  resulting sole line against the seat's floor line.

Swapping one body for another at the same anchor therefore keeps contact with
no per-character retuning. A body that declares no contacts still places, by
its pelvis root, and the runtime records that its contact is unverified rather
than implying it was checked.

**Perspective** is a bounded linear ramp between two authored floor calibration
pairs (`near` and `far`), clamped rather than extrapolated. That is correct for
a single-vanishing-point interior at a roughly horizontal camera, which is
every plate this project plans. There is deliberately no projective camera: the
generation pipeline cannot supply truthful camera intrinsics, and inventing
them would be fabricated measurement precision.

**Perspective depth and paint order are separate fields.** Depth is the floor
line a person stands on; paint order is `zOrder`. They no longer share a name.
People in one scene sort by floor line, with `zOrder` breaking ties, so
ordering never depends on DOM insertion order.

**Named occluders** each carry their own z-order and optional region. A desk
front and a chair arm occlude a seated person differently, and one flat mask
cannot express that.

**Surface slots** are presentation sinks only. A slot says where a document,
seal or tally would be painted and what class of thing may go there. It never
decides that such a thing exists — the simulation owns that.

## The modular person production contract

- **Master minimums by class** (`src/presentation/component-masters.ts`):
  standing body >= 1696x2528, seated body >= 1530x2048, head >= 1024x1024 and
  square, everything else >= 1024 on the long edge. An undersized master is
  **rejected**, never enlarged, and the rejection states the enlargement it
  would have needed.
- **`art_class`** separates production components from frozen development
  fixture art. Fixtures are exempt from the dimension floor, say so in the
  manifest, and are never promoted into the production library.
- **Complexion** is SOURCE ART on bodies and heads, in named art-direction
  bands. It is never a runtime recolour, never demographic truth, and never
  inferred from a person's name or any other property. One head family is one
  complexion; a head must be able to reach a body of the same complexion in
  every body family it claims.
- **Required slots** are enforced at resolve time. A person with an empty
  required slot is not complete, however well the rest of them draws.
- **Blocked slots** let a garment refuse a conflicting layer rather than
  drawing through it. Blocking a required slot is a validation error.
- **Facing** must agree across body, head, hair and garments. Nothing is
  mirrored: directional lighting alone disqualifies mirroring for any asset
  composited into a lit plate.
- Identity, recipe version and catalog-generation pinning are unchanged. A
  catalog generation is frozen once written; growth is append-only.

## Development warnings

The 10A W1-W10 family, raised as data rather than exceptions so a wrong-looking
person and the contract that was broken appear in the same view:

| #   | Meaning                                                     |
| --- | ----------------------------------------------------------- |
| W1  | Seated pelvis misses the seat plane                         |
| W2  | Feet miss the floor line                                    |
| W3  | Sprite exceeds the anchor's footprint                       |
| W4  | Pose not permitted at this anchor                           |
| W5  | Body family not permitted at this anchor                    |
| W6  | Facing not permitted, or no art for this facing             |
| W7  | Selected raster is under-resolved for this viewport and DPR |
| W8  | Incompatible slot combination                               |
| W9  | Required slot empty                                         |
| W10 | Asset is not runtime approved                               |

Development warnings are allowed to be technical. **Player-facing fallback copy
is not**: it says what is actually being shown, names the person, and never
mentions slots, assets, anchors, tiers or contracts.

## Development surfaces

- `?view=character-proof` — the modular component compositor.
- `?view=scene-proof` — the scene and person presentation proof: the same
  generated people placed in two rooms by contact metadata alone, with the
  overlay drawing every declared plane, contact, footprint, occluder, surface
  slot, derived scale and the selected raster tier.

Neither route is reachable from the production route.

## Asset intake

`npm run inventory:masters -- <folder> [report.json]` measures a folder of
candidate masters before intake: pixel dimensions, whether the alpha channel
genuinely varies (a picture that only looks cut out is a recorded failure
mode), SHA-256, and the class minimum verdict. It never modifies a source file
and exits non-zero when any candidate fails.

## Frozen asset decisions

- The prompt30 office lineage's true native detail is 1024x572. The shipped
  2048x1144 file is a 2x resample of it and carries no more detail. It is
  **frozen as development fixture art** and is not the office master of record.
- The A01/B01 seated characters are 765x1024 fixture art with no larger source.
  Frozen.
- Backgrounds derive 4096/3072/2048/1024 tiers from a master of at least 5120
  wide; 4608 is the absolute floor.
- The top 20% of every landscape plate is expendable on ultrawide, and the
  outer ~15% left and right should hold nothing mandatory.
