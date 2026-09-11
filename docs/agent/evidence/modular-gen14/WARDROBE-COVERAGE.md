# CORRECTED: wardrobe coverage, and the scope error in the first version

> **Correction, 2026-09-11.** The section this file originally carried, "The
> obvious fix, and why it does not work", measured the LEGACY
> `art/references/masters/pg-modular` flat lays and stated its conclusion as
> though it were about the project's garment sources in general. That was a
> scope error. The asset request it produced asked for re-captures that are not
> needed, and it has been removed rather than left to be quoted.
>
> The bank the game actually consumes is the p95 recent-drive-sweep set: sheets
> of 3584x4800 and 4336x5804, verified by SHA-256, already in the repository and
> already chopped, whose garment crops export at **625x1220** (bottoms),
> **960x1038** (male tops), **924x1000** (female tops) and **1425x1017**
> (front-on footwear) — against the 108-230px legacy crops that report measured.
> There is no resolution shortage there and **no source needs re-supplying**.
> `people-visual4.ts` already reads all of it, and **35 of 36** wardrobe crops
> reach a component a body can wear.
>
> What survives is the diagnosis of the khaki-shorts result below, measured by
> the Visual4 line's own instrument: a silhouette mismatch, not a resolution one.

## What the bank actually contains

`scripts/art-asset-factory/people-visual4-source-lineage.ts` holds the chain and
its tests pin it:

```
Drive id + label -> sheet path, SHA-256, real IHDR dimensions
  -> chop cell -> exported crop + its own SHA-256
    -> attachment authoring -> registry component
      -> declared body and pose families -> runtime consumer
```

| sheet             | verified SHA-256 | actual size | crops           |
| ----------------- | ---------------- | ----------- | --------------- |
| front-on footwear | `8a7bf15e...`    | 4336x5804   | 12 at 1425x1017 |
| female tops       | `24f08760...`    | 3584x4800   | 12 at 924x1000  |
| male tops         | `f8404c6b...`    | 3584x4800   | 12 at 960x1038  |
| male bottoms      | `9afbb75c...`    | 3584x4800   | 12 at 625x1220  |

The **side/angled footwear** sheet (`fa1abe93...`, 3584x4800) is recorded with a
null repository path: the original is confirmed, its lineage into this
repository is not re-established. It is a different view with different uses.
Neither footwear sheet replaces or retires the other, and a test asserts it.

## The one garment that fits nobody

`pv4_wave_a_female_top_burgundy_short_sleeve_polo_v1` reaches the registry and
is worn by no one. It is **not** a fit failure: against
`average-woman-standing-neutral-front-a` it scores a worst edge error of **zero
across all 285 compared rows**. `people-visual4.ts` blocks it by name, and the
authoring manifest says why:

> "Painted light-skin forearms are baked into this source below both short
> sleeves and end at cut wrists. Exclude unmasked use as a complexion-independent
> garment. Author arm masks or declare exact compatible body, complexion and pose
> before using."

The block is correct — unmasked, it paints one complexion's forearms onto
anybody. This is layer separation, not silhouette.

**The mask is built.** `npm run derive:visual4-arm-mask` writes an additive
candidate beside the original. The separation is measured, not guessed: fabric
at rgb(112,53,62), baked skin at rgb(223,179,155), nowhere near each other in
any channel. Skin is classified by colour, grown 4px to take the outline and
anti-aliased fringe, and cleared in RGB as well as alpha.

```
cleared 134,887px   opaque 687,672 -> 552,785
painted bounds 964x992 -> 964x990
```

Bounds barely move because the sleeves are wider than the forearms, so the
silhouette the fit measure reads is unchanged — and the test asserts the pairing
still measures clean rather than assuming it.

**The block stays.** Whether the mask looks right is a visual decision about a
garment, and the sleeve hem is where the grown mask runs closest to fabric that
must survive. Overlay: `polo-arm-mask-overlay.png` (cleared pixels render
black). A test pins the block so removing it has to be deliberate.

## The instrument, repaired and characterised

The first version reported `insufficient-coverage` for every pair it measured —
including the banked reference, the one case that must always measure — and I
read those non-answers as rejections. They were not.

The Visual4 instrument was never broken; my call was. Ease must be read once
from the UNPERTURBED pairing, because it is the expectation the error is
measured against. Computing it from the perturbed projection makes expectation
equal observation by construction, which is why an earlier draft reported zero
error for a garment scaled to 140% and shifted 8% down the body.

| control                   | result                                                      |
| ------------------------- | ----------------------------------------------------------- |
| banked reference pairing  | `measured`, worst fraction 0, 201/201 rows                  |
| shifted 2% down the body  | `measured`, worst fraction **0.199** - fails the 0.03 bound |
| widened 5% / 20%          | 0.033 / 0.132 - proportional, not a step                    |
| shifted 12%, off the body | `insufficient-coverage`, 1 row - declines rather than fails |

That last row is the distinction the first version got wrong, now pinned:
**`insufficient-coverage` is an unmeasured case, not a verdict about a source.**

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
