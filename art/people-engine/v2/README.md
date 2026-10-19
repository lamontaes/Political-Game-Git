# People engine v2: consistent figure set

These are the 76 sheets a Codex session painted on October 14, 2026, for draft
PR 4283 ("Replace rejected room cut-outs with a consistent layered figure
set"). The session ran out of usage before it could cut or push them, so they
were saved from the chat and added here. Nothing in the game reads this folder
yet.

## What is here

- `sheets/`: the original sheets as painted, with transparent backgrounds.
- `figures/`: 389 single figures cut from the body sheets.
- `hair/`: 108 hair pieces (women's and men's, front, three-quarter and back).
- `hands/`: 24 hand pieces holding papers or a cup.
- `index.json`: one record per piece. Body records give pose (`stand`, `sit`,
  `lectern`), angle (`front`, `three-quarter`, `back`), facing, outfit, prop,
  sex, build, and the pixel measures the game's placement uses (`width`,
  `height`, `footY`, and `seatY` for seated figures).
- `room-tests/`: the council chamber, state house and Senate drawn with these
  figures by the game's own placement rules, at midday and night, half full and
  full.
- `tools/`: the cutting, labeling and room-test scripts.

## How the body sheets are laid out

Each body sheet shows one pose in one outfit: women on the top row and men on
the bottom, each in a slim, medium and heavy build. Outfits are a plain tee and
shorts base, a long-sleeve base, a polo with slacks, a button shirt with
slacks, a vest, and a blazer. Some base sheets hold a cup or a tablet; those are
labeled with their prop and left out of the room tests.

## Known problems

- On `clarify-76b` and `clarify-x3` (seated, back view) the women's row faces
  forward instead of away. Those six figures carry a `flag`; seated women seen
  from behind come from `clarify-06`, `clarify-14`, `clarify-29` and
  `clarify-38`.
- The heads are bald. The hair pieces still have to be fitted to each head.
- The room tests show placement problems in the room data, not the art: the
  council chamber's nearest audience rows are drawn about a third too large for
  the painted chairs, the state house has no front in `roomFronts` (its members
  face the camera), and the Senate's seat lines sit on the desk fronts (members
  stand on the desktops).
