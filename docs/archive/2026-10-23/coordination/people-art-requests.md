# PEOPLE: art requests for the CTO

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

> **Owner ruling, Oct 13, 2026: plain poses first.** "Regular poses, not with a laptop or a book or something. You don't decide that. The simulation decides what they're doing." Paint every figure in a plain pose with empty hands: standing or seated, three-quarter, side and back. No props. Prop versions come later (section 7), and the game uses one only when the simulation's act calls for it. The CTO edited this file to match.

Written by the PEOPLE session on Oct 13, 2026. The CTO reads this file and makes the art in Firefly. Each request says what to paint, how many, and the exact framing so the output drops straight into `art/people-whole/` and the game picks it up from `art/people-whole/manifest.json` with no code change.

Only approved whole figures are drawn. Where no figure fits a spot (every seat today), nobody is drawn there. So the seated art below is what fills the chambers, the Oval Office, the dais and the couches.

## Framing rules (every figure)

- **Canvas:** PNG with a transparent background, **1000 px tall**, width as tight as the figure allows (today 218 to 571 px). One person per file, nothing else in the picture: no floor, no chair, no shadow. The game draws the contact shadow itself.
- **Feet on the foot line:** the soles of a standing figure touch row **`footY` = 990 to 995**. Record the exact row in the manifest. Nothing below the soles but a few transparent rows.
- **Height:** the top of the head sits at row 30 to 60 for an adult; a teen, child or older person keeps the same foot line and is simply shorter on the canvas. The game sizes people by age band from the foot line, so the painted height must match the age.
- **Facing:** paint every figure turned toward the picture's **right** (`"facing": "right"`). The game mirrors it to face left. Record the true facing if one is painted the other way.
- **Angle** (`"angle"` and `"view"` in the manifest):
  - `three-quarter`: body turned about 45° to the right, face visible. For people talking to the player or addressing a room.
  - `profile`: body turned 90° to the right, one eye visible. For people talking to someone beside them, or facing the front of a room from the side.
  - `back`: seen from behind, slightly turned. For audiences, legislators facing the rostrum and anyone facing away from the camera.
- **Lighting:** soft light from the upper left, the same flat color style as looks 001 to 068. No cast shadow on the ground.
- **Builds:** each look in three builds (`slim`, `average`, `heavy`), same face, hair and clothes.

## Manifest fields (one row per file)

Every row keeps today's fields (`file`, `look`, `build`, `sex`, `ageBand`, `age`, `skin`, `hair`, `outfit`, `activity`, `facing`, `angle`, `view`, `width`, `height`, `footY`) and adds:

- `family`: the person-family id a look belongs to, shared by the child, teen, adult and older versions of the same person (`"family": "fam-014"`). The player keeps one family for life.
- `pose`: `stand` (default when absent) or `sit`.
- For `sit` only:
  - `seat`: the chair kind, one of `office-chair`, `legislative-seat`, `dais-chair`, `couch`, `bench`, `kitchen-chair`, `table-chair`.
  - `seatY`: the row where the seat cushion meets the buttocks (the hip line). The game puts this row on the chair's `seatY` in the staging and centers the figure on the seat.
  - **Scale:** paint a seated figure at the same scale as the same look's standing figure (the same number of pixels per meter), on a canvas 1000 px tall. The game sizes it from the standing figure's foot line.
  - Paint the chair out: only the person, sitting on nothing. The painted room supplies the chair, and a desk or dais front hides the legs where the staging says so.
  - `footY`: the row the feet rest on, even if a desk will hide them.
- `activity`: `standing`, `talking` or `listening` for plain poses (hands empty; talking is an open-hand gesture, listening is attentive). Seated plain poses use `sitting`. Prop activities are added later with the section 7 art.

## 1. Seated poses (needed first)

Every seat in the game is empty until these land: 1,188 seat spots in 110 places. The owner named the Oval Office, the U.S. Senate and House, the state chambers and the council dais.

For **every adult and older look** (looks 001 to 064 that are adult or older, plus the official looks), paint each seat kind below, in the `three-quarter` angle, and the `back` angle where marked:

