# Arm and Sleeve Measurement

Status: **Graphics core contract** — extends
[Garment Morphology Fit](./garment-morphology-fit.md) and
[Pose Families](./pose-families.md).

Measures each arm of a body raster from its alpha, per image side and per
pose, and says exactly which parts of the arm the alpha does not contain. It is
the measurement the sleeve question was waiting on; it is not a sleeve
transform, and it derives none.

## Why this exists

D-074 fits tops, bottoms, footwear and accessories to a silhouette by
measuring the body's painted span at named rows. Its fixtures are armless on
purpose — an arm in the row would swamp the torso signal — so sleeves were
left unanswered, with the note that a sleeve fit "needs a body whose arms were
measured".

Before measuring, the repository already held three arm representations, and
none of them is a measurement:

| Where                                                   | What it is                                                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `art/manifest/pose_families.json` `landmarks`           | Nominal shoulder / elbow / wrist / hand per pose family, in a nominal canvas, derived from fixtures. |
| `measureBodyRig` in `pg-modular-intake.ts`              | Neck, shoulder, waist, crotch and sole ROWS of a body, no arms.                                      |
| `dev-character-fixtures-g2.ts` / `garment-fit-fixtures` | Fixture arms drawn as polygons fused to the torso, or no arms at all.                                |

This contract adds the fourth: numbers read from the pixels of the body that
ships, keyed by that body and its pose, with a status on every value.

## What alpha can and cannot say

Everything here follows from one fact about a body raster. Where an arm hangs
**clear** of the torso there is transparent canvas between them, and the row
carries a separate opaque run on that side: both edges of the arm are
silhouette edges, and its width, its axis and its wrist can be read. Where the
arm lies **against** the torso the row is one opaque run: the outer edge is a
silhouette edge, and the inner edge of the arm is not in the alpha at all — it
is a painted line and a shading change, which is colour, and this contract does
not read colour.

So the arm is measured in two parts. The **separated segment** is the largest
connected component of opaque material lying outside the midline run on that
side, beginning above 55% of figure height and ending clear of the sole (a
component that stands on the floor is a leg). Its principal axis is found by
PCA over its pixels and oriented away from the shoulder. Everything above it is
**fused**, and fused rows carry their outer edge only.

## Statuses

Every landmark, width and segment carries one of five statuses and an evidence
class. The statuses are not confidence scores; they say what kind of thing the
value is.

| Status               | Meaning                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `measured`           | Read from the silhouette: directly (`alpha-silhouette`) or by a stated rule quoted in the note (`silhouette-rule`). |
| `partially-measured` | Locates a region rather than a joint — an elbow on the outer contour, not at the joint centre.                      |
| `ambiguous`          | The silhouette was read and did not decide the question. No value is written.                                       |
| `occluded`           | The edge is not in the alpha: the arm lies against the torso or is hidden. No value is written.                     |
| `unavailable`        | A prerequisite is missing (no wrist, so no chord to read an elbow against). No value is written.                    |

A value is never filled in from proportion. Left and right are IMAGE sides,
matching `shoulder-left` / `shoulder-right` in the pose registry; a front-facing
figure's image-left arm is its anatomical right, and facing is not inferred.
The two sides are measured independently and never mirrored.

## Landmarks and how each is read

| Landmark    | Rule                                                                                                                                                                                                       | Best status          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `shoulder`  | Outer silhouette edge at the shoulder row — the first row at or below the neck reaching 92% of the widest midline-run width within 15% of figure height, the rule `measureBodyRig` uses.                   | `measured`           |
| `wrist`     | Narrowest cross-section in the far half of the separated segment that is followed by a widening of at least 1.12× (the hand). Fingertips taper too, but nothing beyond them widens, so they never qualify. | `measured`           |
| `elbow`     | Hanging arm: point of greatest outward bow of the outer silhouette between shoulder tip and wrist row, if the bow is at least 2% of the chord. Raised or forward arm: the root of the separated segment.   | `partially-measured` |
| `extremity` | The separated segment's own pixel farthest along its axis — the hand's tip when a wrist was found.                                                                                                         | `measured`           |

