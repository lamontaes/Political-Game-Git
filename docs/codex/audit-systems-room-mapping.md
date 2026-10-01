# Home scenes read room geometry, but approved child pictures are not connected

The home renderer reads the room's anchors and scale calibration. Children still have no supported engine figure, so an eight-year-old can reach the cream placeholder instead. Approved child source pictures remain unreleased and outside the engine's imported pack. Team 7 needs to connect individually cut child figures to age, pose, build and room contacts. Removing the Here panel can expose more of the room, but does not complete that connection. The owner's exact sister and saved place were not supplied, so her specific display remains unverified.

## The exact consumer and room mappings

Measured source: PlayerGame passes the current world's present people, selected scene, wardrobe and conversation into planLifeScenePeople at src/player/PlayerGame.tsx:1765. The scene is selected from the person's dwelling kind and light through homeSceneFor at src/presentation/life-scene.ts:67. This is the production home/life path.

Measured source: planLifeScenePeople obtains the selected scene from SCENE_REGISTRY at src/presentation/life-scene-people.ts:704. Registered anchors retain x, footprint, floor/seat contacts, allowed body/pose families and facings at src/presentation/scene-registry.ts:142. The mapper therefore reads per-room records; it does not position every person against a single generic room.

Measured source: placement reads the anchor's floor depth, footprint and x at src/presentation/life-scene-people.ts:724. Placeholder width is clamped between 6 and 30 percent of the plate. Its standing height uses width × plate aspect × 2.55; seated height uses 1.5. Its bottom remains on the declared contact line. These formulas do not read the person's age.

Measured source: the six residence families declare 25 scene rows in their six residence-*-wave2.ts modules. The farmhouse declares five rows; each other family declares four. HomeSceneSpecs imports these six families at src/presentation/home-scenes.ts:27. The calibration table supplies six family values at src/presentation/home-scenes.ts:110, so light variants share their family's calibration. These are family calibrations rather than 25 independently fitted child measurements.

Measured source: the small-apartment morning record names a 1672 × 941 plate and hash 627fe036660db362c962645f09fe4a6b79f1878a0fe5cfefb65338a0d5ad195b at src/environment/scenes/residence-small-apartment-wave2.ts:51. Its anchors begin at line 121. Home calibration gives this family near floor depth 86.6 percent and far depth 58 percent, with a far-height input of 38 and standing-height input of 67 at src/presentation/home-scenes.ts:114. The consumer uses the resulting perspective calibration; these coordinates are image-space records, not measured child stature.

## Pose and scale have two separate art paths

Measured source: the engine path requires available bundled engine art and a compatible floor or front-facing seat at src/presentation/life-scene-people.ts:765. It asks sceneActivity about the speaker and anchor type at line 783. The pose chooser returns standing for idle standing people at src/presentation/appearance-engine/pose-chooser.ts:133. Conversation, desk and podium contexts choose other poses from that same module.

Inferred contract gap: the engine branch does not pass the anchor's allowedPoseFamilies or allowedBodyFamilies to its pose chooser. It uses anchor type and seated status instead at src/presentation/life-scene-people.ts:780. Its engine result returns before the older composeSceneCharacter path runs. The older compositor receives the actual anchor at line 585. Therefore reading room position and scale does not establish that the engine enforces every per-room pose/body mapping. Team 7 should validate those permitted sets before committing an engine candidate.

Measured source: engineStandingHeightPercent uses room depth and either the scene's standing-height field or its width calibration and the body contacts at src/presentation/life-scene-people.ts:376. SeatedEngineBox uses the body's seat and sole lines at src/presentation/life-scene-people.ts:338. Team 7 should preserve those contact relationships while adding real child-body metadata.

Measured source: the engine imports only art/people-engine/v1/manifest.json and PNGs directly inside that pack directory at src/presentation/appearance-engine/runtime.ts:1. The inspected manifest has two presentations, each with three adult body builds and twelve named pose entries. It has 18 faces per presentation, 11 feminine hair entries and 15 masculine hair entries. No child stage is supplied by this manifest.

Measured source: engineRecipeFor returns null for an unsupported age at src/presentation/appearance-engine/recipe.ts:215. AppearanceAgeState explicitly marks ages below 18 unsupported at src/presentation/appearance-lifecycle.ts:52. Approved eight-year-old artwork does not bypass this source gate.

Measured source: for supported adults, posedPieces requires the requested body and outfit files, then tries permitted fallback poses and views at src/presentation/appearance-engine/pack.ts:558. PoseFallbacks can end at standing at line 215. Thus a default standing image can follow a missing pose-specific file. No inspected branch names a T-pose. The owner's reported T-pose appearance requires capture of the actual resolved recipe and image before assigning its cause.