| Seat kind          | What it is                                                                    | Where                                                                                    | Angles                  | Notes                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `office-chair`     | Upright in a high-backed desk chair, forearms on the desk line, hands visible | Oval Office (the Resolute desk), governor's and mayor's offices, any office desk         | three-quarter, profile  | The desk hides everything below the chest (the staging's `clipBelowY`). Paint the whole body anyway, legs bent at the knee. |
| `legislative-seat` | Seated at a legislative desk, upright, attentive                              | U.S. House and Senate floors, both state chambers                                        | **back**, three-quarter | Most members face the rostrum, away from the camera: `back` first.                                                          |
| `dais-chair`       | Seated at a raised dais, hands folded on the dais                             | Council chamber, county commission, school board, township board, committee hearing room | three-quarter, profile  | The dais front hides the legs.                                                                                              |
| `couch`            | Relaxed on a sofa, one arm resting                                            | Every home, the Oval Office's two couches                                                | three-quarter, profile  | Lower seat: knees higher than hips.                                                                                         |
| `bench`            | On a bench or pew, upright                                                    | Church supper hall, courtrooms, park, waiting rooms, school gym                          | back, three-quarter     | Audience: `back` first.                                                                                                     |
| `kitchen-chair`    | On a kitchen or dining chair, turned to the table                             | Home kitchens, diner, tavern                                                             | three-quarter, profile  |                                                                                                                             |
| `table-chair`      | Pulled up to a table, forearms on it                                          | Convention hall, hotel ballroom, phone bank, cafeterias                                  | three-quarter, back     |                                                                                                                             |

Minimum to fill the owner's scenes: the official looks (business suits, pantsuits, blazers) in `office-chair`, `legislative-seat` and `dais-chair`; every household look in `couch` and `kitchen-chair`.

## 2. Side and back views (standing)

Today only looks 001 and 002 have `profile` and `back` views. Paint **`profile` and `back` standing views for every look**, so people in a scene can face each other and face the front of a room instead of the camera.

## 3. Plain pose variants

Each look today is painted doing one thing, so a person is stuck with it (a skateboard indoors, a laptop at the dinner table). For **every look**, paint these plain standing variants, hands empty, no props:

- `standing` (hands at the sides, relaxed),
- `talking` (an open-hand gesture),
- `listening` (attentive, arms relaxed or folded).

Each in `three-quarter`, `profile` and `back`.

## 4. Teen and child looks

Today there are only four teen looks (a boy with a skateboard, a boy with a basketball, a girl walking with a backpack, a girl in a varsity jacket) and four child looks. A family with two teens gets twins.

Paint **at least 12 looks per sex for teens (13 to 17) and 12 per sex for children (5 to 12)**:

- everyday home clothes (t-shirts, sweaters, flannel, hoodies without props) and school clothes;
- some in sports clothes and some in work clothes (a fast-food uniform, a grocery apron for older teens);
- the whole range of builds, skin tones and hair: straight, curly, coily, braids, locs, short, long, covered;
- **no props.** No skateboard, ball, backpack, phone or book. Those come later as section 7 prop versions;
- each in `standing`, `talking` and `listening`, plus seated (`couch`, `kitchen-chair`, `table-chair`), in three-quarter, `profile` and `back`.

## 5. Adult versions of each teen look (continuity)

The player is drawn as a teen until 18 and then as an adult. The adult must be the same person: **for each teen look, paint the same person at about 22 and 35** (same skin, face, hair color and texture, build), in casual clothes and in one office or official outfit. Give the teen and adult rows the same `family` id.

The same holds for children: each child look gets a teen version with the same `family`.

## 6. Older looks matched to adults

A father drawn as a young man next to a gray-haired mother looks wrong. Paint an **older version (60 to 75)** of each adult household look, with the same `family` id, so parents and grandparents can be matched to their real age.

## 7. Prop versions (later, after the plain set)

Only after sections 1 to 6 are painted: prop versions of each look (`phone`, `reading`, `coffee`, `carrying`, `writing`; outdoor-only `skateboard` and `basketball`; work tasks like `serving` and `cooking`). The game uses one only when the person's current act in the simulation is that act; otherwise it draws the plain pose.

## How the game uses it

- `src/bench/whole-figures.ts` reads every row whose file exists. A new row with `pose: "sit"` and `seat` goes to the matching seats (each seat's chair kind is read from its staging group; see `seatKinds` in `src/bench/data/whole-figures.json`); a row with `angle: "back"` or `"profile"` goes to spots facing away or sideways; plain poses are the default; a prop version (section 7, later) is used only when the person's current act in the simulation is that act; `family` keeps the player's look across ages.
- Nothing else needs changing: commit the PNGs and the manifest rows.
