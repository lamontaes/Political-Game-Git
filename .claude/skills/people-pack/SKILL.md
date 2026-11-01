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
- `src/bench/mannequin-plates.ts` reads every `art/people-rooms/mannequin-plates/<scene>.mannequins.json`; each plate's `backdrop` field names the backdrop file it was painted on, and its optional `backdrops` list names the other lights of the same painting (night, morning, midday, rain), which the plate serves too. A condition picture (lived-in, rundown) is never one of them: its clutter sits on the seats, so it gets its own plate.
- `src/bench/whole-figures.ts` turns a person into a figure: which of the pack's people they are, what they wear here, which figure fits a spot, and the fit itself. `scene.ts stagePeople(core, backdropFile, cast, speaker?)` places the cast on the plate's spots.
- A figure is drawn on the server the first time it is asked for (an everyday outfit about 100 to 300 ms, one at a time) and kept. `drawAhead(link)` in `people-pack.ts` draws a figure link in the background between requests; `faceOf` and `stagePeople` call it for every link they hand out, and a new life draws its first scene and its card's faces while loading (`drawAheadNow` in `/api/newlife`). A screen that shows people takes its links from `faceOf` or `stagePeople`, never builds its own, so they are drawn ahead too. `faces-at-open.browser.mjs` fails if a face is missing 300 ms after People or Politics opens (#6918; `FACES_SEED` replays a world).

## Adding to the pack (no code change)

- **More clothes, poses or people:** add rows to `manifest.json` (and their files) in the pack's own shape (the pack README). A new person row needs `id`, `sex`, `build`, `palettes`, `tones`, `skin`; a figure row needs `pose`, `seat`, `facing`, `dress`, `outfit`, `head`, `feet`, `size`, and `parts` (kit) or `file` (look). The creator and staging pick them up; `people-pack.test.ts` "offers a new manifest row" proves it.
- **More colors:** add names to a person's `palettes`. A part whose palette is empty (the men's hair) is drawn as painted.
- **Desk figures** (`handsRestOnDesk`): after adding them, run `node --import tsx scripts/people/measure-hands.ts` to write each one's `hands` row, measured from its own pixels; `--check` fails when the manifest is stale. Without `hands`, a desk figure is scaled by head width and its lap shows above the desk.
- **A new pack version:** build `art/people-engine/v<n>/` with the same manifest shape, change `PEOPLE_PACK`, delete the old folder in the same PR (replace, never layer), and add the old folder to the "leaves no ... file" list in `people-pack.test.ts`. The desktop build copies whatever folder the loader opens. Point the skill links (this file, `asset-scene-admission`, `scripts/skill-ops/skill-ops.test.ts`) at the new README and regenerate `art/qa/inventory_report.json` (`npm run inventory:art`). A desk figure the art gives a `hands` row keeps it; the measure script fills in only the rest.

## Looks, props and portraits

