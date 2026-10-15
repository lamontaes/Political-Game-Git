# Every pose in every view, and the full place library, built at once from shared parts and tags (bank id b24, phase Equip & inform)

## What the player experiences

Every room in the game looks lived in. People sit in the chairs, lean on the counter, stand at the lectern, turn toward whoever is speaking, and are seen from behind when they face the dais, in every outfit and body type, instead of a few figures standing face-front while half the seats sit empty. Every place a story can take you (the hospital, the newsroom, the DMV, the party office, the debate stage, the polling place, the wedding hall) has its own painting in morning, midday, night, rain and winter light, with its screens, posters and papers showing the game's live news. When a place has no painting of its own, you see the closest real match for its kind and region, never a blank or a wrong room. The art grows as one library from shared parts, so a new outfit or pose shows up everywhere at once.

## Owner decisions this rests on

- Roadmap (Equip & inform, Session 11): "Every pose tagged to the spots it fits (16 poses today)"; "Screens, posters, newspapers and TVs tagged in every place (0 today)"; "Many more poses (your priority over new places)."
- Register, Sept 26: "Backgrounds and interfaces mostly stay the same; people are what changes... The game does not ship without both the modular people and the backgrounds."
- Art goes in, he curates; judge art side by side; keep art mistakes (a good wrong generation becomes that place or a generic one).
- Claude graphics boundary (Register :194): code integrates; source art comes from the art pipeline (Firefly).
- One system per job; nothing blank; one rule for all places. Never the community-meeting title painting.

## Existing code it must use

- People pack: `src/presentation/appearance-engine/pack.ts:101 BODY_POSES` (16), `:130 POSES_BY_PRESENTATION`, `:216 poseFallbacks`, `:262 BODY_VIEWS = ["front","three-quarter"]`, `:422 PackView`, `:549 posedPieces` (falls back to front), `:90 OutfitTag`. Manifest `art/people-engine/v1/manifest.json`: three-quarter has standing bodies/outfits only, empty faces and hair, so every turned request falls back to front; 6 seated activity poses missing for 13 outfits; no back view.
- Pose choice: `appearance-engine/pose-chooser.ts:17 SceneActivity`, `:82 chooseBodyPose`, `:145 chooseBodyView`, `:160 sceneActivity`; `hero-posture.ts:37`.
- Builder: `scripts/appearance/build-people-pack.ts` (Firefly folders :620/:653, standing/seated lists :622/:629, outfit specs :261-437, turned view :1183; a pose enters only when every build is painted :612-618).
- Slot contract: `src/presentation/backdrop-people.ts:68 SpotPose`, `:70 SpotFacing`, `:72-100 StagingSpot`, `:102 PlaceStaging`, `:232 spotPose` (lean → standing/arms-folded), `:268 spotView`, `:283 placeBackdropPeople` (drops "away" :336; overflow "missing-art" :461-466); render `src/player/PlacePeopleLayer.tsx:23`. Data `art/backdrops/staging.json` (117 places, 870 spots; 486 left/right spots yield missing-art; 133 lean; 33 away). Older separate contract: `src/presentation/scene-registry.ts:53 RegisteredSceneAnchor`, `src/presentation/pose-families.ts:42/:57`.
- Places: `art/backdrops/manifest.json` (346 pictures, 117 places; variant is the only axis; no tags); `src/presentation/place-backdrops.ts:142 placeBackdrop`, `:79 capitolPlaceFor` (the only kind-level fallback), `:333 placeForLocationKey`, `:356 LOCATION_PLACE`; 15 painted places never referenced in src (barbershop, newsroom, party-headquarters, polling-place, public-library, …).
- Regex "tags" to replace: `src/presentation/dress-code.ts:32 PLACE_RULES`; `src/presentation/title-civic-rotation.ts:40 KIND_RULES`.
- Real tag precedents: `art/campuses/manifest.json` (region, climate, terrain) with `src/presentation/campus-backdrops.ts:112`; `art/regions/regional-scene-places.json` typed in `src/authoring/regional-scene-coverage.ts:74-132`; surfaces `art/backdrops/surfaces.json` with vocab `src/presentation/backdrop-surfaces.ts:52-63`.
- Importers: `scripts/art-asset-factory/import-place-backdrops.mjs`, `import-capitol-backdrops.mjs`. Tests: `place-backdrops.test.ts`, `backdrop-people.test.ts:44`, `backdrop-surfaces.test.ts`, `poses.test.ts`, `poses-landed.test.ts` (mocked pack only).

