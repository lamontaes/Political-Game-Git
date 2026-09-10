# Development art preview — owner review shots

Taken by `node --import tsx scripts/dev-lab/art-preview-shots.mjs` against a
local `npm run dev` server. **Nothing here is approved.** These are unreleased
candidate pixels, photographed so the owner can decide whether they are worth
promoting, and taking a picture of art does not promote it.

Browser: Chromium 141.0.7390.37 at `/opt/pw-browsers/chromium`. This is NOT the
build `@playwright/test` 1.62.1 resolves (1234, which this container does not
have and cannot download). The executable is named explicitly in the script for
that reason, and these shots must not be compared against runs taken on the
project's own harness as if they were the same experiment.

Both lanes are the same life, rebuilt from the same replay descriptor, so the
only difference between an `-on` and an `-off` picture is which art library
drew the people.

| file                            | what it shows                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| `adult-preview-on-entry.png`    | the room, preview on: a dressed adult stands in the living room under the preview banner |
| `adult-preview-on-figure.png`   | that figure alone, cropped to the box the room reserved for her                          |
| `adult-preview-on-dossier.png`  | the same canonical person's dossier portrait, drawn as a likeness rather than initials   |
| `adult-preview-off-entry.png`   | the same room, preview off: nobody drawn                                                 |
| `adult-preview-off-dossier.png` | the same dossier, refusing with `development-fixture-only`                               |
| `child-preview-on-entry.png`    | a child's household, preview on: still initials, deliberately                            |
| `child-preview-on-dossier.png`  | that refusal named — `candidate-bank has no child body`                                  |
| `child-preview-off-entry.png`   | the same, preview off                                                                    |
| `child-preview-off-dossier.png` | the same, refusing with `development-fixture-only`                                       |

## What is good, and what is visibly wrong

Six candidate layers load with real pixels — a 343x960 body, a head, hair and
three garment pieces — and compose into a recognizable dressed adult who is the
same person in the room and in the dossier.

Two defects are plainly visible in `adult-preview-on-entry.png` and they are
the reason these pictures exist:

- **She is far too large for the room.** Every residence scene in the registry
  declares no floor calibration and no standard body width. Placement is
  derived from those measurements, so the compositor has nothing to size a body
  against; the preview fits the figure into the box the anchor's own declared
  footprint reserves, which makes the art visible but is not a calibrated
  placement. This is scene authoring work measured from the plate, and no code
  change may invent it.
- **The head and hair sit high against the collar.** That is layer
  registration between the banked head and body crops, and it is an art
  question for the owner rather than a code one.

Neither is fixed here. Both are shown.

## Coverage stated separately

Adult coverage: the banked bodies carry `standing-neutral` only, in two body
families. Anchors that are seats cannot be filled at all, so a room whose only
placeable spots are seats still draws nobody.

Child coverage: **none.** There are no child bodies in the bank, the character
component system carries no age class, and the compositor would therefore put
an adult body on a ten-year-old without a word. The preview refuses everybody
under 18 and says which coverage is missing rather than dressing them.
