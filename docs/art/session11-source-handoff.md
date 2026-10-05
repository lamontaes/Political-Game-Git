# Side-facing chairs need matching heads and seated paintings

The source recipient needs to supply existing authored layers for the same people, plus the private repair pack. Turned standing paintings are present, but their matching heads are absent. Turned chairs also lack seated paintings. The published staging draft preserves the original art and lists unsupported people as selectable contacts. Source delivery and human artwork approval are separate gates. No remote file ID was recovered for the missing bank; the recipient must return its actual location.

## Minimal recipient request

Claude source owner: return a readable private source location and its provenance manifest for the three-quarter bank. Preserve the current face and hairstyle IDs. Supply neutral faces and both hair layers first, then basic seated bodies and matching seated outfits. If these paintings do not exist, say which IDs are absent; do not manufacture a turned face from a front raster.

The exact 36 face IDs, 26 hairstyle IDs, 88 head-layer filenames, six seated-body filenames, 150 seated outfit/skin filenames, and registry destinations are enumerated in [session11-source-request.json](session11-source-request.json). The latter outfit count covers all 25 existing outfit IDs across three builds. One supported outfit per presentation can establish a narrow first proof; it does not complete the full bank.

The existing builder reads `faces/face-<presentation>-<id>.png` and `hair/hair-<presentation>-<id>-back.png` plus `-front.png` under `/Users/lamontae/political-game-play/cto-notes/firefly/three-quarter`. It preserves IDs in `art/people-engine/v1/manifest.json` under `presentations.<presentation>.views.three-quarter.faces` and `.hair`. See `scripts/appearance/build-people-pack.ts:1186`.

For chairs, that source root needs `seated/<presentation>-<build>-bare-v1.png` and matching `<presentation>-<outfit>-<build>-onbody-v1.png` and `-skin-v1.png`. Builds are `lean`, `average` and `fuller`. The builder admits a posture only when all three bare builds exist. Each outfit also requires all three on-body builds. See `scripts/appearance/build-people-pack.ts:929` and `:1007`. Skin files are read during extraction; preserve their registration.

Basic `seated` permits the existing fallback to preserve cushion contact. Exact writing, listening, speaking and meeting activities additionally need `seated-writing`, `seated-listening`, `seated-leaning` and `seated-hands-folded` source folders with the same layer names. This is a source request, not permission to claim those activities from a standing painting.

Request the private pack identified in `docs/plans/active/modular45-people-repair.md:3`: `modular41-current-0a044d183ad7`, manifest SHA-256 `0a044d183ad7ac4f38f2e88f72ba294cd1496c8b4cc4466cce023b6a7b0694a2`. The missing recipient paths are `art/manifest/character_candidate_modular45_registry.json`, `art/authoring/modular45/build.py`, and `art/authoring/modular45/firefly/ledger.json`, together with the rasters those records reference. Keep private material outside public Git history.

Rear-facing chairs need a separate authored rear-view bank and an explicit identity/schema mapping. The current engine has only `front` and `three-quarter` views (`src/presentation/appearance-engine/pack.ts:261`). No rear-view asset IDs or canonical source paths were found. Do not invent IDs or label mirrored front paintings as rear views.

## Existing source-bank inspection

Measured: both turned registries contain zero faces and zero hairstyles. Each presentation has three turned standing bodies. All 25 outfits have turned standing builds, but no turned seated or named-posture entries. The request records the inspected manifest hash and unchanged turned-body hashes.

Measured: 18 failed hair pairs remain recorded across two existing sources in `art/manifest/people_visual4_hair_attachments.json`. The request preserves their exact head IDs, original source hashes and composite hashes. The sources are `OCD_HAIR_FEM_LIGHT_COLOR_AGE_FEMININE_WARM_BLOND_SHOULDER_LAYERED_V1.png` and `OCD_HAIR_FEM_STRAIGHT_DENSE_SIDE_SWEPT_LAYERED_MEDIUM_V1.png`. Each has nine failed head fits. The recorded defect is a triangular scalp gap at full temple width; a uniform correction was not verified.

No new source repair is justified by this inspection. Existing edge, cuff and skin fixes remain confirmed by the prior audit. Four assembled neck crops did not show a visible seam. Failed hair pairs remain candidates requiring contour/attachment work, with their original review status preserved.

## Recipient return and next action

Return the source location, source manifest hash, identity correspondence, delivered filenames and any absent IDs. The receiving lane will verify hashes and dimensions, prepare additive derivatives in a separate directory, and register only layers whose exact identity and view resolve. It will then rerun pose/contact proofs and the six room captures. Any reproduced sheet repair gets a separate draft with before/after crops and derivative lineage. Human art approval remains outstanding after engineering checks pass.

## Method

This inspection read the existing runtime manifest, builder, private-registry resolver, active repair plan and hair attachment reviews. It changed documentation only. The draft is [PR 2185](https://github.com/lamontaes/Political-Game-Git/pull/2185); its tested code head is `b4d425b3ee85a4c232f36184bb49cbc9b33672cb`. No source artwork, saved identities or candidate statuses changed.
