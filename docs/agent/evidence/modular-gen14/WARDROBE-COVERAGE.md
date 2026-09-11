# Why one pair of shorts dresses four fifths of the cast

Continues MODULAR-GEN14 from PR #179. This is the investigation that PR's
evidence asked for, and its answer changes what the next step is.

## The finding

`khaki_shorts` is worn by 165 of 200 seeded people. Nothing weights it. It is
the only bottom that reaches more than one body.

Eleven of the twelve banked Visual4 bottoms are authored for
`wave-a-average-man-standing-neutral-front-a` alone. That is not a missing
declaration — the pipeline **measured** each of them against the other bodies
and rejected them. From `art/qa/people-visual4/derivation.json`, black joggers
on `average-woman-front-a`:

```
transform   affine  scaleX 1.053  scaleY 1.065
measurement worstPx 71.29  worstFractionOfBodySpan 0.202
            undercoverage 72.79px @ row 502   overhang 45.2px @ row 861
status      failed-fit
```

20.2% of body span after the best affine the pipeline can derive. Across the
132 measured bottom pairings: **20 accepted, 24 pose-incompatible, 88
failed-fit.**

Shorts are the exception for a physical reason. They stop above the knee —
above `worstAtRow`, which is where male and female leg silhouettes diverge. A
garment that only has to agree about hips and upper thigh fits across bodies; a
full-length trouser does not.

So this is a pixel shortage. It cannot be repaired by editing
`compatible_body_families` — I checked that first, and all 74 measured
(garment, body) fit pairs are **already** declared, with zero undeclared. And
it must not be repaired by re-weighting selection, which would hide missing
garments behind a distribution.

## The obvious fix, and why it does not work

The project owns body-independent flat-lay garment masters, and the pipeline
owns the operation that turns one master into one garment per body:
`deriveGarment` scales a master to the target body's own measured hip, shoulder
and foot geometry. That is how `wave-a-wardrobe` dressed six morphologies.

I pointed the same accepted derivation at the Visual4 bodies. It refuses, and
the refusal is correct.

`npm run measure:visual4-wardrobe` (new, in this delta) reports why, per master:

```
98 pairs, 29 derivable without enlargement, 69 blocked

bottoms/pg_master_bottom_01_straight_leg_jeans.png  have 108x230  need >= 243x315  (9 bodies)
bottoms/pg_master_bottom_02_dress_trousers.png      have 112x231  need >= 243x306  (9 bodies)
bottoms/pg_master_bottom_03_a_line_knee_skirt.png   have 160x225  need >= 243x206  (7 bodies)
tops/pg_master_top_01_short_sleeve_crew_tee.png     have 187x199  need >= 331x265  (11 bodies)
tops/pg_master_top_02_long_sleeve_button_shirt.png  have 188x228  need >= 331x302  (11 bodies)
tops/pg_master_top_03_pullover_sweater.png          have 192x212  need >= 331x276  (11 bodies)
tops/pg_master_top_04_structured_blazer.png         have 185x225  need >= 331x303  (11 bodies)
```

The masters are small and a Visual4 body is authored on a 960px canvas.
Deriving a bottom needs up to **2.25× enlargement**, and the pipeline refuses to
enlarge outright — enlarging invents detail nobody drew.

`wave-a-wardrobe` hit this same wall and its own code records it: those outputs
sit behind an `enlarges` branch that verifies a retained hash instead of
regenerating, noting they are historical outputs, "evidence, not reproducible
admissible tiers." So that wardrobe is not a precedent to copy.

## The exact asset request

Recover each master at or above its `minimumNativeSize` above, natively — not
upscaled. Per master:

- **Same design, same flat-lay framing, same neutral ground** the current
  master uses; these are re-captures at sufficient resolution, not redesigns.
- **Bodies served** and the exact pixel size each one needs are listed per
  master in `art/qa/people-visual4/wardrobe-requirements.json` under
  `requests[].bodies`.
- **Pose**: `standing-neutral`. Seated bodies are excluded by
  `kindsForPose` and remain a separate request.
- **Admission**: `npm run measure:visual4-wardrobe` must report the master as
  derivable without enlargement, and then the Visual4 line's own fit
  measurement decides acceptance. Nothing here approves art.

The A-line knee skirt is the cheapest win and the most valuable one: it is the
only feminine bottom in the set, it blocks 7 bodies, and it needs only 243px of
width against the 160px it has — its vertical scale is already **0.92**, a
reduction. One re-capture at ~1.6× width unblocks the women's bodies.

## What this delta does NOT do

`measure:visual4-wardrobe` writes no raster and admits nothing.

An earlier draft of it derived the pairs small enough to escape the enlargement
refusal and reported them rejected. Every one came back
`insufficient-coverage` — "Only 0 of 1 rows in the edge-match window had both
the garment and the body painted" — which is the measurement declining to
answer, for the banked reference pairing as much as for the derivative. Those
verdicts meant nothing, so they were withdrawn rather than published, and the
29 rasters they had written were deleted. Admission for these bodies belongs to
the Visual4 line's own measurement, which already handles the per-foot and
per-garment cases this harness does not.

Footwear is excluded for the same reason and says so: a shoe contains no
landmark row, so this harness can neither admit nor reject one.

## Scene calibration: assessed, and deliberately not authored

The residence scenes already declare per-anchor `footprint_percent` and
`floor_contact`. What they lack is `floor_calibration` (a near/far perspective
ramp) and the `standard_body_width_percent` derived from it.

I did not author them, and the reason is a real ambiguity rather than caution.
`planLifeScenePeople` computes `widthPercent = footprint_percent × perspectiveScale`,
so a declared ramp is MULTIPLIED by the per-anchor footprint. The residence
footprints already differ with depth — `living-room-floor-standing` is 22% at
floor 95, `entry-side-standing` is 13% at floor 82 — so they may already encode
that depth. If they do, declaring a ramp double-scales every figure in the room.

Resolving that is an authoring decision about what `footprint_percent` means in
these scenes, not a measurement I can take off the plate. Inventing a ramp to
make the room "calibrated" is exactly the fabricated precision the art
constraints forbid, and the production guard that refuses these rooms today is
correct until the question is answered.