Cross-sections are slices through the FULL silhouette perpendicular to the
segment axis, transparency to transparency. A slice is declared fused, with no
width, on any sign that it left the arm without passing an edge: it stepped
into the run carrying the body's midline, it crossed the torso axis, or it grew
past 20% of figure height. This is deliberately strict. A forearm carried across
the body joins the torso along its upper rows, and a slice that climbs into
those rows is fused even where both of the forearm's edges are visible, because
on those rows the alpha holds one run and nothing in it says which pixels are
forearm.

Widths are read at the upper arm near the shoulder, the upper arm midpoint, the
elbow, the forearm midpoint and the wrist. On a raised or forward-carried arm
the three upper-arm widths are occluded by construction: the segment that
clears the torso is the forearm, and the upper arm is against the body.

Segments carry a pixel vector, a length as a fraction of figure height and a
signed angle from the torso axis (neck centre to mid-figure centre). The elbow
bend is the interior angle at the elbow point and inherits the elbow's status.
Layering — whether the arm passes in front of or behind the torso — is
`unavailable` on every body: alpha carries no depth.

## What the repository's bodies measure

`npm run measure:arms` writes `art/qa/arm-measurements/arm_measurements.json`
and one review overlay per body under `art/qa/arm-measurements/overlays/`. The
report is regenerated by `tests/arm-measure.test.ts` and compared, so a raster
that changes changes the report in the same commit.

| Body                                    | Pose                    | Left                                    | Right                                        |
| --------------------------------------- | ----------------------- | --------------------------------------- | -------------------------------------------- |
| `pg_body_ml_standing_v1` (real, lean)   | standing-neutral        | measured; wrist 23 px, elbow 53 px      | measured; wrist 23 px, elbow 52 px           |
| `pg_body_fl_standing_v1` (real, lean)   | standing-neutral        | measured; wrist 22 px, elbow 45 px      | partially: elbow ambiguous (bow 1.9%)        |
| `ocd …standing_neutral_b` (real, heavy) | standing-neutral        | partially: elbow ambiguous              | measured; wrist 66, forearm 87, elbow 108 px |
| `ocd …standing_neutral_a` (real, heavy) | standing-neutral        | partially: wrist 63 px, elbow ambiguous | partially: wrist 62 px, elbow ambiguous      |
| `ocd …standing_conversational_b`        | standing-conversational | occluded (hand at the hip)              | measured, raised; wrist 69 px                |
| `ocd …standing_conversational_a`        | standing-conversational | occluded (hand in front of the belly)   | partially, raised; wrist ambiguous           |
| `ocd …seated_gesture_forward`           | seated-guest-neutral    | partially, raised; wrist ambiguous      | occluded                                     |
| `ocd …seated_conversational_left`       | seated-guest-neutral    | occluded                                | partially, raised; wrist ambiguous           |
| `ocd …seated_guest_front`               | seated-guest-neutral    | occluded                                | occluded                                     |
| `ocd …seated_guest_three_quarter`       | seated-guest-neutral    | occluded                                | occluded                                     |
| `dev-g2-broad` / `dev-g2-slim` standing | standing-neutral        | partially: polygon arm, no hand         | partially: polygon arm, no hand              |
| every dev fixture seated                | seated-at-desk          | occluded (a 10–37 row fragment)         | occluded                                     |

Three findings matter for what comes next.

**A hanging arm on a real body is measurable from the elbow down.** Both lean
production candidates and the heavy Packet 71 body give a wrist, a forearm and
an elbow region with both edges in the alpha; the upper arm is fused on all of
them. Forearm length is 0.14–0.15 of figure height on the lean bodies and 0.09
on the heavy one; wrist width is 22–23 px on a 343-px canvas and 62–66 px on an
830–892-px canvas — 6.4% and 7.5% of canvas width. That is the first measured
cross-morphology arm difference in the repository.

