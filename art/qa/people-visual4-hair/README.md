# PEOPLE-VISUAL4 hair pair evidence

This is candidate engineering evidence, not art approval or production release. The pipeline preserves all 63 recovered source PNGs and their source-sheet/Drive lineage. Original-generation dimensions and external upscale history remain unknown. The nine head snapshots are the parent's final 176-high head canvases with alpha cleared below row 165; origin remains (0.5, 0.94). Their exact hashes are in `people_visual4_head_targets.json`.

All 61 frontal sources were carried through the same pipeline against all nine heads: 549 exact pairs. Two sources (26, 35) are rear-only and have no usable frontal aperture. The candidate registry includes 495 inspected usable pairs across 55 styles. Eighteen pairs (sources 6 and 19) retain asymmetric fringe/aperture fit failures. Thirty-six pairs (43, 60, 61, 62) need source-grounded scalp/temple alpha separation because gray source scalp fragments remain visible against skin heads. Neither group proves missing native hair pixels or a new-art requirement.

`pair-report.json` contains every exact pair, transform, derived hashes, observations, and status. `contact-1.png` through `contact-8.png` show all nine heads by eight source columns per page; `contact-cells.json` names every cell. Individual full-resolution composites are in `pairs/`. Source and head attachment points are explicit game-authored visual estimates. Their arithmetic is not an acceptance measurement. The review decisions bind the exact source, head, and composite hashes; changed pixels require another review before registration.

Each source uses one uniform scale on both axes, with area reduction and premultiplied alpha. Ceil output dimensions add partial or transparent edge coverage rather than stretching. The canvas is padded to include the head neck origin inside [0, 1]. Thirteen source-region back partitions preserve the six original partitions and add seven visibly rear lower masses. Three authored masks remove lower-face guide outlines. Front/back layers receive complementary alpha **after a single reduction**; separately reducing cut layers creates a visible translucent seam. This learned constraint is encoded in the derivation and shared-canvas checks.

The layer contract is back hair 15, body 20, wardrobe 35, head 40, front hair 50. Each hair candidate supports exactly one head family; body compatibility comes through that head's existing eleven body families. The parent task owns actual body/wardrobe/scene/dossier/reload integration and its visual proof. In particular, a head-only composite cannot establish rear-hair occlusion against every garment. Mask endpoints also need inspection at final scene scale.

Reproduce and verify from repository root:

```sh
node --import tsx scripts/art-asset-factory/people-visual4-hair.ts
node --import tsx scripts/art-asset-factory/people-visual4-hair.ts --check
npx vitest run scripts/art-asset-factory/people-visual4-hair.test.ts
```

`--check` verifies all source hashes/dimensions, actual runtime head hashes when available, derived pixel replay, derived byte hashes in the manifests, contact sheets, and report/registry replay. No live Drive request or temporary source path is required.
