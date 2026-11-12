# PEOPLE: only approved whole figures, placed like real people

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Owner: Lamontae. Written by the Opus CTO on Oct 13, 2026, from the code at main `d39511ac2`.

You are the one session that owns **how people are drawn in scenes**:

- which figure stands for a person;
- where and how they stand or sit;
- which way they face;
- their size and shadow.

You don't own places (the paintings, their tags, which picture a scene uses, Travel). The LOCATIONS session owns those, in `docs/coordination/locations.md`. You also don't own menus and panels. The Opus CTO makes all new art in Firefly and commits it to the repo. You never generate images yourself; you write what you need into the art request file below.

## What the owner said (Oct 13, about 3:50 p.m.)

- "the president is too small and he's not sitting behind [his desk] … He's sitting on top of the back of the chair."
- "the senators their legs are still cut off. They're still facing you. Why would they be sitting backwards in the seats? They're still too small. As a matter of fact, those look like they're old models. Again, when I said explicitly that they should be completely deleted…"
- "Why can you not figure out standing people? Like, I don't understand on a plane."
- "Travis Olson. To the left, model that was not accepted. Under all the characters, the new ones, they have shadows that don't match up with where they're standing. Why are they just standing in the middle of the room?"
- "Why is this random dude on a fucking computer?"
- "Why is everybody facing you? And why are the unapproved models still in the game? I said to remove all the people stuff yesterday."
- "why does this kid have a random ass skateboard? That makes no sense in an house."
- "Number 40 … It's just a bunch of kids in random … Are these 18, but why are random people in there? … Why is my character model not updated? Again, everybody is facing me."
- "So there's only two teens, a boy with a basketball and in shorts… Only two teen girl looks… Never by what the person is doing." He means figures must be chosen by what the person is doing.
- Oct 13, 4:20 p.m.: "I want the other one to remove all the old models, shadows, seated figures, etc."

The 97 screenshots he reacted to are on branch `cto/ui-screens-2026-10-13`, folder `screens/2026-10-13/`. Look at all of them first.

## How people are drawn today (checked in the code)

- **`src/bench/scene.ts` `stagePeople()`** puts each person on the place's staging spots. The first person goes on the hero spot, and the rest are sorted "behind the lead, nearest first".
  - For each person it calls `wholeFigureFor()`. When that returns nothing, it falls back to **the old layered people engine**:
    - `recipeFor` → `engineRecipeFor`, `composeEnginePerson`, from `art/people-engine/v1`;
    - drawn by `/api/figure` → `figurePng`;
    - imports from `src/presentation/appearance-engine/*` and `src/presentation/dress-code.ts`.
  - **These are the unapproved models the owner keeps seeing.**
- **`src/bench/whole-figures.ts` `wholeFigureFor()`:**
  - returns `null` for any spot whose pose isn't `stand` (line 96), so every seated, leaning or podium spot falls back to the old engine;
  - uses only figures with `angle === "three-quarter"` (lines 30–34). The 6 side views and 6 back views in the art are never used;
  - picks a look by sex, age band and outfit only (`outfitsFor`: an official's outfits at government places, a workplace's outfits, otherwise casual by age), then by a hash of the person's id. It never looks at what the person is doing, or who else is in the scene;
  - mirrors the figure to face the spot's `facing` if it's left or right, otherwise "toward the middle". A three-quarter figure still looks at the camera;
  - sets size as `heightMeters[band] × metersPercent × (spot.y − horizonY)` from `src/bench/data/whole-figures.json` and the staging.
- **Shadows:** `src/bench/play.css` (`#people .figure .shadow`, near line 629) draws one fixed oval at the bottom of the figure's picture box (`bottom: -1.2%`, `left/right: 15%`). It isn't drawn at the feet, so it floats below anyone whose picture has empty space under the feet (`footY` < height).
- **Staging** is `art/backdrops/staging.json`: 178 places, 2,141 spots.
  - Poses: sit 1,188, stand 785, lean 140, podium 28. So **1,356 spots can never hold a whole figure today**.
  - Facing: viewer 589, away 817, left 369, right 366.