Measured source: when the engine supplies no recipe, the life mapper tries releasedLayers at src/presentation/life-scene-people.ts:870. If it produces no layers, hasArt is false at line 935. SceneBackdrop then paints scene-person-figure at src/player/SceneBackdrop.tsx:767. Its cream gradient and rounded shape are defined at src/player/player.css:7335. This source path is consistent with the reported white ghost; it is not a fresh reproduction of that sister.

## The 61 approved sources remain separate from runtime figures

Measured connector read: the pinned import manifest contains 61 selected entries: ten law-place backgrounds, eleven regional backgrounds, four TV images and 36 child source images. All 61 carry runtime_release_status unreleased. The first selected entry begins at art/manifest/asset_manifest.json:5153 on the import pin. The import report explicitly leaves actor fit, scene geometry and browser integration unrun at docs/codex/handbacks/team-7-law-place-import.md:29.

Measured connector read: kids-approval-records contains 36 image records mapped to four contact sheets with nine tiles each. All 36 records remain unreleased, and all 36 report modular fit NOT RUN. These are saved receipt values, not fresh binary or pixel checks. The exact source approval and mapping record begins at art/authoring/sept30-team7/approved-import/kids-approval-records.json:1 on the import pin.

Measured source example: kids_team7_girl_8_standing_casual names girl-8-standing-casual.png, sheet tile 2, dimensions 1536 × 1024 and hash c5d7b44a6f6de446cf0a7c96044fbbdde06480600c3a82b611ce2e1a19a28786 at kids-approval-records.json:2138. Its source observations describe three separated figures for lean, average and fuller builds. That image is a source sheet, not a completed individual sprite. Its modular fit remains unrun.

Measured production inventory: the current asset manifest contains 134 total entries, zero kids_team7 entries and zero paths from these latest import groups. That inventory reads art/manifest/asset_manifest.json:1. Even after the import merges, its unreleased entries and authoring paths do not become the engine's direct PNG imports automatically. Production component art also has a separate registry route at src/presentation/visual-integration.ts:789.

## Named saved evidence and the missing sister reproduction

Measured preserved evidence: Isabel Bell appears in the gen14-a Kentucky candidate-preview receipt with six layers and no refusal at docs/agent/evidence/modular-gen14/README.md:94. The same receipt reports a 13-year-old sister refused because every review body was adult at line 142. It does not name that sister or her town. It is older candidate-preview evidence and does not establish today's engine behavior or the owner's eight-year-old reproduction.

Required reproduction input: the owner or existing playtest lane supplies the sister's saved person ID, name, birth date, place, current scene ID and production build head. No name, town or new playthrough is invented here.

## Exact handoff to Team 7

Proposed source binding: select the approved girl-eight source by its exact hash, then cut and identify each build as an individual figure. Preserve the source sheet, tile, crop rectangle, output hash and any garment/body separation. Record alpha bounds, head/neck contacts, soles and seated pelvis where applicable. Do not paint the whole three-figure image or a nine-tile contact sheet as one NPC.

Proposed consumer change: add explicit supported child stages to the engine manifest and recipe contract at src/presentation/appearance-engine/recipe.ts:209, then update the age gate at src/presentation/appearance-lifecycle.ts:52 only for stages the pack can draw. Route those figures through the existing room compositor at src/presentation/life-scene-people.ts:765. Include requested and resolved pose/build/source IDs and missing-file reasons in placement diagnostics. A release flag alone does not establish those contracts.

Proposed scale contract: distinguish the room's perspective multiplier from the child figure's supported size/contact metadata at src/presentation/life-scene-people.ts:376. Keep soles on the selected floor contact and pelvis on a real seat contact. The present adult calibration and age-blind placeholder box cannot establish an eight-year-old's relative height.

Recommended minimum fixture: use one saved eight-year-old girl and one supported adult in the same mapped home. Verify individual source/build selection, stage eligibility, requested/resolved pose, contact positions and a visible refusal when a required sprite is unavailable. Exercise one standing anchor and one calibrated seat with matching child art. This fixture is recommended; it was not written or run here.

Recommended browser acceptance: Team 7 or the existing playtest lane opens the owner's actual save, records scene/person/anchor/source identifiers, captures the child beside the adult, changes conversation state, and checks Save/Continue. Capture engine decode errors as well: the current image hook swallows composition rejection at src/player/EnginePerson.tsx:21. That is a separate blank-image risk, not proof of the observed ghost. Here-panel changes require their own viewport capture after the sprite and room bindings are present.

## Method and checks

Production source remained fd4925e6a6dae3446d2fefe40df2cfc2d2ef931e. Import source was read through the connector at 004ca8bcb2b764a27227c6d10f80c4e86aa9b734; import citations refer to that pin. Bounded source reads and manifest counts produced docs/codex/audit-systems-room-mapping.json:1. No checkout, Git mutation, production edit, browser test, audit world or asset acceptance run occurred. Source pixel approval, runtime eligibility, geometry fitting and browser acceptance remain distinct evidence.
