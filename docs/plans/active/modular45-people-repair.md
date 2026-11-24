# MODULAR45 people repair — active

Authority: Drive "MODULAR REPAIR — CLAUDE + CONNECTED FIREFLY" (MODULAR41 packet) and CRUNCH46 §04. Baseline: main `fed321f7667bbe5c3570679554a2f6b88d3bf8b1`; continues codex commit `a9755868`. Private input pack: `modular41-current-0a044d183ad7` (manifest SHA-256 `0a044d183ad7ac4f38f2e88f72ba294cd1496c8b4cc4466cce023b6a7b0694a2`). The owner Play checkout and saves are read-only.

## Owned scope

- Appearance selection mechanics and controls (`PersonAppearanceControls`, `PreparedAppearanceControls`, `CreatorAppearanceStep`, `WardrobeFigure`, `SavedAppearance`), prepared materials/SVG skin maps, candidate registries, pose fits for corrected people, and the MODULAR↔PEOPLE appearance lifecycle interface (`appearance-lifecycle.ts`).
- UI owns the shell, PersonCard layout and the shared `controls/` primitives (carried here byte-identical as an adapter).
- Private rasters, registries and preparation scripts stay out of public Git history.

## Generation 13 (private, additive)

`art/authoring/modular45/build.py` prepares raster revisions of the PEOPLE41 standing bank from the delivered masters (no generation, no enlargement):

- per-family head fit (partial size fit toward the body's own head, anchored at the jaw);
- neck joins: body-paint bridge under a feathered head; for the fuller masculine body the head ends at its neck and the bridge fills the jaw-to-shoulder wedge;
- premultiplied resampling (removes white edge bleed);
- garment cleanup: jaw fragments out of the fuller collar, hands moved from trouser partitions to the skin layer, hair ends out of slim/fuller bodies, the bald average-feminine head from its bald master;
- hair: each logical hairstyle fitted to every face of a body family (face and hair independent); borrowed hair is kept off the protected face zone;
- skin: prepared multiplicative skin maps on bodies, heads, scalp under thin hair and skin painted inside garments; seven swatches (`skin-1` … `skin-7`);
- seated and listening pose fits for every face × hairstyle, including no hair.

Older generations resolve exactly as before; an older saved person sees an explicit, previewed "updated artwork" choice.

## Open gates

- Expression proof (neutral → one expressive state → neutral): no facial-expression system or painted variants exist yet; next increment.
- Broader variety (new distinct faces/hairstyles, two wardrobe design families): needs authored or generated source; not claimed.
- Firefly: web Fill route verified; ledger in `art/authoring/modular45/firefly/ledger.json`. One hair candidate adopted, two operations rejected. Borrowed-hairline repaint for the remaining cross combinations is listed, not done.
- Human visual acceptance remains the owner's.
