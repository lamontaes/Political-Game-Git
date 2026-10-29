# People pack v3

The game's people, as finished images. Each of the six people (woman and man; slim, medium, heavy) is one painted person: face, head and body drawn together. No face is ever laid on, scaled or moved (owner, Oct 28).

## Files
- `manifest.json`: everything the game reads.
  - `people[]`: id, sex, build, skin and hair color, and `palettes` (the colors each part may take; from the person's master color sheet), `tones` (each part's middle lightness, `Lmed`).
  - `figures[]`: one row per drawn figure.
    - `kind`: `kit` (everyday clothes as stacked parts, recolorable) or `look` (a whole outfit drawn in one piece: suits, pantsuits, blazers; never recolored).
    - `pose`: clap, fist, film, fold, hip, pockets, speak, write, talk, listen, watch, lean, walk, wave, phone, lectern, address.
    - `seat`: none, chair, couch, desk-chair, stool. `facing`: degrees, 0 = toward the viewer, minus = turned toward screen-left, 180 = back to the viewer, ±135 = back three-quarter.
    - `dress`: casual, business, formal. `outfit`: everyday, suitnavy, suitcharcoal, blazer, pantsuitnavy, pantsuitblack, blazercamel.
    - `head` {top, x, width}, `feet` {x, y}, `stature`, `size`: pixels of the figure's own image. Scale a figure so its head width (or head top to feet) matches the spot's.
    - `parts` (kit): body, shoes, trousers, top, hair, phone, each with its `_tone.png`. `file` (look): one PNG.
  - `stack`: draw order for kit parts: body, shoes, trousers, top, hair, phone. Hands are part of the body; trouser hems fall over the shoes; sleeves cover the wrists.
- `people/<person>/kit/<r|s><nn>/`: parts. `people/<person>/look/<outfit>/<nn>.png`: whole looks.
- `tools/`: the scripts that made the pack (`build_pack.py`, `export_kit.py`, `kit_check.py`, `lift.py`, `mannequins.py`) and the reference recolor (`engine.py`, `colors.py`).

## Recolor (kit only)
A part's `_tone.png` holds its perceived lightness (CIE L* × 2.55) in the gray channel and its shape in alpha. To paint it a color C: convert C to Lab; for each pixel, L = C.L + (tone/2.55 − Lmed) × min(1, (C.L + 10)/(Lmed + 10)); rim pixels (alpha < 250) never get lighter than C.L; the darkest drawn lines keep their own darkness and no color (`colors.recolor_lab`). A part not recolored is drawn exactly as is.

## People in rooms (owner, Oct 28: "do not put people in until there are mannequins in there for every position")
A person is drawn only at a spot that has a mannequin painted in that figure's pose. A mannequin plate is the room with green mannequins (data only, never drawn). The person is fitted to its own mannequin: head top, head center and feet (seated behind a desk: head top and resting hands); furniture painted over the mannequin stays in front. `tools/mannequins.py` makes plates (pose silhouettes → Firefly → mannequins) and fits people.

## Adding to it
- More clothes for a pose: draw the look on the pose sheet (Firefly, the same person), add `people/<person>/look/<outfit>/` and run `build_pack.py`; new rows appear in the manifest.
- More colors: add to the person's palettes (`master.py`).
- More people or a new set: build `v4` into its own folder with the same manifest shape and switch the game's pack setting.

## Oct 29 additions
- **Heavy man at the desk:** `man-heavy/look/address/a00`–`a05`, redrawn without the stray desk line (navy suit, matching trousers): five address poses like everyone else's, plus `a05` writing at the desk (`pose: write`, facing 0, `seat: desk-chair`).
- **Props (owner: no accessories unless the scene calls for them; never books or clipboards at home):** figures that hold something carry `prop`: `phone` (on the phone, filming at a rally), `paper` (reading the speech at the address desk), `pen-paper` (writing at a desk). Use a `prop` figure only where that prop belongs: phones at rallies and on the street, papers at hearings and the address desk, pen and paper at desks. Figures without `prop` hold nothing.
- **Mannequin plates:** the front cutouts were removed (they were room seen between legs or arms, not furniture); see art/people-rooms/mannequin-plates/README.md.
