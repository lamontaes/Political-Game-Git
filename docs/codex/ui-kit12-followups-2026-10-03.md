# Main-menu desk and character artwork need follow-up

Lamontae requested more detail on the Resolute Desk in the main-menu artwork. Keep this with the artwork follow-ups after the current interface replacement.

- Add detail to the Resolute Desk without changing the approved main-menu composition.
- Revisit the raised in-menu buttons after the playtest. Lamontae kept them temporarily and has not approved their design.
- Repair the white outline, blue trouser cuffs, hairline artifact and shoe artifact on the masculine model seen during the owner's playthrough.
- Ground the introduction's officials on the scene and vary their poses using the existing pose bank.
- Replace the TV and newspaper graphics with artwork that fits the room.

These are owner requests from October 3, 2026. Artwork changes remain subject to his visual approval.

## The current clothing source has a white fringe and an incomplete color mask

The browser model uses masculine, lean, shade 1, face `20s30s-04`, hair `locs-long`, natural hair color, the standing `hoodie-jeans` outfit, brown bottoms and a pink top. The displayed image has no CSS filter or box shadow. Its outline is visible in the uncomposed outfit PNG, so removing a CSS outline cannot repair it.

The outfit is `art/people-engine/v1/outfit-masculine-hoodie-jeans-lean.png`. Its bottom-color mask is `outfit-masculine-hoodie-jeans-lean-bottom.png`. A read-only pixel check found 731 opaque blue pixels outside that mask in rows 578–745. The shared `recolorPart` function in `src/presentation/appearance-engine/pack.ts` leaves pixels with zero mask alpha unchanged. This explains why some blue survives a brown trouser choice.

Repair the prepared outfit edge and bottom mask through the existing source pipeline, preserving the original PNG and its lineage. Compare shoe contact and the `hair-masculine-locs-long-front.png` and `hair-masculine-locs-long-back.png` layers against the same failing recipe. The hair and shoe causes remain unconfirmed; no source image or renderer was changed during this brief inspection.
