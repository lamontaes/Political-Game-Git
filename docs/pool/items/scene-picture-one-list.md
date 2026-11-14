---
id: scene-picture-one-list
title: "A scene is drawn in a picture named in one list: door scenes at the host's door, seat scenes in the body's room, office scenes by office kind"
area: art
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-md7v2m
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "owner, Nov 14 01:42 and 02:00 UTC; survey /mnt/project-files/pictures/scene-picture-map.md"
claimed-at: 2026-11-14T01:52:00.000Z
---

**What.** Scenes at another household's home (door scenes, apology, betrayal, care and the rest) were drawn in the player's own home, scenes at an officeholder's seat were drawn in the community room, and every office scene showed the city hall hallway even for a governor. One list, `situationPlaces` in `src/bench/data/scene-places.json`, now names a scene's picture, with a gap report and a guard, and every painted place is categorized in `art/backdrops/categories.json`. Seen: the door scene on a resident's porch, a floor debate in the body's chamber and a governor's desk visit in the governor's office.

**Cause.** Found in code: `src/bench/story.ts` resolved `@home` with the player's id and ignored the scene's household record; `src/director/scheduling.ts` `resolveSetting` named a seat a plain venue so `situationPlaces` could not tell it from a hall; `sceneSettings.office` never read `officeWorkplaces`; eight rows in `situationPlaces` named types or settings that do not exist and nothing flagged them.

**Fix.** One lookup (`src/bench/scene-picture-steps.ts`, used by `scene-picture.ts`): variant row, type row, school list, setting default. `@home` for an other-home scene reads the host's household; `seat` is its own setting; `@office` and `@seatroom` read the office kind and the body's room; the dead rows are deleted; `npm run scene-pictures` writes `docs/reports/scene-pictures.md` and the pictures-wanted section of `docs/art/WANTED.md`; the guard `scene-pictures` fails a row naming something that does not exist and a new scene type with no row and no wanted line. Rule and skill: `.agents/rules/scene-pictures.md`, skill `scene-pictures`.

**Time box.** 4 hours for one Sonnet session. Pictures are not generated in this item.

**Rules.** An effect is a read, not a record: the lookup is read by the story scene and by the gap report, one function. One rule, all 56 places: no place is named in the rows or the code. Replace, never layer: the eight dead rows and the story's inline picture steps are deleted. A missing picture never holds work back (owner, Nov 14).

**Done when.** A second session, on main in a drawn place with a seed it chose, plays a door scene and sees it on the resident's porch in the picture of their kind of home (not the player's living room); sees a seated official's floor debate or address in the body's chamber; sees a governor's or mayor's desk visit in that office; and runs `npm run scene-pictures -- --check` with no failure. A test names the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/scene-picture-steps.ts, src/bench/scene-picture.ts, src/bench/scene-picture.test.ts, src/bench/story.ts, src/bench/scene.ts, src/bench/data/scene-places.json, src/director/scheduling.ts, src/director/scene.ts, scripts/scene-pictures/report.ts, scripts/scene-pictures/build.ts, tests/guards/scene-pictures.test.ts, art/backdrops/categories.json, docs/reports/scene-pictures.md, docs/art/WANTED.md

**Notes.** Arc variants (the door scenes' lost-job, rent-notice and the rest) get a picture by adding `"<variant purpose>:other-home"` rows once their variant ids are in `arc-variants.json`; the guard checks the purpose id exists. `unmappedToday` in `scene-places.json` lists the types still on a setting default; it only shrinks.
