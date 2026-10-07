# Every pose in every view, and the full place library, built all at once from shared parts and tags (bank id b24, phase equip and inform; Session 11 owns it)

Verified against origin/main e403b9bfd (Oct 6). Bank spec: docs/codex/specs/bank/b24-every-pose-every-view-place-library.md. Numbers re-counted from the files below.

## What the player experiences

Every room looks lived in. People sit in the chairs, lean on the counter, stand at the lectern, turn toward whoever is speaking, and are seen from behind when they face the dais, in every outfit and body type, instead of a few figures facing front while half the seats sit empty. Every place a story can take you (hospital, newsroom, DMV, party office, debate stage, polling place, wedding hall) has its own painting in morning, midday, night, rain and winter light, with its screens, posters and papers showing the game's live news. When a place has no painting of its own you see the closest real match for its kind and region, never a blank or a wrong room. The art grows as one library from shared parts, so a new outfit or pose shows up everywhere at once.

## Owner decisions it rests on

- Owner (this round): poses and places are built ALL AT ONCE, no ranked queue. "Build all of them and more; they're all gonna be used; giving the simulation things to work with." Places: "all at the same time, reuse parts from others and tag it in a different place on a different map."
- Pipeline first: Session 11 fixes the four character defects on a small set until they are truly gone, then mass-produces. (The four defects are listed in Session 11's P0 proof, with before/after crops; this doc does not restate them. Ask Session 11 for the list.)
- Roadmap: "Every pose tagged to the spots it fits"; "Screens, posters, newspapers and TVs tagged in every place"; poses were the priority, now run in the same wave as places.
- Register: art goes in, he curates; judge art side by side; keep art mistakes (a good wrong generation becomes that place or a generic one); code integrates, source art comes from Firefly; never the community-meeting title painting.
- Fixed: nothing blank; one rule for all places; one system per job; delete what you replace.

## Existing code and data (verified on e403b9bfd)

- Data: `art/backdrops/staging.json` (117 places, 870 spots: poses stand 499, sit 221, lean 133, podium 17; facing viewer 351, right 254, left 232, away 33; `surfaces` empty in every place). `art/manifest/pose_families.json` (7 families, `facing_convention` text names three-quarter right/left as mirror images; 6 of 7 `pending-generation`). `art/backdrops/manifest.json` (346 pictures, key `backdrops`, no tags). `art/backdrops/surfaces.json` (56 place entries, per-picture `checked`/`surfaces`/`skipped`). `art/people-engine/v1/manifest.json`. `art/coverage/` does not exist. Older tag precedents: `art/campuses/manifest.json`, `art/regions/regional-scene-places.json`.
- People pack: `src/presentation/appearance-engine/pack.ts:102 BODY_POSES` (16; no `lean`), `:131 POSES_BY_PRESENTATION`, `:217 poseFallbacks`, `:263 BODY_VIEWS = ["front","three-quarter"]`, `:549 posedPieces`.
- Pose choice: `appearance-engine/pose-chooser.ts:82 chooseBodyPose`, `:145 chooseBodyView`, `:160 sceneActivity`.
- Slots: `src/presentation/backdrop-people.ts:82 SpotPose` ("stand"|"sit"|"podium"|"lean"), `:84 SpotFacing`, `:257 spotPose`, `:293 spotView`, `:308 placeBackdropPeople`, "missing-art" at :535 and :550; render `src/player/PlacePeopleLayer.tsx`. Older contract: `presentation/scene-registry.ts RegisteredSceneAnchor`, `presentation/pose-families.ts`.
- Places: `presentation/place-backdrops.ts:79 capitolPlaceFor`, `:142 placeBackdrop`, `:333 placeForLocationKey`, `:356 LOCATION_PLACE`. Kind-level fallback precedent: `presentation/campus-backdrops.ts:112 campusPictureFor`.
- Regex tables to replace: `presentation/dress-code.ts:32 PLACE_RULES`, `presentation/title-civic-rotation.ts:40 KIND_RULES`.
- Builder: `scripts/appearance/build-people-pack.ts` (a pose enters only when every build is painted). Importers: `scripts/art-asset-factory/import-place-backdrops.mjs`, `import-capitol-backdrops.mjs`. Method: `docs/art/seating-audit.md`.
- Tests today: `place-backdrops.test.ts`, `backdrop-people.test.ts`, `backdrop-surfaces.test.ts`, `poses.test.ts`, `poses-landed.test.ts` (mocked pack only).
- Newer code covering part: none; `art-demand.ts`, `art/tags.json` do not exist.

## Build steps (one PR each; steps 2 to 5 run in parallel, not in a queue)

1. **Pipeline first (small set).** Session 11 fixes the four character defects on a small set (one build, both presentations, a handful of outfits, front and three-quarter, standing and seated) with before/after crops until each is gone. The mass wave in steps 4 and 5 starts the moment that is posted; nothing else waits on it (tagging, tests and code run meanwhile).
2. **One tag vocabulary.** `art/tags.json`: closed lists for place `kind`, `use` (civic, work, home, leisure, travel), `setting`, `region`/`climate`/`terrain` (reuse campus values), `light`, `season`, `dressCode`, `civicKind`, `group`, `floor`. Test rejects any tag not listed. Tag every backdrop in `manifest.json`; each pose declares the spot poses and activities it fits (data in the pack manifest, read by `spotPose` and `chooseBodyPose`). Replaces: `PLACE_RULES` and `KIND_RULES` (delete both regex tables).
3. **One slot contract.** `StagingSpot` is the contract; `facing` maps to a required view (viewer to front, left/right to three-quarter mirrored, away to back). Add `lean` to `BODY_POSES`. Retire `RegisteredSceneAnchor` for backdrop rooms and list any registered fixture rooms that keep it. Surfaces: extend `surfaces.json` to every place and write them into `staging.json` (screens, posters, papers, TVs).
4. **Demand computes the whole grid.** `scripts/appearance/art-demand.ts` prints every (spot pose x view) in staging.json x both presentations x 3 builds x every outfit tagged for the place's dress code, plus every face and hair per view, against the pack manifest, and writes `art/coverage/missing.json`. Firefly runs from that list in one wave (firefly-art skill): shared bare bodies per build x pose x view first, then outfits, hair, faces layered on them with the existing chopper; back view and child bodies fold into the same wave. Poses beyond the 16 are added whenever a spot or activity needs one ("and more").
5. **Place library from demand.** The same script lists every place the game can send a scene to (`LOCATION_PLACE`, scene venues, Session 4 situations, campaign scenes, wedding, hospital, school) against painted places. Paint all missing places in the same wave with five variants each; reuse parts from other places and give the reused picture its own tags for the new place and map. Stage (measure spots per the seating audit) and tag surfaces in the same PR. Wire the 15 painted-but-unreferenced places (barbershop, newsroom, party-headquarters, polling-place, public-library, and the rest; re-list from the manifest) into `placeForLocationKey`.
6. **Pick by tags, never null.** `placeBackdrop` resolves exact place, then same `kind` plus nearest region/climate (as `campusPictureFor` does), then same `use`; `capitolPlaceFor` becomes one case. A picture tagged with its real kind serves as that kind's generic ("keep art mistakes").
7. **Coverage test.** `art-coverage.test.ts` over the real pack: every staged spot resolves drawable art (no "missing-art") for both presentations, every build, each common outfit; failures listed by place and spot; a shrink-only allow-list file that ends empty.

## Must NOT build

Per-place code paths; regex place classification; a second backdrop or people pack; Claude- or code-drawn people or backgrounds; seeded random poses (the spot and the activity decide); a ranked or phased queue for poses or places; the community-meeting title painting anywhere.

## Research tables

None needed. The grid size comes from the files above, not a guess. Do not invent counts for outfits per dress code; `art-demand.ts` reads them from the pack builder's outfit specs.

## Done when (played-game proof)

- Random place, six rooms (council chamber, office, diner, classroom, courtroom, living room) plus three newly wired places (newsroom, polling place, party office): every seat with a person shows them seated; side-facing people are three-quarter toward the speaker; dais-facing people show backs; nobody stands in a chair spot; overflow lists zero "missing-art". Screenshots side by side with the paintings.
- `art/coverage/missing.json` empty for the 1.0 outfit set; `art-coverage.test.ts` passes with an empty allow-list; tag test passes; title rotation and dress code read tags.

## Proof to post

Per step: the printed missing-cells count before and after, side-by-side screenshots (painting next to people layer), the delete list for each "Replaces:", the tag test output, `npm run typecheck` plus changed tests. For the pipeline step: before/after crops of each of the four defects.

## Standing rules

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it: a data row, a setting, or one function with the options stubbed. Log the question in the docket and keep building.
Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building.

- Open question: front, three-quarter, back for 1.0, or true side profiles too? Switch: `BODY_VIEWS` plus `facing` map are data; build three views now; a profile view is one more row in the map and one more grid column in `art-demand.ts`.
- Open question: seasons. Switch: `season` is a tag in `art/tags.json`; build morning/midday/night/rain/winter now; autumn and spring are extra tag values and extra rows in `art-demand.ts`, generated by the same wave when the owner says yes.
- Firefly approval: queue and generate; the owner curates by pulling pictures afterward; do not hold batches for approval.

## The four character defects (CTO, Oct 6; traced Oct 5)

1. Jagged white outline on cut-out edges: `src/presentation/appearance-engine/assemble.ts:170-200` (composite rim).
2. Front hair covering the sides of the face: `pack.ts:1030` and the manifest `hair[]` front layers.
3. Collar and hood strip drawn over the hair: `assemble.ts:284-296`, `COLLAR_BAND_SHARE` at `:300`.
4. Cuff discoloring on pants, suits, both women's outfits and the pocket pose: `pack.ts:974-979`, `skin.ts:150-174`, `cloth-edges.ts:13-22` (the Oct 4 cuff prep #2147 never merged).
   Session 11 fixes all four on a small set with before/after crops of the same people; only then does the mass wave run.
