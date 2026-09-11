# PEOPLE-VISUAL4 candidate combination proof

This continues checkpoint44aea4bf on PR134. It does not promote candidates,
change production membership, regenerate source art, rewrite D-068 admission
records, or waive the 3% fit gate. Source rights and native/upscale status remain
unknown where the recovered lineage says unknown.

## Actual consumer

Open `/?view=character-proof&set=visual4`. The developer-only route supplies the
isolated candidate libraries to reusable `PersonAppearanceControls`, canonical
World selection and serialization, `PersonPortrait`, and the registered scene
compositor/`SceneBackdrop`. Save/reload uses an isolated review key. The #144
owner mounts the same feature-local controls and per-person wardrobe adapter in
ordinary dossiers, conversation, personal workspace and post-generation creator
flows using the existing World and per-save UI store. A candidate library is an
explicit review input, never a production import.

The review camera contains the union of the rendered layer bounds and plate.
It does not stretch the body, change the rig, or improve a fit residual.

## Available combinations

The corrected bank has11 bodies (9 standing,2 seated),9 separate heads,
24 tops,12 bottoms and108 exact body/shoe derivatives. The new frontal revision
excludes the visibly three-quarter average-man-B source; the old candidate is
retained. All36 garments were run against all11 bodies. All12 recovered front
shoe sources were run against the same body set. No first-pair content cap.

| Standing body          | Tops | Bottoms | Shoes | Complete wardrobe combinations |
| ---------------------- | ---: | ------: | ----: | -----------------------------: |
| Average man A          |   12 |      12 |     1 |                            144 |
| Average woman A        |   11 |       1 |     1 |                             11 |
| Average woman B        |   11 |       1 |     1 |                             11 |
| Fat man A              |   10 |       1 |     2 |                             20 |
| Skinny man A           |   10 |       1 |     2 |                             20 |
| Older woman A          |    0 |       1 |     1 |                              0 |
| Older woman B          |    0 |       1 |     0 |                              0 |
| Skinny woman A/B, each |    0 |       1 |     1 |                              0 |

These206 combinations are candidate composition coverage, not206 independent
human approvals. Each supported identity also exposes bald plus55 recovered
frontal hairstyles on each of9 exact heads. Hair derivation has549 inspected
source/head pairs,495 usable fronts and99 paired backs; excluded styles and
source hashes are in `../people-visual4-hair/README.md` and its pair report.

The532 body/wardrobe report entries separate84 measured candidate pairs,
312 failed fits,96 incompatible poses,27 measurement limitations,9 source-layer
engineering cases,1 view exclusion and3 unavailable body palette matches.
The JSON records exact IDs, transforms, row windows, residuals, source hashes,
attachment authoring and limitations. Empty compatibility means refusal.

## What the measurements establish

New image-space neck/shoulder/waist/hip/hem authoring is explicitly game-authored;
it is not a claim about hidden anatomical joints or physical measurements.
Existing native-sized crop sources are uniformly reduced; no raster is enlarged.
Body/head/garment pixels keep their source lineage. Separate heads render above
the top's opaque rear collar; neck-guide pixels are cut below the declared join.

The ease metric maps corresponding authored body rows without extrapolation.
Its maximum proportional error is independent from the maximum pixel error.
A regression demonstrates the old false pass:8px at a500px shoulder is1.6%, but
4px at a100px waist is4%. The unchanged3% gate now rejects that pair. One old
rejected wardrobe report value was corrected from27.06% to30.96%; historical
source, derivative and registry bytes were verified unchanged through the new
`derive:wave-a-wardrobe -- --refresh-measurements` path.

Shoe width100 was rejected as an oversized diagnostic. The new explicit source
unit is86px against the reference's visible69/70px forefoot plus approximately
8px shell per side, fixed across targets. Placement averages visible upper-foot
and middle-lower-foot centers and preserves each foot's visible floor row.
The report exposes shell-width ratios and checks interior uncovered alpha pixels
as well as outer edges, independently per foot. This does not grant visual
acceptance to ankle opening, perspective or sole fringe.

## Precise remaining needs

- **Engineering / failed fit:** older/skinny woman tops and most non-reference
  trousers fail the unchanged affine gate. The original sources exist. Inspect
  authored correspondences and residual overlays before deciding whether a
  permitted richer fit or a matching source is needed. Bounded warps remain
  withheld from ordinary projection under D-080.
- **Engineering / occlusion:** the female burgundy polo has painted forearms;
  isolate its garment pixels before modular use. Some skinny-body shorts expose
  a baked underwear waistband. A candidate mask or revised waistband attachment
  needs proof; a width pass does not prove this join. No new art is inferred.
- **Measurement limitation:** lower shorts legs/inner openings and hems lie
  outside the torso/hip ease window. Open pumps/sandals intentionally expose feet
  and need insole/heel-pose mapping; full-foot coverage cannot certify them.
  Closed-shoe failures include perspective/contact mismatch. Source sole fringe
  needs cleanup. All source pixels are retained for those repairs.
- **Missing in the recovered exact-pair set:** no independent seated lower
  garment has been verified for the two seated bodies. No matching deep-palette
  body exists in this11-body revision for the three recovered deep heads.
  Fat-woman candidates inspected so far are prop-bearing, ambiguous or partial;
  no complete prop-free frontal source was recovered. These are bounded source
  findings, not proof that every other project source lacks those pixels.
- **Source recovery:** larger24-top/12-bottom/12-shoe crops were already banked;
  the shoe parent is4336×5804 despite its filename. OldPG equivalent crops remain
  220/221×246 across verified copies.63 existing hair crops were recovered with
  source hashes and parent lineage. No generation wave or native4K claim occurred.
- **Acceptance / integration:** human art acceptance, final production catalog
  admission and #144's combined normal-route browser proof are separate from
  these candidate engineering checks. ENV owns the current scene occlusion
  repair; this branch does not replace that patch.

## Replay and proof

Run `npm run derive:people-visual4 -- --check` and
`node --import tsx scripts/art-asset-factory/people-visual4-hair.ts --check`.
Both replay source-derived pixels and registry/report evidence. The diagnostic
`people-visual4-overlay.ts [output.json]` serializes actual shared layer
projections for contact-sheet inspection; it is not a second fit compositor.

Focused tests cover the corrected metric, every usable hair/head pair through
the render plan, canonical identity and wardrobe A/B/A through serialization,
shared portrait and registered scenes, and full-figure framing. Browser and
serialized full-validation results are recorded in the delivery evidence after
the coordinated finite slot. Passing tests are not human visual acceptance.

Final execution evidence is in `docs/agent/evidence/people-visual4/README.md`.
Frozen code64b49a7 passed2/2 browser proofs after visual inspection corrected
preview containment and washout. All validation phases passed after refreshing
stale prose/fit evidence and rerunning the four affected suites (127 tests).
The corrected fixture affine is3.14%; its harness-only bounded warp is1.12%.
Production fit transforms/classes and all fixture pixels remain unchanged.
