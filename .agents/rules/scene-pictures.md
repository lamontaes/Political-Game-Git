# Every scene has a picture row, and a missing picture never holds work back (owner, Nov 14, 2026, 02:00 UTC)

Every role follows this file. The skill `scene-pictures` says how; the guard `scene-pictures` holds it.

The owner's words (Nov 14, 02:00 UTC, relayed by the coordinator): "make that a perm thing and a skill... do not let pics hold it back. it can be generated later." And at 01:42 UTC: "be sure everything is already mapped to pictures. If there is no picture, make sure that it's easy to find and that it's easy to add or adjust to. So that way... this is a pipeline in the future."

## The rule

1. **Every scene type is mapped to a picture in the one list**, `situationPlaces` in `src/bench/data/scene-places.json`, one row per setting it is staged in (and per arc variant that wants its own).
2. **A scene with no fitting picture ships anyway** on its fallback (the nearest painted place), with a line in `wantedPictures` or `wantedScenes` saying what picture it wants. The generated list is `docs/art/WANTED.md`, section "Scene pictures wanted".
3. **A missing picture never holds work back.** No builder, checker or merger sends a change back, or waits, for a picture. Pictures are generated later by the art pipeline; no session generates or adds image files for this.
4. **The guard** (`npm run guards -- scene-pictures`) fails a row that names a type, variant or setting that does not exist, a picture-category row for a place that is not painted (or a painted place with no category row), and a scene type that is neither grandfathered in `unmappedToday` nor has a row or a `wantedScenes` line. It never fails on a gap that is already listed.
5. **One lookup.** A screen or scene never keeps its own picture choice for a scene type; it reads `situationPlaces` through `src/bench/scene-picture-steps.ts`.
