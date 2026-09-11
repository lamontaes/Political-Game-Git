# One generated adult, all the way through

`node --import tsx scripts/dev-lab/person-journey.mjs` against a local
`npm run dev`, with the development art preview on.

**Nothing here is approved.** These are unreleased candidate pixels,
photographed so the owner can judge them. Taking a picture of art does not
promote it.

Browser: Chromium 141.0.7390.37 at `/opt/pw-browsers/chromium`, named
explicitly because `@playwright/test` resolves a build this container does not
have and cannot download. These shots are **not** comparable with runs on the
project's own harness.

## What the run establishes

Two lanes, each following whoever the shell itself placed in the room — no
person and no seed was chosen to make the run succeed.

|                           | child world, adult relative                | adult start                           |
| ------------------------- | ------------------------------------------ | ------------------------------------- |
| person                    | Clara Poole                                | Catherine Fields                      |
| room                      | drawn, 6 components                        | drawn, 6 components                   |
| dossier                   | `likeness=modular`, 6 layers               | `likeness=modular`, 6 layers          |
| conversation              | refused, with its reason                   | opened, 7 surfaces                    |
| clothing selection        | chose `pg-top-001` from the review catalog | chose `pg-top-001`                    |
| save                      | through the navigation                     | through the navigation                |
| reload                    | opened the save from the title screen      | opened the save from the title screen |
| **identity after reload** | **preserved**                              | **preserved**                         |

The identity claim is made on loaded component asset ids, not on screenshots or
layer counts, which would agree by coincidence. Choosing a top changed exactly
one component and left body, bottom, footwear, head and hair untouched; the
change then survived save, leaving the life, and reopening it.

## The conversation refusal, and the prose it corrected

The child lane's relative is standing in the room and drawn on screen, and the
Talk action is disabled. `scripts/dev-lab/trace-conversation-gate.test.ts` asked
the World directly rather than reading the DOM: `openConversationWith` returns
unavailable for her, and available for two other people. The disabled control is
correct.

The sentence beside it was not. It said she "is not somewhere you can talk to
them right now" — a claim about WHERE SOMEBODY IS, made about a household
member three feet away. What the code actually checks is narrower: whether any
conversation this life can currently have lists this person as an addressee.
Being in the room and having something established to say are different facts,
and only the second was measured. The refusal now says so.

`conversation-gate.txt` is that trace.

## Still visibly wrong

The figure is too large for the room. Every residence scene declares no floor
calibration and no standard body width, so the compositor has nothing to size a
body against; the preview fits the figure to the box the anchor's own declared
footprint reserves, which makes the art visible and is **not** a calibrated
placement. `data-art-diagnostics` carries
`scene-declares-no-floor-calibration body-declares-no-contacts` on every drawn
person, including the ones that look fine.

## Child and adult art boundary

Only one person is placed in each of these rooms, and in both lanes that person
is an adult — the preview's age guard would have refused anybody younger, which
is what it did to a 13-year-old sibling in `../art-preview1/`. The player
themselves is the viewpoint and is never placed, so no adult body is drawn on
the ten-year-old in the child lane.