**A seated arm with hands on the thighs is not measurable from alpha.** All
four seated Packet 71 poses come back occluded on the resting side, and the
gesturing side yields a forearm root without a wrist because the forearm's
upper rows join the torso. This is a property of the poses, not a tooling gap:
nothing short of reading the painted interior line, or a per-limb layer in the
source export, gives those arms an inner edge.

**The pose registry's nominal arm landmarks are not measurements of these
bodies.** `registryDeviation` reports the measured landmark minus the nominal
one for each registered pose. On the real bodies the shoulder sits 0.04–0.11
of canvas height below the nominal row and the elbow up to 0.14 of canvas width
outside it; the registry's numbers were derived from the generation-2 fixture
geometry and the real canvases are framed differently. They stay what they
were, control-plate geometry, and are not promoted to measurements by this
contract.

## Sleeve fit readiness

`assessSleeveFitReadiness(source, target)` is the gate in front of a sleeve
transform that does not exist. It derives nothing and applies nothing. It
refuses, in order:

| Code                          | When                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `sleeve-side-mismatch`        | The two arms are different image sides. Sides are never mirrored.                                    |
| `sleeve-pose-mismatch`        | The pose families differ and the caller has not declared them geometrically compatible.              |
| `sleeve-arm-occluded`         | Either arm is `occluded` or `unavailable`.                                                           |
| `sleeve-posture-mismatch`     | One arm hangs and the other is raised or carried forward: the same pose family, carried differently. |
| `sleeve-landmarks-incomplete` | A shoulder, elbow or wrist on either arm carries no value.                                           |

When every gate passes it returns the ratios a per-segment transform would be
built from — upper-arm and forearm length ratios and angle deltas, the elbow
bend delta, and target-over-source width ratios for every width both arms
measured — with the note that no transform is derived here and that the
upper-arm ratios rest on partially-measured elbows.

On the bodies measured today it passes for exactly one pairing: the two lean
production candidates, image-left arm, standing-neutral (forearm length ratio
0.905, wrist width ratio 0.957). Every other pairing fails closed, and the
codes say why.

## Why no sleeve transform yet

The torso fit is a horizontal band warp: every measured morphology difference
there is a width difference along rows. A sleeve is not that. On the one pose
family with two measured real morphologies, the forearm is 10% shorter and the
upper-arm angle differs by under a degree, so an affine along the arm axis
would probably serve — but the upper arm, where a sleeve attaches, is fused on
every body measured, its width is occluded, and its elbow is a contour bow
rather than a joint. A transform anchored on a partially-measured elbow and an
occluded upper arm is the guess this contract exists to refuse. The evidence
says what to do instead, in order: measure a lean and a heavy body in the same
pose with arms held clear, or read the interior arm line, and only then decide
between one affine per sleeve and independent segment transforms.

Nothing in the runtime changes. `projectCharacterLayers` is untouched; no
component, catalog generation or fit profile is altered; the report lives under
`art/qa/`, beside the fit report, and is authority for nothing until a
derivation consumes it.

## Commands

| Command                | What it does                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `npm run measure:arms` | Measures every body raster the repository can name; writes the report and overlays. |

## What validation enforces

`tests/arm-measure.test.ts`:

- the committed report and every overlay are reproduced byte-for-byte from the
  rasters, and the same raster measures to the same bytes twice;
- measuring never writes the source art (hash and mtime unchanged);
- left and right are independent — a mirrored figure swaps its answers, and a
  gesturing pose measures one side and refuses the other;
- an occluded arm carries no elbow, no wrist, no inner contour and no width;
- what the silhouette does not decide is labelled `ambiguous` with no value;
- every landmark with a value lies on the silhouette;
- shoulder, elbow, wrist and extremity descend a hanging arm in that order;
- widening the pixels widens the measurement, and the other side does not move;
- the readiness gate refuses cross-pose, cross-side, occluded and incomplete
  arms, and leaves both inputs untouched when it passes.
