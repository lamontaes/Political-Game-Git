---
name: scene-pictures
description: How any session gives a scene or scene type its picture in Our Civic Duty - the one list (situationPlaces in src/bench/data/scene-places.json), how the lookup resolves (variant row, type row, school list, setting default), adding or swapping a row, running the gap report, adding a wanted-picture entry, and the rule that missing pictures never hold work back. Use when adding a scene type or arc variant, changing where a scene is drawn, or finding which picture a scene used. Not for painting or generating pictures, or for admitting art (asset-scene-admission).
---

# Giving a scene its picture

**The rule (owner, Nov 14, 2026; `.agents/rules/scene-pictures.md`).** Every scene type is mapped to a picture in the one list. A scene with no fitting picture ships anyway on its fallback, with a line in the generated "pictures wanted" list. A missing picture never holds work back: pictures are generated later, and this step generates none and adds no image files.

## Where the list is

- **`situationPlaces` in `src/bench/data/scene-places.json`** is the one place a scene type's picture is named. A key is `"<type>:<setting>"` (`"door-ask:other-home"`), or `"<variant purpose>:<setting>"` for an arc variant (`"ask-signature.lost-job:other-home"`). Settings are the situation types' setting kinds plus `seat` (an officeholder's seat of government, which the director names a venue).
- The value is a list of names tried in order; the first one painted wins. A name nobody has painted is skipped, so a wanted picture goes first and a painted stand-in after it.
- Names starting with `@` are filled in from the records: `@home` (the household the scene is in; for an `other-home` scene the host's, not the player's), `@org` (the employer), `@door` (the door picture for the host's kind of dwelling), `@office` (the room of the office kind the person serves in, `officeWorkplaces`), `@seatroom` (the room of the body the person sits on).
- `sceneSettings` is the default for a setting; `schoolPlacesByAge` the school list. Other screens (the filing counter, meetings, speeches, election night) read their own sections of the same file.

## How a scene resolves (`src/bench/scene-picture-steps.ts`, read by `scene-picture.ts`)

1. The body's own room for a chamber scene.
2. The variant row, when the records gave the scene an arc variant.
3. The type's row.
4. The school list by age, for a school scene.
5. The setting's default. If nothing is painted, the person's own home.

The game and the gap report call the same function, so they cannot disagree.

## Adding or swapping

- **Give a scene its picture:** add or edit one row in `situationPlaces`. Use a painted place from `art/backdrops/categories.json` (it says what each place is, which settings, office kinds and scene types it serves).
- **No fitting picture:** point the row at the nearest painted stand-in, put the wanted name first if you know it, and add `wantedPictures["<name>"] = "one line saying what it shows"`. A wanted picture may show only what the cause record makes true of that household. Never block the work on art.
- **A new scene type:** add a row for each setting it is staged in, or a line in `wantedScenes["<type>:<setting>"]` saying what picture it wants. The guard fails a type that is neither.
- **A new picture painted:** add its rows to `art/backdrops/manifest.json` and one row to `art/backdrops/categories.json`; names already in lists start working.
- **Swapping a picture:** change the name in the row. Do not edit a lookup for one scene.

## The gap report

`npm run scene-pictures` writes `docs/reports/scene-pictures.md` (every type and setting with its picture, where it came from, and its gaps: unpainted names, stand-ins, no night picture) and the generated "Scene pictures wanted" section of `docs/art/WANTED.md`. `npm run scene-pictures -- --check` also fails on stale files. The guard (`npm run guards -- scene-pictures`) fails only on rows that name something that does not exist and on an unmapped new scene type, never on today's gaps. `unmappedToday` in `scene-places.json` is the list of types still on a setting default; it only shrinks.

## Traps

- A row key that is misspelled is skipped silently by the game; the guard catches it.
- Do not add a second picture lookup in a screen or a scene: that is a duplicate to delete.
- Real pictures are checked by eye before a scene is called done (`play-walks`, `seen-in-game`); the report says what a scene resolved to, not that it looks right.