- **The art** is `art/people-whole/manifest.json`: 177 figures, 59 looks × 3 builds (slim, average, heavy). All are standing.
  - Angles: 165 three-quarter, 6 back, 6 side.
  - Ages: adult 123, older 30, teen 12, child 12.
  - **Teens have 4 looks:** a boy in a hoodie with a skateboard, a boy in shorts with a basketball, a girl in a hoodie with a backpack walking, and a girl in a varsity jacket carrying something. Children also have 4 looks.
  - Each look was painted doing one thing (`activity`: skateboard, laptop, reading and so on). The owner wants plain poses instead (item 7).
- **The player** is drawn with the teen figures until 18, then an adult casual figure. Nothing ties the adult look to the teen look, so they're different people.
- **The opening** (`src/bench/opening.ts`) uses the same `stagePeople`. That's why the president is the old seated model in the Oval Office.

## What to do

1. **Delete the old models completely.**
   - Take the people-engine fallback out of `stagePeople`, and remove `/api/figure` and `figurePng`.
   - Delete `art/people-engine/v1` and the appearance-engine code, dress code and their tests, once nothing reachable from `/play` uses them. Check by reachability from `src/bench/server.ts`, the way the old-engine removal did on Oct 12.
   - Where no approved figure fits a spot, draw nobody on that spot; put the person on a fitting standing spot instead. Never an old model.
   - Report how many files and megabytes you removed.
2. **Seated figures.**
   - Wire seated whole figures to every sit spot: the chair's `seatY`, cut off below the desk at `clipBelowY`, sized so the seat and the person match the chair.
   - Until the CTO's seated art lands, seated spots stay empty.
   - The president sits in his chair behind the Resolute desk, not on top of it. Senators and legislators sit in their seats facing the front of the chamber. Council and commission members sit at the dais, not in the audience.
3. **Facing.**
   - People face who they're with: the person they're talking to, the speaker, the dais, the front of the room. Use side and back views where the spot faces away or sideways.
   - Only a speaker addressing the room, or a person talking to the player, faces out.
   - Fix the `facing` of existing spots in `staging.json` where it's `viewer` but a real person there wouldn't face out.
4. **Standing in sensible places.**
   - People stand by a counter, a desk, a doorway, a wall or a window, and in groups when they're together. Not in the middle of the floor.
   - Fix existing stand spots in `staging.json` that sit in the open middle of a room.
   - Coordinate with LOCATIONS, who stages the new places by the same rules.
5. **Size.**
   - Check every place's `horizonY`, `metersPercent` and `floors` against its painting, so a person's height matches doors, desks and chairs at that depth.
   - The president, senators and members in the chambers must be the right size.
6. **Shadows.**
   - Draw the contact shadow at the feet: at `footY` within the figure, as wide as the stance, and soft.
   - A seated person's shadow goes under the chair, or there's none when the desk hides it.
   - Shadows must line up with where the person stands.
7. **Plain poses first; the simulation decides what people are doing.**
   - Owner, Oct 13, 2026: "regular poses, not with a laptop or a book or something. You don't decide that. The simulation decides what they're doing." Then: "I want plain poses first."
   - Every person is drawn in a plain pose by default: standing or seated, three-quarter, side or back, hands empty. No prop is ever baked into the only version of a look.
   - Pick the plain pose that fits the spot (stand or sit, which way it faces) and the person's sex, age and build.
   - Prop versions (phone, book, coffee, carrying) come later, after the plain set. When they exist, the picker uses one only when the person's current act in the simulation (`doing()` in `scene.ts`) is that act. Otherwise it's always the plain pose. A skateboard or ball is never indoors.
8. **No twins.** Two people in the same scene never share a look. Siblings and household members get different looks.
9. **The player's figure** keeps one identity as they age. Their adult look comes from the same look family as their teen look when one exists. Add a `family` field to the manifest so a look can carry ages. The figure must update at 18, and the screen must show the new age.
10. **Who is there (screen 40).** Only the household, or people with a recorded reason, are in the home scene. If the household moved, the scene must show the new home only after the move is recorded, and the journal or news must say so. Match each figure to their real age, so the father isn't drawn as a young man.
11. **Art requests.** Write `docs/coordination/people-art-requests.md`, which the CTO reads and generates from. List, per look:
    - seated poses for each chair kind (office chair behind a desk, legislative desk seat, dais chair, couch, bench or pew, kitchen chair, pulled up to a table);
    - side and back views;
    - plain poses only for now (no props): standing and seated, three-quarter, side and back. Prop versions are a later request, used only when the simulation's act calls for them;
    - and **teen and child looks:** at least 12 per sex per band, everyday clothes for home and school, sports and work clothes, with different builds, skin tones and hair. Plus the adult version of each teen look for continuity.
    - Give the exact framing rules the code needs (foot line, canvas size, facing), so the CTO's output drops straight in.

