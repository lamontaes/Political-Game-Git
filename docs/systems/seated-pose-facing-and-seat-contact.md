# Seated Pose Facing and Seat Contact

Status: **Graphics core contract** — extends
[Scene and Person Presentation](./scene-and-person-presentation.md) and is the
seated counterpart to [Garment Morphology Fit](./garment-morphology-fit.md).

Two questions this contract answers, both of which were previously answered by
prose and answered wrongly: which way a seated figure is turned, and where that
figure meets the seat.

## Why a facing needs declaring at all

`body` is one atomic component kind. The compositor scales a placement
uniformly and preserves its aspect ratio; there is no limb slot, no rotation and
no skew anywhere in the layer projection. A sitting pose is therefore a drawn
plate, and a sitting pose seen from an angle is a different drawn plate. Nothing
downstream can turn a figure, so the turn has to be a property the art declares
and the admission gate reads.

Every registered pose family declared `facing: "front"`. That was never a
decision; it was simply true of all the families that existed, and the admission
gate encoded it as a rule. The consequence was that a correct, complete,
propless seated crop drawn three-quarter had no family it could be filed under
and was refused — refused for being drawn from an angle, by a pipeline whose
own vocabulary had no word for an angle.

## Reading the direction

A direction is decided by **measurement against a reference plate**, never by
reasoning about whose left is whose. Reasoning was tried, and inverted the label
within the hour.

The measurement is the centroid-x of the bottom quarter of the figure minus the
centroid-x of the top sixth, as a fraction of canvas width:

```
turnOffsetFraction(bitmap)   // scripts/art-asset-factory/seated-contact.ts
SEATED_TURN_THRESHOLD = 0.08
```

A square seated figure measures about 0.000. The plate that
`art/qa/p71/source_intake_dispositions.json` independently calls three-quarter
**right** measures **-0.271**. So negative is right, and that sign is bound to
that reference plate rather than to an argument. The measured values across the
bank:

| plate                                              |         offset | reading               |
| -------------------------------------------------- | -------------: | --------------------- |
| `ocd_body_adult_fem_seated_guest_three_quarter_v1` |         -0.271 | right (the reference) |
| `ocd_body_adult_fem_seated_guest_front_v1`         |         -0.276 | right                 |
| `ocd_body_adult_fem_seated_gesture_forward_v1`     |         -0.226 | right                 |
| `ocd_body_adult_fem_seated_conversational_left_v1` |         +0.328 | left                  |
| wave-a turned seated crops                         | -0.21 to -0.24 | right                 |

The prose in `source_intake_dispositions.json` is wrong on two of its four
seated plates: it calls `seated_guest_front` "close to square" when it measures
-0.276, and calls `seated_gesture_forward` "three-quarter left" when it measures
-0.226. Those disagreements are **reported and left standing**, not silently
resolved — `ocdPriorClaimDisagreements()` emits them, and the count appears in
`art/qa/p76/ocd-admission-report.json` as `rowsDisagreeingWithPriorClaim: 2`.
Match the measurement. Never the description.

Recorded as **D-086** in [the decision log](../decisions/DECISION-LOG.md).

## Where the figure meets the seat

The old `seatedPelvis` came from `measureBodyRig`'s `crotchRow`, which walks
down from the waist to the first row where the silhouette becomes two runs. That
is **leg separation, not seating**. It coincides with the seat on a square
figure, which is why it went unquestioned for as long as every seated figure was
square. On a turned figure the near leg covers the far one, so the walk runs
past the seat, past the knee, and stops at the ankle. One plate measured 0.777 —
inside every plausibility band anyone would think to write, and visibly at
mid-shin.

A number that is plausible and measures the wrong thing is worse than a missing
one, because nothing downstream can tell it is wrong.

The measurement that replaced it is **the lowest point of the hip mass on the
side away from the knees**:

- hip band = `rig.waistRow` down to `waistRow + round(0.33 * (soleRow - waistRow))`
- rear strip = `max(1, round(0.22 * span))` of the hip band's x-span, taken from
  the side the turn points away from
- the contact row is the lowest opaque row in that strip; the contact x is the
  centroid of the opaque pixels in that row within the strip

A square figure keeps the leg-gap method, gated on the sole band resolving
exactly two runs and on the result falling inside `SEATED_PELVIS_PLAUSIBLE`
(0.45 to 0.80).

**There is no fallback.** A figure neither method can read gets no contact and a
stated reason, which `unresolvedFor` reports verbatim.

## What corroborates it

Twelve propless seated crops, across two source sets and four builds, land at
**0.632 to 0.644** — against the **0.62** that `pose_families.json` declares
from its own authoring, arrived at independently. Two measurements made
independently that agree within two percent are the closest thing to
corroboration this bank has.

The nine seated candidates now in the registry:

| body                                                      | family                 | pelvis y |
| --------------------------------------------------------- | ---------------------- | -------: |
| `ocd_body_adult_fem_seated_guest_front_v1`                | three-quarter-right    |   0.6441 |
| `ocd_body_adult_fem_seated_gesture_forward_v1`            | three-quarter-right    |   0.6436 |
| `wave_a_average_woman_seated_conversational_open_hand_v1` | three-quarter-right    |   0.6421 |
| `wave_a_older_woman_seated_conversational_open_hand_v1`   | three-quarter-right    |   0.6413 |
| `wave_a_average_man_seated_conversational_open_hand_v1`   | three-quarter-right    |   0.6409 |
| `ocd_body_adult_fem_seated_guest_three_quarter_v1`        | three-quarter-right    |   0.6388 |
| `wave_a_skinny_woman_seated_conversational_open_hand_v1`  | three-quarter-right    |   0.6242 |
| `wave_a_skinny_woman_seated_front_neutral_v1`             | guest-neutral (square) |   0.6066 |
| `wave_a_average_woman_seated_front_neutral_v1`            | guest-neutral (square) |   0.6034 |

Seated candidates carrying a usable seat contact went from two of nine to nine
of nine.

## What this does not claim

- Eligibility is not drawability. The apartment club chair now lists a family
  that faces the way its seat does; whether a figure turned that way reads right
  in that chair is a judgement about the room, made by eye.
- Every one of these bodies is a **candidate**. `indexPoseArt` counts a body
  only when its generation status, its QA status and its runtime release status
  are all approved or released, and none of them is. Nothing here releases a
  pixel.
- The turn measurement says nothing about a standing figure. One standing plate
  reads as genuinely turned and is deliberately recorded with **no**
  `facingDirection`, because the seated measurement is not evidence about it.
- Two plates are refused and left refused: a seated three-quarter-**left** and a
  turned standing one, neither of which any family declares. Do not invent a
  seat or a family to absorb them.

## Where it lives

| concern                         | file                                                      |
| ------------------------------- | --------------------------------------------------------- |
| turn and seat measurement       | `scripts/art-asset-factory/seated-contact.ts`             |
| wave-a admission                | `scripts/art-asset-factory/wave-a-candidate-admission.ts` |
| ocd admission, lineage checking | `scripts/art-asset-factory/ocd-candidate-admission.ts`    |
| the single registry writer      | `scripts/art-asset-factory/cli-wave-a-admission.ts`       |
| declared families               | `art/manifest/pose_families.json`                         |
| the generated registry          | `art/manifest/character_candidate_registry.json`          |

`character_candidate_registry.json` is generated and byte-checked —
`npm run admit:wave-a-candidates -- --check` runs inside `validate` — so **both
admission passes run from one CLI**. A second writer would silently drop the
other pass's records.
