---
id: director-stopgap-scene-placeholder-art
title: "Stopgaps in scene (placeholder-art): 1 open"
area: director
kind: stopgap
priority: 3
status: blocked
standard: 2
claimed-by:
pr:
blocked-on: art: six painted residence rooms from the art pipeline; the code already reads them when they exist
lead: director
model: sonnet
effort: low
root: none
milestone:
source: "src/core2/data/stopgaps.json, src/bench/scene.ts, kind placeholder-art"
after:
size: S
checked: fable 2026-11-10
---

**What.** A sitting president or governor at home is shown outside the White House or the governor's residence by day and in the large house's living room at night, because the residences have no painted rooms. The code already waits for them: `homeOf` in src/bench/scene.ts reads `officialResidences` in src/bench/data/scene-places.json and uses the first picture in each list that exists, so the fix is the art. Paint the six rooms named there (white-house-residence-living, white-house-residence-dining, white-house-residence-bedroom, governor-residence-living, governor-residence-dining, governor-residence-bedroom) in the four conditions every home backdrop has (morning, midday, night, rain), import them through the art asset factory under art/backdrops with entries in the backdrop manifest and staging, then delete the stand-in names (the exterior and large-house fallbacks) from the lists and the stopgap marker in scene.ts, and resolve the row. Seen: a governor at home in the evening, drawn inside the residence and not outside it by day.

**Cause.** Found in code: `homeOf` (`src/bench/scene.ts` line 359) reads `officialResidences` in `src/bench/data/scene-places.json` (line 317) and falls back to the exterior and large-house pictures; the six residence rooms do not exist under art/backdrops (only the governor-residence-exterior files). The stopgap row is kind `placeholder-art` in `src/core2/data/stopgaps/play.json`.

**Fix.** When the six residence rooms are painted in four conditions, import them with manifest and staging entries, delete the stand-in names and the marker in scene.ts, and resolve the stopgap row. Until then nothing is built.

**Time box.** 3 hours for one Sonnet session, once the art exists.

**Rules.** Replace, never layer: once the rooms exist the stand-in entries in scene-places.json and the marker comment in scene.ts are deleted, not left as fallbacks. One rule, all 56 places: the governor's residence room is one picture for every state, so it must show no state's name or flag, with a state-specific exterior staying where it exists. Placeholders: the row is resolved only when the pictures exist, never by deleting the list. No hand-written player text: the scene shows pictures and record data only. Wire to the world: the picture is chosen from the person's office term (`servingOfficeKinds`), so the room changes on the day they take or leave office.

**Done when.** A second session plays a year of buildBenchWorld in a drawn place (place and seed written down) where a named official serves as governor or president, and `homeOf` returns the painted room for that office at morning, midday and night, by person record id and room name. `src/bench/scene-places.test.ts` asserts every name in officialResidences resolves to a backdrop in the manifest with no stand-in left, `npm run validate:art` passes, and the stopgap row is resolved. In the running game the official at home is shown in that room, not outside the house or in the large house's living room.

**Waits on.** Art: six painted residence rooms from the art pipeline (white-house-residence-living, white-house-residence-dining, white-house-residence-bedroom, governor-residence-living, governor-residence-dining, governor-residence-bedroom).

**Files.** art/backdrops/manifest.json, art/backdrops/staging.json, src/bench/data/scene-places.json, src/bench/scene.ts, src/bench/scene-places.test.ts, src/core2/data/stopgaps/play.json

**Notes.** First row: A sitting president or governor at home is shown outside the White House or the governor's residence by day and in the large house's living room at night, because neither residence has painted rooms.

Oct 20 (pool feeder): spec written; no code is missing; the row waits only on the six painted rooms (no residence-room files exist under art/backdrops). Left blocked on the art, which is the CTO's Firefly work, not an owner decision.
