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
