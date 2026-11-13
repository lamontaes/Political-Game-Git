# Full-body people: set aside until after early access

This is the record the CTO ordered on Nov 10, 2026 (issue #7365) before any full-body code or art leaves the game. It says what the full-body system is, where the last complete copy lives, what is deleted, what is moved and what stays, so the work comes back after early access without being rebuilt from memory.

## The ruling

Owner, Nov 10, 2026, about 9:24 p.m., on call 7 of the decisions page (`docs/coordination/OWNER-DECISIONS.md`, Nov 10):

> "No, absolutely not B. Remove all the people. And yes, I think the speaker as a large bust. ... Maybe people can be on top of the text box and, you know, the picture of their portrait can resize based on how many people there are, and maybe, you know, get a little bigger when they're talking or something. And I think there needs to be ... some kind of screen or mock-up or something to see who's in the room, I guess, when you enter a place if we're not going to have people."

Owner, about 9:27 p.m.:

> "people will eventually be in the game, but right now for early access, it's just we have to do the busts."

So for early access a room is its painting alone, a person is a bust, and the full-body system is **set aside, not thrown away**.

## The last complete copy

**Commit `843df6be9bd4d12aac85b350ee2844969e272daf` on main (Nov 11, 2026, 02:44 UTC)** holds every file named below, working. Any commit on main up to the merge of the first removal pull request also holds it. Each removal pull request adds its own number and the commit just before it to the table at the end of this page.

To look at the system as it was: `git worktree add ../full-body 843df6be9b` (use the `helper-checkout` skill for a sparse copy, then add the three art folders).

## What the system is

| Part                                   | Where                                                                                         | What it does                                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The people pack                        | `art/people-engine/v4` (140 MB, 1,279 files), read only by `src/bench/people-pack.ts`         | Six painted people in outfits, colors and poses; the creator's choices; the figure pictures                                                       |
| Mannequin plates and spots             | `art/people-rooms` (3.3 MB), `src/bench/mannequin-plates.ts`, `scripts/people/`               | Where in each painted room a person may stand or sit, measured from a plate of gray mannequins                                                    |
| What stands in front of a person       | `art/backdrops/occluders` (11 MB), `src/bench/occluders.ts`                                   | The desk, couch or counter drawn over a figure                                                                                                    |
| Seating                                | `stagePeople` in `src/bench/scene.ts` (lines 723 to 879)                                      | Puts each person present on a spot by their role, the occasion and the room                                                                       |
| Fitting a figure to a spot             | `figureForSpot`, `fitOn`, `dressedForPlace`, `colorsFor` in `src/bench/whole-figures.ts`      | Picks the pose and angle, sizes the figure to the mannequin, dresses it for the place                                                             |
| Drawing                                | `#people` in `play.html`, `roomPeople` in `src/bench/ui/room.mjs`, `drawPeople` in `play.mjs` | Draws the figures, shadows and fronts over the painting; a click on a figure opens a talk                                                         |
| The creator's two full-length pictures | `#cr-portrait`, `#cr-portrait-work`, `src/bench/appearance.ts`, `/api/portrait`               | The player's everyday and work figure, built from the choices                                                                                     |
| Skills                                 | `people-pack`, `room-spots`, parts of `asset-scene-admission`                                 | How to add people, plates and spots                                                                                                               |
| Stopgaps                               | `src/core2/data/stopgaps/play.json`                                                           | `SG-PLAY-people-pack-six`, `-people-pack-v4-pose-gaps`, `-people-everyday-falls-back-to-work`, `-plate-overflow-spots`, `-home-plated-room-first` |

## What happens to each part

**Deleted from the game (kept in the commit above):**

- `src/bench/mannequin-plates.ts`, `src/bench/occluders.ts`, and their tests.
- In `src/bench/scene.ts`: `stagePeople`, `BenchScenePerson`, `BenchScene.people` and `.unplaced`, the `PLATED` set and the plated-living-room preference.
- In `src/bench/whole-figures.ts`: `figureForSpot`, `fitOn`, `dressedForPlace`, `colorsFor`, `drawnUrl`, `ContactShadow`, `FigureBox`, and `portraitFigure` once `faceOf` no longer needs it.
- In `src/bench/people-pack.ts`: `figureUrl`, `figureAtPath`, `drawAhead`, `drawAheadOn`, `drawAheadNow`, `packFigure`.
- In `src/bench/ui/room.mjs`: `roomPeople`, `shadowsOf`, `occluderOf`. In `play.mjs`: `drawPeople` and its 13 call sites. `#people` and the `.figure`, `.talkable`, `.occluder` and `.shadow` styles.
- The routes `/art/people/`, `/art/people-rooms/fronts/` and `/art/backdrops/occluders/` in `src/bench/handler.ts`.
- The hand-run scripts `src/bench/scene-check.ts` (removed), `src/bench/art-check.ts` (removed) and `scripts/people/`.
- Tests that only check figures in rooms: `people-pack.test.ts`, `occluders.test.ts`, `stage-reasons.test.ts`, `director/scene-occasions.test.ts`, the figure cases in `montage.test.ts`, `campaign-mail.test.ts`, `director/opening-story.test.ts` and `government.test.ts`, and the browser checks `framing`, `opening-montage`, `talk-clickable` and `room-talkable-after-story`.
- The five stopgaps above are closed as "set aside with the system".

**Moved to `art/archive/full-body/` (new) with a README (nothing in the game reads it):**

- `art/people-engine/v4`
- `art/people-rooms`
- `art/backdrops/occluders`

The desktop build copies every art folder that code reaches (`desktop/scripts/build-play-api.mjs`), so the move happens only after no code names these folders. That takes about 154 MB out of the build.

**Stays, because busts or the who's-here view need it:**

- `art/busts/v1` and `src/bench/bust.ts`.
- `packPersonOf`, `bustOf`, `ageBandOf` and `dressKindFor` in `whole-figures.ts`: which of the bank's people someone looks like, and how they are dressed.
- `presentIds` in `scene.ts` and the talkable test in `handler.ts`: who is in the room and who has something to say. This is what the who's-here view reads.
- `art/backdrops/staging.json` and `src/bench/staging.ts`: a room's spot count still caps how many coworkers are present. The cap gets its own small number per room when the who's-here view is built.
- `faceOf` and `PersonFace`, rebuilt on the bust alone (ten menu readers).
- The creator, moved to busts (pool item `play-new-game-and-creator-open-without-busts`).

## What has to change first

Busts lean on the pack today, so the pack cannot move until two things are cut:

1. `bust.ts` reads `packPeople()` to rank skin tones, and `packPersonOf` picks one of the pack's six people. The six people's id, sex and skin move into the bust bank's own data.
2. `faceOf` returns nothing when `portraitFigure` finds no figure, and the headshot and strip parts fall back to cropping a full figure. Both go once every person has a bust.

## The steps, each one checkable

| Step | What changes                                                                                                                                        | What the player sees                                                     | Waits on                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| 0    | This record                                                                                                                                         | Nothing                                                                  | Nothing                              |
| 1    | Busts stand alone: the six people's rows move to the bust bank, `faceOf` is the bust only, the crop fallbacks are deleted                           | Nothing (the same busts)                                                 | Nothing                              |
| 2    | The who's-here view and the talk row of busts are built, and `drawPeople` and `#people` are deleted in the same pull request                        | Rooms are the painting; people are busts; a click on a bust opens a talk | The owner's answers to calls 8 and 9 |
| 3    | The server side goes: `stagePeople`, plates, fronts, routes, the tests and scripts above; the five stopgaps close; the open plate items are dropped | Nothing                                                                  | Step 2                               |
| 4    | The creator shows a bust and offers what a bust can show                                                                                            | The creator's two full-length pictures become one bust                   | See below                            |
| 5    | The three art folders move to `art/archive/full-body/` (new); the `people-pack` and `room-spots` skills say they are set aside                      | Nothing; the download is about 154 MB smaller                            | Steps 3 and 4                        |

## Two things the removal changes that the owner has not seen yet

1. **The opening address draws people.** Its pictures put the President at the address desk, officials in the Oval Office, people at the colonnade and the depot, and the household at home, all as full figures on plates (`src/bench/montage.ts`, line 211; `src/bench/story.ts`, line 197). Under the ruling those pictures become the paintings alone and the President speaks as a bust at the talk box. Election night and the swearing-in already draw nobody, because their rooms have no plate.
2. **The creator loses choices a bust cannot show.** Today the player picks a build, the colors of a top, pants, shoes and hair, and a work outfit. A bust shows a head (skin tone), hair, facial hair and one top. The approved front mocks (`docs/mocks/2026-11-08-front`, fr-creator) are read before step 4 is built.

## When full bodies come back

- Start from the commit above, not from memory. The plates, spots and the fitting code were measured against the paintings and took most of October.
- The art is in `art/archive/full-body/` (new); the paintings they were measured against are still in `art/backdrops`.
- The `people-pack` and `room-spots` skills keep their methods and their traps.
- The owner's standing rulings on full bodies still apply: one figure per named person, people drawn only on a plate's spots, and the Nov 10 note that staging defects are not filed while busts are the system.

## What step 2 left for step 3

Step 2 took the figures off the screen and made the scene's list of people independent of plates. It left these in the tree, unused by the game, for step 3 to delete: `src/bench/mannequin-plates.ts` (still read by the home's plated-room preference in `scene.ts`, stopgap `SG-PLAY-home-plated-room-first`), `src/bench/occluders.ts` and its test, the figure functions in `whole-figures.ts` and `people-pack.ts`, the three art routes in `handler.ts`, `seatRoles` and `occasions` in `src/bench/data/whole-figures.json`, and `scripts/people/`. A room's spot count in `art/backdrops/staging.json` still caps how many coworkers are present (`presentIds`); it gets its own small number per room in step 3.

## Removal log

| Step | Pull request                                                                                                                                                                                  | Commit on main just before it                                |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 0    | this page                                                                                                                                                                                     | `843df6be9b`                                                 |
| 1    | #8511                                                                                                                                                                                         | the commit before `a2f25c0538`                               |
| 4    | #8526                                                                                                                                                                                         | the commit before `b73c2fd3ba`                               |
| 2    | the strip of busts (owner, call 11, Nov 11): `peopleHere` in `src/bench/scene.ts` replaces `stagePeople`; `drawHere` and `ui/bust-strip.mjs` replace `drawPeople`, `roomPeople` and `#people` | filled in by the pull request that removes the rest (step 3) |