## Proof and rules

- **Proof:** for each PR, before-and-after screenshots from fresh games in at least four random places (`buildBenchWorld`, the way `tests/golden-path/played-world.node-test.ts` builds it). Cover:
  - the home with the family;
  - a workplace;
  - the council or commission meeting;
  - the state chamber;
  - the U.S. House and Senate;
  - the Oval Office;
  - a conversation;
  - the intro.
  - Count figures by source in each: whole versus anything else. The "anything else" count must be zero.
- **One PR per area,** each merging as soon as it's ready: removing the old models, shadows, facing and staging fixes, the plain-pose picker, no twins, the player's identity, then seated figures when the art lands.
- Each PR gets a release note in `docs/release/changes/`.
- **Checks:** prettier, eslint and tsc on changed files, plus the changed tests and the played-world test. Never run the whole suite.
- American English.
- No hand-written player text.
- Never a real politician.
- Never hard-code a person's figure. It always comes from data and their record.
- Open each PR ready, not as a draft. The CTO's merge queue merges any ready PR with no conflicts.

## Status (PEOPLE session)

Branch `claude/people-rendering-overhaul-x6zl5r`. Proof tool: `node --import tsx scripts/people/scene-shots.ts <out> [seed ...]` builds fresh games in random places and renders the intro, home, a workplace, the council, the state chamber, the U.S. House and Senate, the Oval Office and a conversation, with a count of figures by source.

- [x] 1. Old models deleted (PR 1): 5,231 files, 238.5 MB. Nobody is drawn on a spot no approved figure fits. Nonbinary people wear any look instead of vanishing.
- [x] 6. Shadows at the feet (PR 2): measured from each figure's pixels, on the foot point, none behind a desk.
- [x] 3–5. Facing, staging, size (PR 3): people turn toward who they're with, or a room's front (`roomFronts` in `src/bench/data/whole-figures.json`); companions take the nearest spots that don't hide anyone; council chamber and U.S. House scale raised to full size; 4 home stand spots moved off the open floor; 5 looks' recorded facing corrected. Check sheets: `scripts/people/staging-sheet.ts`. Checked by eye: 29 places (homes, chambers, offices, the owner's scenes). Open: the other 149 places' spots and scale are not yet checked one by one.
- [x] 7–10. Activity picker, no twins, the player's identity, who is there (PR 4): where each painted activity makes sense is data (`activitySettings` in `src/bench/data/whole-figures.json`); each person takes the first look in their own stable order that fits and nobody else in the scene wears; ages matched within 6 years first, then 12; from 18 never a teen look; the manifest has a `family` field and the player keeps theirs. Stopgap SG-PEOPLE-one-look-per-activity until the activity variants and teen looks land. Who is at home was already the household only (`presentIds`).
- [x] 2. Seated figures, wiring (PR 5): each seat's chair kind comes from its staging group (`seatKinds` in `src/bench/data/whole-figures.json`; the Oval Office desk is an office chair, the Senate and House members' seats legislative seats, the council dais dais chairs, sofas couches); a seated row of the person's own look is placed with its hip line on the seat's `seatY`, cut at `clipBelowY`. Seats stay empty until the CTO's seated art lands; nothing else needs changing then. Wall and doorway (lean) spots now take standing people.
- [x] 11. Art requests: `docs/coordination/people-art-requests.md`.

## Needs from other sessions

- OPUS-PLAY: screen 40 (named "age 18") shows 17 on the card; please check the card's age follows the game date. Figures switch at 18 on the game date.
- OPUS-WORLD and the story director: when a household moves, the journal or news should say so; the home picture already follows the household's dwelling record.

## Questions for the owner

- Until the teen art lands, a teen boy indoors is drawn with the youngest adult look in a hoodie (24 in the art). Is that better than drawing nobody?

Left in place on purpose: `src/presentation/complete-outfit.ts`, `engine-people29-data.ts`, `private-candidate-manifests.ts`, `runtime-art.ts` and `bundled-art.ts`. Nothing from `/play` reaches them, but old scene and prose tooling still imports them (`scripts/prose-corpus`, `src/presentation/scene-registry.ts`); they go with the old-core removal.
