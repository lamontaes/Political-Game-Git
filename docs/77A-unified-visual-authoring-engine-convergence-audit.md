# 77A — Unified Visual Authoring Engine: Convergence Audit and First Slice

Status: **audit complete; first slice implemented on
`claude/arm-sleeve-measurement-contract`, based on the exact PR #89 head
`8cc72e334e5076f63ad33462564125fc64a6f091`.** PR #89 is untouched. PR #87 is
untouched. PR #88's files are not absorbed.

The question asked was whether one deterministic visual-authoring layer can
converge the modular character, morphology, pose, scene, contact, occlusion,
surface, QA and garment-fit systems and materially reduce the art workload —
and whether the sleeve gap PR #89 left open can be closed by measuring arms.
This document answers it from the code and the pixels, and says where the
evidence stops.

## 1. Verdict

**PARTIALLY.** The engine already exists as a set of contracts; what it
reduces is tuning and per-morphology regeneration of body-attached garments
below the shoulder line. It does not and cannot reduce viewpoint, pose, child
and adolescent, expression or scene-background generation, and sleeves are
not yet inside its reach: arms are now measured, and the measurement says the
upper arm is not in the alpha of any body the repository holds.

## 2. What already exists and must not be rebuilt

Everything below was read, not assumed. Each is one implementation shared by
the validator, the CLI tooling and the browser runtime.

| System                                    | Owner                                                                                                    | State                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Modular identity and component resolution | `src/presentation/character-components.ts`                                                               | Catalog generations frozen by signature (D-063/065).                           |
| The one compositor                        | `projectCharacterLayers`, consumed by `character-render-plan.ts`                                         | Now folds in D-074 fits; renders bands only if declared.                       |
| Garment morphology fit                    | `src/presentation/garment-fit.ts`, `scripts/art-asset-factory/garment-fit-measure.ts`, PR #89            | Direct → affine → bounded warp → refused, measured.                            |
| Pose contract                             | `src/presentation/pose-families.ts`, `art/manifest/pose_families.json`                                   | 18 nominal landmarks per family incl. shoulder/elbow/wrist/hand.               |
| Body semantic anchors                     | `CHARACTER_SEMANTIC_ANCHOR_ORDER`, `validateProductionBodyAnchors` (D-068)                               | crown/brow/head/torso/hips/feet; measured by a human from the shipping raster. |
| Contacts                                  | `CharacterBodyContacts`, `seated-contact.ts`, pose registry `contacts`                                   | Feet and seated pelvis, tolerance-checked.                                     |
| Scene registry / placement / camera       | `scene-registry.ts`, `scene-placement.ts`, `scene-transform.ts`                                          | Data-driven; scaffold emits explicit unknowns.                                 |
| Dynamic surfaces                          | `surface-binding.ts` (D-072)                                                                             | A surface says nothing unless a canonical owner fills it.                      |
| Raster tiers, manifest, release gates     | `raster-tiers.ts`, `validate.ts`, `asset_manifest.json`                                                  | No repository upscaling; lineage declared.                                     |
| Intake, chop, despill, measurement cards  | `pg-modular-intake.ts`, `source-sheet-chop.ts` (D-073); PR #88 `edge-despill.ts`, `measure-reference.ts` | Alpha-projected chop; despill never writes alpha.                              |
| Proof surfaces                            | `?view=character-proof`, `scene-proof`, `scene-authoring`, `production-office`, `scene-gallery`          | Read-only developer routes over the real runtime.                              |

The body landmark representations found before adding one: the pose registry's
nominal landmarks (fixture-derived, nominal canvas), `measureBodyRig` (rows
only, no arms), the six semantic anchors (no arms), and the fixture polygon
arms. None measures an arm from a shipping raster. The new report is keyed the
way the fit bank is — body family × pose family — and extends the measurement
side of the repository rather than adding a second body schema.

## 3. Classification matrix

**A. Deterministically automatable (exists or added this slice)** — source
intake and chop, alpha QA, despill, silhouette and body-span measurement,
torso fit derivation and refusal, affine and bounded-warp transforms,
contact checking, raster tiers, release validation, contact sheets, candidate
manifests, **arm landmark and cross-section measurement per side and pose**,
**sleeve-fit readiness gating**.