## What to change

1. **One tag vocabulary.** `art/tags.json`: closed lists for place `kind`, `use` (civic, work, home, leisure, travel), `setting` (indoor/outdoor), `region`/`climate`/`terrain` (reuse the campus values), `light` and `season`, `dressCode`, `civicKind`, `group` and `floor` (today free text in staging.json). A test rejects any tag not in the file.
2. **Tag every picture and pose (Session 11 owns the tagging).** Each `manifest.json` backdrop gets `tags`; `title-civic-rotation` KIND_RULES and `dress-code` PLACE_RULES read tags instead of regexes (delete both regex tables). Each pose in `BODY_POSES` declares the spot poses and activities it fits (data in the pack manifest, read by `spotPose`/`chooseBodyPose`). Surfaces stay in `surfaces.json`, extended to every place (screens, posters, papers, TVs).
3. **One slot contract.** `StagingSpot` is the contract; `facing` maps to a required view (`viewer`→front, `left/right`→three-quarter mirrored, `away`→back). Add `lean` to `BODY_POSES` (stop mapping lean spots to standing). Retire `RegisteredSceneAnchor` for backdrop rooms (registered fixture rooms keep it until replaced; list them in the PR).
4. **Demand drives the art.** `scripts/appearance/art-demand.ts` computes the full grid the game needs: every (spot pose × view) in staging.json × both presentations × 3 builds × every outfit tagged for that place's dress code, plus every face and hair per view. It prints the missing cells against the pack manifest and writes `art/coverage/missing.json`. The Firefly batches (firefly-art skill) are queued from this list in one wave: shared bare bodies per build × pose × view first, then outfits, hair and faces layered on them with the existing chopper; Q8 part 3 (back view) folds into this wave.
5. **Place library from demand.** The same script lists every place the game can send a scene to (`LOCATION_PLACE`, `SCENE_VENUES`, Session 4 situations, campaign scenes, wedding, hospital, school) against painted places; each new place is painted with all five variants, staged (spots measured, documented method from `docs/art/seating-audit.md`) and surfaces tagged in the same PR. Wire the 15 unreached places into `placeForLocationKey`.
6. **Pick by tags, never null.** `placeBackdrop` resolves exact place first, then same `kind` + nearest region/climate (as `campusPictureFor` does), then same `use`; `capitolPlaceFor` becomes one case of this. "Keep art mistakes": a picture tagged with its real kind serves as the generic for that kind.
7. **Coverage test.** `art-coverage.test.ts` over the real pack (not a mock): every staged spot resolves drawable art (no "missing-art") for both presentations, every build and each common outfit; failures listed by place and spot; a shrink-only allow-list file.

## Must NOT build

- Per-place code paths, regex classification of places, or a second backdrop or people pack.
- Claude- or code-drawn people or backgrounds (art comes through Firefly and the owner's curation).
- Seeded random poses; the spot and the activity decide the pose.
- New places before the pose grid is complete (owner priority: poses first).
- The community-meeting title painting anywhere.

## Done when (proof in a played game)

- Random place, six rooms (council chamber, office, diner, classroom, courtroom, living room) plus three newly wired places (newsroom, polling place, party office): every seat that has a person shows them seated; side-facing people are turned three-quarter toward the speaker; dais-facing people show their backs; nobody stands in a chair spot; `overflow` lists zero "missing-art". Screenshots side by side with the painting for owner review.
- `art/coverage/missing.json` is empty for the 1.0 outfit set; `art-coverage.test.ts` passes with an empty allow-list; tag vocabulary test passes; title rotation and dress code read tags.

## Depends on

- Session 11 (owner of seating, poses and tagging: parts 2, 3, 7 are its work; parts 4–5 feed its art queue).
- Q8 parts 1, 3, 4 (child bodies, back view, pantsuit) join the same wave; Session 4 (scene system says who is present and what they are doing).
- Firefly art capacity and owner approval of each batch.

## Open questions for the owner

- Are front, three-quarter and back enough for 1.0, or do you want true side profiles too (people walking past, sitting sideways at a counter)? (a) Three views for 1.0; (b) add side profiles now.
- Seasons: today only winter exists besides time of day and rain. (a) Keep morning/midday/night/rain/winter; (b) add autumn and spring sets for regions where they look different.
