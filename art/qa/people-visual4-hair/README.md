# Visual4 hair review output

Visual4 is the RETIRED people generation. The current cast is generation 16
(`modular47-gen16-postmerge-65f7704b6f35`), which does not live here.

The composite contact sheets and the 549 per-pair PNGs this directory held
were review evidence for the retired cast: every one of them was a picture of
people the game will not draw again. They were deleted on the owner's
instruction to remove obsolete assets rather than keep them as a fallback.

What remains is the reading, not the pictures. `pair-report.json` and
`contact-cells.json` record which pairings were inspected and what was found,
and `scripts/art-asset-factory/people-visual4-hair.ts` still regenerates the
images from source if a question about the retired cast ever has to be
answered again. Narrative references elsewhere to "contact-1.png row 3,
column 2" are citations of that reading; they are not dependencies, and
nothing at runtime ever loaded these files.