**B. Human or AI-assisted, not safe to invent** — the six semantic anchors on
a production body (D-068 stands); confirming that a contour bow is the elbow;
the inner edge of any fused arm (a painted line, not alpha); seat planes,
occluder polygons, horizon and floor calibration where the estimate is weak;
dynamic-surface identification (PR #88 finds flatness, never the object);
unusual garment semantics.

**C. Genuinely requires new art** — unseen viewpoints (front-on footwear from
three-quarter pairs); child and adolescent bodies; poses absent from source
(lectern, seated-at-desk with forearms on a surface); garments outside the
bounds; **any sleeve configuration whose upper arm or hand is fused in the
source**, because no 2D transform synthesises an edge the source never drew.

## 4. Arm measurement result

Implemented in `scripts/art-asset-factory/arm-measure.ts`; contract in
[Arm and Sleeve Measurement](./systems/arm-and-sleeve-measurement.md).

**What can be measured.** On a hanging arm: the shoulder tip (silhouette
rule), the wrist (narrowest cross-section followed by a widening), the
extremity, forearm and elbow cross-sections, forearm length and angle, and the
elbow as a contour bow region. On a raised or forward arm: the shoulder, the
root of the separated forearm, and — where the forearm's rows do not rejoin the
torso — its wrist and width.

**What cannot.** The inner edge of any fused row, which means every upper arm
on every body measured; every arm of a seated pose with hands on the thighs;
the elbow joint centre; layering (front of or behind the torso); a wrist on
an arm whose hand clenches or whose forearm rows rejoin the torso.

**Representation.** `ArmMeasurementEntry` — asset, sha256, body family, pose
family, canvas, figure rows, and two `ArmSideMeasurement`s. Each side carries
status, posture, four landmarks, two segments, an elbow bend, five widths, an
outer and inner contour, separation statistics, layering, and the deviation
from the pose registry's nominal landmarks. Every value has a status from
`measured` / `partially-measured` / `ambiguous` / `occluded` / `unavailable`
and an evidence class.

**Real production bodies.** The two banked production candidates
(`pg-female-lean`, `pg-male-lean`, real 3D-rendered masters) and the eight
Packet 71 adult-feminine poses are measured from their actual pixels. The
Packet 71 bodies are not in the manifest; the tool takes them from the
disposition record the chop wrote, checks the sha256 it recorded, and labels
their family unregistered. Pointing the tool at the next approved master means
adding it to the manifest with a pose family; nothing in the tool is edited.

## 5. Sleeve result

- **Direct reuse:** viable only within a body family and pose, as today.
- **Affine:** plausible along the forearm on the one pose with two measured
  morphologies (lean masc → lean fem forearm ratio 0.905, angle delta under
  1°), but unproven: the upper arm the sleeve attaches to is occluded on both.
- **Bounded warp:** the torso's horizontal band warp is the wrong shape for a
  sleeve; a sleeve varies along its own axis, not along canvas rows.
- **Independent transforms / layers:** not decidable from this evidence. The
  evidence needed is a lean and a heavy body in the same pose with arms held
  clear, or the interior arm line read from colour. Splitting tops into torso
  and two sleeves is NOT recommended on today's evidence: it would triple the
  top layer count and multiply per-pose art for a benefit that cannot yet be
  measured.
- **Requires separate art:** every seated hands-on-thighs arm; every pose
  whose forearm rejoins the torso; any sleeve on a child or adolescent body.

The readiness gate is implemented and fails closed; on the current bodies it
passes for one pairing and refuses fifteen.

## 6. Economics

Categories are labelled by the kind of evidence behind them.

| Category                                         | Reduction                                                          | Evidence class                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Adult body-family multiplication of tops/bottoms | Large: one raster per garment, per pose, instead of per morphology | Measured production evidence (dev-g2, PR #89) and synthetic fixture proof (lean/average/heavy) — no real heavy-in-standing-neutral top yet |
| Sleeveless tops, bottoms                         | 2–3× fewer                                                         | As above                                                                                                                                   |
| Short sleeves                                    | Unknown                                                            | Arm measured only from the elbow down; a short sleeve ends above it                                                                        |
| Long sleeves, jackets                            | Not yet                                                            | Upper arm occluded on every measured body                                                                                                  |
| Footwear                                         | None                                                               | Measured: safe as drawn, or viewpoint gap (76A §5.5)                                                                                       |
| Accessories, heads, hair, eyewear                | None needed                                                        | Measured: placement identical across families                                                                                              |
| Poses                                            | None                                                               | Every pose is new geometry; the registry only prevents wrong substitution                                                                  |
| Child / adolescent                               | None                                                               | No measured adult-to-child compatibility; none may be derived                                                                              |
| Expressions, scene backgrounds                   | None                                                               | Outside every contract here                                                                                                                |
| Scene integration and tuning                     | Moderate                                                           | Scaffold, contacts, surface binding remove hand-tuning; anchors still human-authored                                                       |

**Does arm measurement materially reduce generating the same shirt for lean,
average and heavy adults?** For the torso of the shirt, yes, and that was
PR #89's result, conditional on real morphology bodies. For the sleeves, not
yet: the measurement shows the sleeve attachment region is fused on every real
body, so a reusable sleeve is still a projection. The honest count today is
that a sleeveless garment needs one raster per pose across adult morphologies
and a sleeved garment still needs one per morphology until an upper arm is
measured.

## 7. Hard limits that still require new art

Viewpoint; pose; child and adolescent bodies; fused sleeves; hands; anything
that fails the fit bounds; expressions; backgrounds.

## 8. Recommended architecture

No new engine. The converged layer is the existing set of contracts plus
measurement reports that feed derivations: PR #89's fit bank for torsos,
this slice's arm report for sleeves when the evidence allows, both derived
from pixels, both regenerated by test, both consumed by the one compositor.
The developer proof routes are the workbench; extending them to draw the
measurement overlays is a read-only step over what exists. A separate
"authoring engine" would be a second authority over the same rasters.

## 9. The next three highest-leverage steps

1. **Measure a heavy and a lean body in the same pose with arms held clear**
   — the one generation that turns the sleeve question from occluded to
   measured, and the first real lean/average/heavy torso triple for PR #89's
   fixture claims.
2. **Read the interior arm line** from the source colour as a labelled
   `silhouette-rule` estimate, so seated and forward-carried arms gain an
   inner edge a human can confirm rather than none at all.
3. **Overlay the fit and arm reports on the character proof route** —
   read-only, over `buildCharacterRenderPlan`, no second compositor — so a
   reviewer sees the refusal reasons on the body they apply to.
