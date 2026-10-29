---
name: people-pack
description: >
  How Our Civic Duty draws people: the people pack (one manifest read only by
  src/bench/people-pack.ts), mannequin plates that say where a person may be
  drawn in a room, and fitting a figure to a plate's mannequin. Use when adding
  people, clothes, colors or poses to the pack, adding or fixing a mannequin
  plate, swapping the pack version, or debugging why someone is or is not
  drawn in a room. Not for choosing who is in a scene (the director's cast) or
  for backdrops themselves (asset-scene-admission).
---

# The people pack and mannequin plates

Owner, Oct 29: "make it to where these can be updated very easily. so either a v4 version or more clothes or anything like that." Oct 28: "do not put people in until there are mannequins in there for every position." Oct 28: no face is ever drawn separately, scaled or moved.

## Where things are

- `src/bench/people-pack.ts` is the only file that names a pack or a pack file. `PEOPLE_PACK` picks the folder `art/people-engine/<pack>/`; everything else reads the manifest's rows through the loader. `people-pack.test.ts` fails if any other code names `people-engine/v<n>` or opens the folder.
- `src/bench/mannequin-plates.ts` reads every `art/people-rooms/mannequin-plates/<scene>.mannequins.json`; each plate's `backdrop` field names the backdrop file it was painted on.
- `src/bench/whole-figures.ts` turns a person into a figure: which of the pack's people they are, what they wear here, which figure fits a spot, and the fit itself. `scene.ts stagePeople(core, backdropFile, cast, speaker?)` places the cast on the plate's spots.

## Adding to the pack (no code change)

- **More clothes, poses or people:** add rows to `manifest.json` (and their files) in the pack's own shape (the pack README). A new person row needs `id`, `sex`, `build`, `palettes`, `tones`, `skin`; a figure row needs `pose`, `seat`, `facing`, `dress`, `outfit`, `head`, `feet`, `size`, and `parts` (kit) or `file` (look). The creator and staging pick them up; `people-pack.test.ts` "offers a new manifest row" proves it.
- **More colors:** add names to a person's `palettes`. A part whose palette is empty (the men's hair) is drawn as painted.
- **Desk figures** (`handsRestOnDesk`): after adding them, run `node --import tsx scripts/people/measure-hands.ts` to write each one's `hands` row, measured from its own pixels; `--check` fails when the manifest is stale. Without `hands`, a desk figure is scaled by head width and its lap shows above the desk.
- **A new pack version:** build `art/people-engine/v4/` with the same manifest shape, change `PEOPLE_PACK`, delete the old folder in the same PR (replace, never layer). The desktop build copies whatever folder the loader opens.

## Mannequin plates

- A person is drawn only on a plate's spot, in a figure whose `pose` matches the spot's, then the nearest `facing`, then the same `seat`. A picture with no plate draws nobody (unplaced reason `no-plate`). Nobody is ever mirrored.
- Fit: head centered on the spot's `head.x`, head top on `head.top`, scaled head top to `feet`. At a desk spot (`hands` and `deskEdge`, no `feet`) it is scaled head top to the figure's `hands` row and cut off at the spot's hands.
- A spot's `role` keeps the seat for an office's holder (`data/whole-figures.json` `seatRoles`); while the holder is in the cast nobody else takes it.
- `front` is a mask of furniture standing in front of the person, drawn back over them. Keep it only when it is furniture alone. A mask cut to a mannequin's own outline slices every other figure (Oct 29: seven were dropped for this, CTO ruling under "figures framed whole"). Check every new `front` in a screenshot.
- A new plate is a new `<scene>.mannequins.json` with `backdrop` filled in, plus its backdrop row in `art/backdrops/manifest.json`. Then screenshot the room filled from a generated world.

## Checking it by eye

Stage a world's people with `stagePeople` on each plate's backdrop file and draw them with the game's own `ui/room.mjs` over the backdrop, at 1440 by 900, naming the place and seed. Look for figures floating off seats, heads off the mannequin, cut limbs and someone in the wrong outfit. The PR for `people-pack-v3` (#6778) has the proof sheet pattern.
