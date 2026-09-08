# PEOPLE1 — Wave A candidate admission and character review

Status: **complete, awaiting independent acceptance and owner style review**
Branch: `claude/people1-existing-art-assembly`
Base: accepted `main` at `89b2f7649f4db6225f8b16fdc1d2e762013ad62f`, composed with
current `main` at `da939329fcc3ae0a2eb9db8016665738b40733d4` (PRs #127 and #128)
by ordinary merge. The only conflict was the corpus literal count, which both
sides had moved; it was re-measured on the composed tree rather than taking
either side's pin, and `npm run corpus:prose` was re-run.

## Open this in ninety seconds

```bash
git fetch origin && git worktree add ../PEOPLE1-review claude/people1-existing-art-assembly
```

```bash
cd ../PEOPLE1-review && npm ci && npm run dev
```

Then open **`http://localhost:5173/?view=character-proof&set=wave-a`**.

Pick a body from the **Body** menu. The figure is drawn at the same plate, camera
and body width the developer proof uses for people, so its size on screen is the
size a person is. Everything under it is the evidence for that one body: what it
can wear, what it cannot and why, what was measured, what could not be, and where
the reviewed pixels disagree with the label the file was carrying.

The two neighbouring surfaces are unchanged and still one click away:
`?view=character-proof&set=real` (banked pg parts, whole people) and
`?view=character-proof&set=dev` (procedural fixtures).

The same fourteen figures are checked in as PNGs under
`docs/agent/evidence/people1/`, captured through that surface by
`tests/e2e/candidate-admission-review.spec.ts`.

## What this job did

PR #90 concluded that fifty-one Wave A body crops already exist and that the
blocker had stopped being an absence of art: none of them was registered
anywhere a recipe, a compositor or a reviewer could reach. This closes that
handoff.

- `npm run admit:wave-a-candidates` measures all fifty-one, authors a reviewable
  pose disposition for each, and writes two generated files:
  `art/manifest/character_candidate_registry.json` (candidate-only, twelve
  admitted bodies) and `art/qa/p95-wave-a-morphology/wave-a-admission-report.json`
  (every crop, admitted or not, with its evidence).
- `src/presentation/candidate-review.ts` lifts that registry — pooled with the
  thirty-five already-banked pg candidates — into a throwaway review library and
  composes it through the **accepted** resolver, projection, render plan and
  scene transform. There is no second compositor.
- `?view=character-proof&set=wave-a` is the review surface.

## What production could render, before and after

**Unchanged. That is the intended result.** The admission writes to a separate
file, every record in it is an unreleased `character-component-candidate`, and
nothing in the production manifest, catalog or generation signatures moved.

Distinct complete recipes the resolver actually produces (measured by resolving
20,000 deterministic appearances per library and counting distinct complete
identities, not by multiplying slot totals):

| Library                                                    | `standing-neutral`         | `seated-at-desk`            | `seated-guest-neutral`     |
| ---------------------------------------------------------- | -------------------------- | --------------------------- | -------------------------- |
| Production (DEV fixtures, generation 2) — before and after | 304 complete               | 256 complete, 48 incomplete | 0 complete, 304 incomplete |
| Banked pg candidates (review only) — before and after      | 468 complete               | —                           | 0 complete, 468 incomplete |
| Pooled candidate review — after                            | 468 complete, 6 incomplete | —                           | 0 complete, 474 incomplete |

The 304 production recipes are **procedural DEV fixtures**, not art anyone has
accepted. The 468 pg candidate recipes are real art and are the ones worth
looking at; they are also the ones showing the documented gray-skin defect,
because the pg body master is an untextured mannequin.

The admission adds **zero** complete recipes. It adds six morphology families and
twelve bodies whose wardrobe has never been drawn. Saying that plainly is more
useful than a number that went up.

## The admitted evidence subset

Twelve of fifty-one, across all six full-body morphology families:

| Disposition                      | Count | Meaning                                                                         |
| -------------------------------- | ----- | ------------------------------------------------------------------------------- |
| `admitted-candidate-body`        | 12    | Propless, complete, front-facing, rig measurable                                |
| `retained-unregistered-facing`   | 19    | Three-quarter, profile or back — no registered pose family declares that facing |
| `retained-baked-prop`            | 17    | A chair, desk or lectern is painted into the crop                               |
| `retained-ambiguous-observation` | 2     | The reviewer could not read the facing confidently                              |
| `retained-partial-figure`        | 1     | A torso, not a body                                                             |

Ten are `standing-neutral`; two — `wave_a_average_woman_seated_front_neutral_v1`
and `wave_a_skinny_woman_seated_front_neutral_v1` — are `seated-guest-neutral`
and are **the first real seated bodies the project has**. Every previous seated
route failed closed for want of one.

### How a pose was decided

A filename is not a pose. Each crop was inspected directly at review scale and
given an explicit observation — posture, facing, baked prop, figure extent,
confidence — recorded in `WAVE_A_VISUAL_OBSERVATIONS` with the reviewer and
method named. The sweep's `apparentPoseCategory` is carried as the prior claim
and compared afterwards. **Twelve rows disagree with it**, in both directions:
`wave_a_skinny_man_standing_neutral_back_v1` was recorded as carrying a LECTERN
and carries no prop at all; `wave_a_skinny_man_standing_lectern_interaction_v1`
and `wave_a_skinny_man_seated_interaction_surface_v1` were recorded as NONE and
both have a surface painted through the hands.

Rows for one authored pose are judged together, because the source sheets are a
matrix: reading one tile as frontal and its five siblings as three-quarter would
be an inconsistency in the reviewer, not a difference in the art.

### What was measured, and what was left missing

The rig comes from the accepted `measureBodyRig` silhouette measurement in
`scripts/art-asset-factory/pg-modular-intake.ts` — the same algorithm the pg
intake used, not a second one. It yields `crown`, `head` (neck), `torso`
(shoulder line), `hips` (waist) and `feet` (sole), plus foot contacts where the
sole band resolves two feet.

Left unresolved, on every record:

- **`brow`** — hair attaches to it and these rasters have blank faces, so there
  is no brow line to measure. It is absent from the anchors, which is why
  `validateProductionBodyAnchors` correctly rejects all twelve for production.
- **`root`** — the pelvis-hip-centre is an interior joint and is not observable
  in a silhouette. The emitted root is the _measured_ waistband row, a
  measurement-derived visual estimate, non-authoritative under D-068.
- **complexion band** — an art-direction assignment, not a measurement.
- **rights** and **owner style acceptance** — unknown and unassessed.
- **foot contacts on `wave_a_average_man_standing_neutral_front_b_v1`** — the
  sole band resolves something other than two feet, so no floor line is
  declared. The review surface places it by rig root and says so rather than
  nudging it onto the line.

## Placement and contact

A body is placed by putting its own measured sole on one declared review floor
line, computed from the contact and the canvas aspect. No per-body number is
tuned by eye. The line is drawn on the stage so a reviewer can see the contact
they are being asked to judge.

It is a **review constant, not a calibrated scene floor**. The developer proof
stage has no plate and no floor calibration, so nothing here claims a body is
standing on the office floor.

## Remaining gaps, separated by kind

| Gap                                                                                                                                                                                | Kind                                | What closes it                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| No head, top, bottom or footwear declares a `wave-a-*` body family                                                                                                                 | **missing garment/head art**        | Author or re-fit wardrobe for these six morphologies. Existing pg garments were drawn on the pg mannequin and are not measured against these silhouettes; nothing was stretched onto them. |
| No `brow` anchor on any Wave A body                                                                                                                                                | **source crop defect (blank face)** | A face is needed before hair can attach. The body's own head geometry is present; only the face is blank.                                                                                  |
| 19 crops in facings the registry does not declare                                                                                                                                  | **missing pose contract**           | Every family in `art/manifest/pose_families.json` declares `facing: "front"`. Three-quarter, profile and back need registered families before that art is reachable.                       |
| 17 crops with a chair, desk or lectern painted in                                                                                                                                  | **supported authoring correction**  | The prop has to come out of the raster; a modular body cannot carry its own furniture.                                                                                                     |
| 1 crop is a torso, not a body                                                                                                                                                      | **source crop defect**              | Re-chop from the sheet, or retire it.                                                                                                                                                      |
| The office scene has no standing anchor, and its seated anchors declare `seated-at-desk` / `seated-in-guest-chair` while the admitted seated bodies declare `seated-guest-neutral` | **missing scene contract**          | A Wave A body cannot be placed in the accepted office today. This needs a scene anchor and a pose-family reconciliation, both owned by scene authoring — not more art.                     |
| Rights on the source sheets                                                                                                                                                        | **missing rights**                  | Owner/legal. Unknown, and left unknown.                                                                                                                                                    |
| Whether this illustration style is the game's style                                                                                                                                | **missing owner style approval**    | Owner. Not inferable.                                                                                                                                                                      |

**No generation brief is proposed here**, because the packet asks for one only
where pixels are genuinely missing and the first two rows above are the same
question — whether to dress these bodies — which is an owner decision about
style before it is a production request.

## The small owner decisions that would unblock release

1. **Is this illustration style the game's style?** The Wave A bodies are flat
   cel-shaded and skin-toned; the banked pg bodies are photoreal gray mannequins
   with photoreal faces. They cannot both be the look. Everything else waits on
   this.
2. **If yes: wardrobe for six morphologies, or fewer?** Twelve bodies × four
   required slots is the whole cost. Choosing three families instead of six
   halves it and still covers lean, average and heavy.
3. **Faces.** These bodies carry a head with no face. A face overlay for this
   style is a distinct art request from the pg photoreal face masters.
4. **Are the seventeen prop-baked crops worth correcting**, or should those poses
   be redrawn propless? Both are cheap; only one is worth doing twice.

## Boundaries held

- No production manifest, catalog entry, generation signature, release flag or
  frozen asset changed. A test recomputes every production generation signature
  and asserts the ledger still agrees with it.
- No source raster was written. Every crop is re-hashed against the sweep's
  recorded SHA-256 in both the generator and the test suite.
- No garment was fitted, warped or transformed onto a Wave A body. The fit bank
  is untouched.
- No image was generated.
- One narrow change to accepted code: `resolveCharacterRecipe` gained an
  optional `unresolvableRequiredSlots: "diagnose"` that turns "this library
  cannot dress this body" from a throw into a diagnostic. It defaults to the
  existing throw, no runtime caller passes it, and a test asserts the throw is
  still there without it. Without this, banked evidence could not be composed at
  all, which is the exact handoff #90 asked to close.
- PR #90's arm-measurement tool was read as evidence and not merged, copied or
  depended on.

## Regenerating

```bash
npm run admit:wave-a-candidates
```

Deterministic: `tests/wave-a-candidate-admission.test.ts` re-runs it and compares
the result to the checked-in registry byte for byte, twice, to catch
non-determinism.

---

# PEOPLE1-R1 — clothing the admitted bodies from existing art

Status: **partial checkpoint, explicitly evidenced.** Continues the same PR on
the same branch. The admission above is preserved exactly: its registry, its
report and all fifty-one source crops are read and never rewritten.

RETURN-REVIEW1 found the admission sound and the job incomplete, with one
correction that turned out to be the key to the whole task:

> `no wave-a-* family declaration` is NOT evidence of missing garment art. […]
> Correct classification is UNMEASURED COMPATIBILITY until tested.

That was right, and the reason nothing had been measured turned out to be
mechanical rather than artistic.

## Four measured findings

### 1. The admitted crops are not on the modular runtime canvas

Every banked garment was normalized against a **960 px** body. An admitted
Wave A crop is **1642–1752 px** tall. `projectCharacterLayers` sizes a
component as `component.canvas / body.canvas`, so a banked garment lands on a
Wave A crop at **55–63%** of the size it should be. That is a units mismatch,
not a morphology one, and it is far outside any fit bound — which is why no
compatibility question could even be _asked_, let alone answered, before now.

`npm run derive:wave-a-wardrobe` resamples each admitted crop DOWN onto the
runtime canvas (scales 0.5915–0.6341, asserted to be reductions; nothing is
enlarged and no source crop is written). Twelve runtime bodies, 295–458 px wide
by 960 tall, directly comparable with the 343/345 px pg bodies.

### 2. The `hips` garment anchor is the measured WAIST, on every measured body

`character-components.ts` states the contract in its own words: `hips` is "the
line on the outside of the body where a bottom's waistband sits", at or below
the pelvis root. `measureBodyRig` emits `rig.waistRow` for it.

| body                                             | declared `hips` | measured hip | measured crotch |
| ------------------------------------------------ | --------------- | ------------ | --------------- |
| `dev_g2_body_broad_light_standing_v1` (authored) | 0.540           | 0.499        | 0.549           |
| `pg_body_fl_standing_v1` (measured)              | **0.339**       | 0.493        | 0.497           |
| `pg_body_ml_standing_v1` (measured)              | **0.348**       | 0.526        | 0.540           |
| `wave_a_average_man_standing_neutral_front_a_v1` | **0.376**       | 0.566        | 0.579           |

Every bottom in the bank hangs from this anchor, so on the pg surface that
ships today trousers start at the ribcage and end mid-shin — the bare grey
shins visible under every figure at `?view=character-proof&set=real`, and the
"knee" skirt that reaches the upper thigh. The derived runtime bodies place
`hips` on the measured hip line: the widest central run between the waist and
the crotch.

### 3. A Wave A body paints its own head

All twelve. The review surface reported `head` as a required slot with the
refusal "no head declares body family 'wave-a-average-man' as compatible: the
art has never been drawn for this morphology" — which reports the modular
contract's assumption that a body carries no head, not anything about the art.
`baked_slots` records what the raster actually paints, measured (opaque rows
above the body's own neck anchor), and the resolver and the review surface no
longer ask for a head that is already there.

### 4. Asset selection ignored `compatible_body_families` — a live defect

`resolveCharacterRecipe` filters FAMILIES against the body family, then picks
any asset within the chosen family filtered only by pose and facing. A garment
family holds one derivative **per body family**, so the context stage could
choose a derivative cut for a different silhouette. It does, today: the checked
in proof screenshot for the `real` set shows `Ray Hale`, a `pg-female-lean`
person, wearing `pg_top_005_long_sleeve_button_shirt_ml_v1`. Fixed, with the
new `slot-family-has-no-art-for-body` diagnostic naming the case where a family
reaches a body but no derivative in it does.

## What was derived, and what it measures

`npm run derive:wave-a-wardrobe` derives a wardrobe for each admitted
morphology from the garment masters the project already owns — no new pixels,
the same keying, cropping and Lanczos resampling the pg intake performs. Twelve
runtime bodies and **68 derived garments**. Vertical scale comes from the
anchor span the garment is authored across (`shoulder→hip` for a top,
`hip→ankle` for a bottom); horizontal from the spec's own measured width
reference on that body.

Complete clothed Wave A people now compose through the accepted resolver,
projection, render plan and scene transform at `?view=character-proof&set=wave-a`.
Before this they were bare bodies in baked underwear.

**Nothing is approved.** Every record is an unreleased candidate in no catalog
generation. `art/qa/p95-wave-a-morphology/wave-a-wardrobe-report.json` carries
the measurement for all 68, and the honest summary is:

**0 of 68 sit inside the accepted 3% edge bound.** Worst coverage residual runs
6.5–43% of the body span. The largest are at the shoulder and the waist, and
they are the same defect in two places: these masters are **flat lays**. A
flat-laid shirt is narrow where it buttons at the neck and cannot cover a
rounded shoulder, and its bbox at the waist row is sleeve-tip to sleeve-tip. A
bounded affine does not fix either.

### Limits of the measurement, stated

- The accepted `measureEdgeError` compares a garment against the ease the same
  garment carries on the body it was drawn for, keyed by **normalized y**. That
  is right between bodies sharing a canvas and a framing — the generation-2
  rigs it was calibrated on — and wrong here: a Wave A crop puts its shoulder
  at 0.225 of its canvas where the pg mannequin puts it at 0.198. Its numbers
  are carried in the report as `ease_metric_derived` and must not be read as a
  verdict. The summary figure is the framing-independent landmark residual.
- The landmark residual on a garment's own attachment row measures the shape of
  a flat lay, not a fit. It is reported (`on_attachment_row`) and excluded from
  the coverage figure.
- The "authored proportion" carried across from the pg set **disagrees with
  itself by up to 35%** between the two pg bodies (jeans: 0.827 from
  female-lean, 1.116 from male-lean), because the banked garment is width-scaled
  and its length is whatever the aspect ratio gave. The reference body is named,
  the check body's value is recorded beside it, and derived hem lengths inherit
  that uncertainty. This is the largest open source of error in the derivation.
- `chest` and `knee` are not measured and are not invented: neither is a feature
  of a front-on silhouette.

### Refused by pose, not by taste

The two seated bodies get tops derived across their own measured shoulder-to-hip
span. They get **no bottoms and no footwear**: the banked bottoms are straight
flat lays drawn for standing legs, and placing one on a bent thigh is a
cross-viewpoint fit the accepted contract refuses outright. Four refusals, each
recorded with its reason. Nothing is flattened to raise a count.

## Exact remaining gaps

| Gap                                                 | Kind                     | Evidence                                                                                                            |
| --------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| No fat-woman body in the admitted set               | **missing pixels**       | Six families admitted; `wave_a_additional_fat_female_*` crops are one baked-prop, one ambiguous, one partial figure |
| No face on any Wave A body                          | **source crop defect**   | All twelve carry a head with a blank face; hair attaches to `brow` and no brow line exists to measure               |
| Garment shoulder coverage                           | **missing pixels**       | 6.5–43% uncovered at the shoulder/waist; flat-lay masters, not fixable by a bounded transform                       |
| Seated bottoms and footwear                         | **missing pose art**     | 4 refusals; needs garments drawn for a seated viewpoint                                                             |
| Hem length uncertainty                              | **missing metadata**     | The authored proportion disagrees by up to 35% between the two pg reference bodies                                  |
| Rights on the Wave A sheets and the pg masters      | **missing rights**       | Unknown, left unknown                                                                                               |
| Whether this illustration style is the game's style | **owner style approval** | Two styles cannot both be the look; not inferable                                                                   |

## Not done in this checkpoint

Named, not glossed:

- The render plan still reports `head` in `MISSING` for a baked-head body; the
  resolver and the review surface honour `baked_slots`, `buildCharacterRenderPlan`
  does not yet.
- Serialize/reload identity proof with a real wardrobe change is not written.
- Scene placement against the office anchors and the production person/portrait
  consumers are untouched; no person adapter is added.
- No test covers the wardrobe derivation, and its outputs are not yet in
  `npm run validate`.
- `npm run derive:wave-a-wardrobe -- --check` exists but regeneration
  determinism is not asserted by a test.