- **A look** is everyday clothes (the kit) or an outfit in one hairstyle (`lookKey` in the loader: `outfit`, plus `hair` where the row has one), named in the creator by the manifest's `outfitLabel`. The same person may have several looks of one outfit (pack v4: man-medium in two navy suits).
- **Everyday and work clothes are chosen apart** (owner, Oct 29: "The creator mixes formal clothes ... with regular clothes. There needs to be two separate ones ... the president doesn't render in normal clothes"). Everyday clothes are the pack's `casual` dress (`everydayDress` in `data/whole-figures.json`), with their colors; work clothes are every other dress. The creator's recipe holds `outfit` (everyday) and `work`, and shows two portraits side by side. An official at a government place and someone at their own workplace wear work clothes only (`dressOrder`); elsewhere a person wears everyday clothes, falling back to work clothes where no everyday figure is painted in the spot's pose.
- **Portraits stand** (owner, Oct 29: "people shouldn't be sitting in their image creator. They should all be standing"). The creator, person cards, faces and the title bust take only a standing figure holding nothing (`portraitPose`). A look painted only seated is not offered in the creator until someone draws it standing. Check the proof sheet for anyone seated.
- **Props** (`prop`: phone, paper, pen-paper) are drawn only at the places `data/whole-figures.json` `propPlaces` lists for them, never at home and never in a portrait. A new place that should allow a phone is one line there.
- **`needsDesk`** (owner, Oct 29: "she has a pen in her hand and she's writing on her green pants"): a figure drawn writing or resting its hands on a desk the drawing leaves out is drawn only at a spot with a `deskEdge`, cut at the hands, and never in a portrait. When the art session re-cuts or re-exports the pack, rerun `scripts/people/measure-hands.ts`: a fresh manifest drops the measured `hands` rows.
- **Desk spots** take a figure `drawnBehindTable` (forearms on the desk as drawn) whenever the person has one; older desk figures sit with hands in the lap.
- **Seeds:** a person's pack person and look are set from the world's seed with their appearance seed, so the same person is the same all through one world and differs between worlds. An official's appearance seed comes from their office's term id, the same in every world, so without the world's seed every world drew the same President.

## Mannequin plates

- A person is drawn only on a plate's spot, in a figure whose `pose` matches the spot's, then the nearest `facing`, then the same `seat`. A picture with no plate draws nobody (unplaced reason `no-plate`). Nobody is ever mirrored.
- Fit: head centered on the spot's `head.x`, head top on `head.top`, scaled head top to `feet`. At a desk spot (`hands` and `deskEdge`, no `feet`) it is scaled head top to the figure's `hands` row and cut off at the spot's hands.
- A spot's `role` keeps the seat for an office's holder (`data/whole-figures.json` `seatRoles`); while the holder is in the cast nobody else takes it.
- `front` is a mask of furniture standing in front of the person, drawn back over them. Keep it only when it is furniture alone. A mask cut to a mannequin's own outline slices every other figure (Oct 29: seven were dropped for this, CTO ruling under "figures framed whole"). Check every new `front` in a screenshot.
- A new plate is a new `<scene>.mannequins.json` with `backdrop` filled in, plus its backdrop row in `art/backdrops/manifest.json`. The game's backdrops are `<place>__<variant>.jpg`: an art PNG is converted, recorded as `sourceFile` with its hash, and the plate's `backdrop` field points at the JPG. Front mask files are `<scene>.front-<name>.png`. Then screenshot the room filled from a generated world.
- **Depth:** people are drawn farthest to nearest by `depthOf` (feet row, or hands row at a desk), so a desk spot draws before anyone standing in front of it.
- **Which spot a holder takes: the occasion decides** (owner, Oct 29: "the president shouldn't be hard coded to be sitting. That's just for certain occasions"). `stagePeople`'s fifth argument is the scene's occasion from the director (agreed with Words: address, signing, meeting, visit, briefing, debate, ceremony). `data/whole-figures.json` `occasions` maps each to a posture (seated, standing, podium) with `default: seated`. An office holder takes the spot kept for their office in that posture, else any free spot in that posture; a podium occasion with no lectern stands. Words owns the cast and the occasion; staging never invents one. A person who lacks a pose cannot take that spot (stopgap SG-PLAY-people-pack-v4-pose-gaps lists the gaps).

## Checking it by eye

Stage a world's people with `stagePeople` on each plate's backdrop file and draw them with the game's own `ui/room.mjs` over the backdrop, at 1440 by 900, naming the place and seed. Look for figures floating off seats, heads off the mannequin, cut limbs and someone in the wrong outfit. The PRs for `people-pack-v3` (#6778) and `people-pack-v4` have the proof sheet pattern; a world where the President is a person with every Oval pose (desk, standing) makes the (a) to (c) shots possible.

Screenshots go in the PR body as paths under `docs/play-first/shots/<item>/`, never as image links: the platform wraps every URL a session posts in backticks, so images do not render (`play-first` skill, Oct 29; #6856 and #6918 hit it).
