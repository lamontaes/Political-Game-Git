# Bust kit additions, Nov 17, 2026: head shapes, shades, hairstyles

Owner, Nov 17: "I would like to see you do some more hairstyles, maybe a couple, 2 or 3 more shades, and most importantly, a few different head shapes now. So try to match new head shapes with the current stuff, and then you can use those to build."

In the game since Nov 18: the pieces and the flagged pairs are in `art/busts/v1/manifest.json`, which `src/bench/bust.ts` reads. Everything sits on `art/busts/v1`'s 1254 x 1254 canvas, stacked at (0, 0) in v1's order (head, top or shirt, tie, jacket, face, hair). Nothing is moved, scaled or tinted. Every head and hair is its own Codex painting; skin is painted, never tinted.

## What's new

|                                               | Men                                             | Women                                                                                                         |
| --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Head shapes (besides v1's)                    | round, long, square, narrow                     | round, long, square, heart                                                                                    |
| New skin shades (on every shape, v1's too)    | fair, olive, brown                              | fair, olive, brown                                                                                            |
| New heads (shape x shade x adult and older)   | 54                                              | 54                                                                                                            |
| New hairstyles, 4 colors each, standard shape | buzz, balding, twists, collar length (16 files) | bangs, braids, ponytail, locs (16 files)                                                                      |
| Hair redrawn for a shape                      | collar length on narrow (4)                     | bob and curls on heart and square; shoulder and waves on heart and long; bangs, braids and locs on heart (44) |
| Beards redrawn for a shape                    | 4 shapes x 3 colors (12)                        |                                                                                                               |
| Piece files                                   | 86                                              | 114                                                                                                           |

- **How a shape matches the current kit:** a new shape keeps v1's bald scalp from temple to temple, the ears, the eyes, nose and mouth, and the neck where every top meets it: no skin shows beside any collar on any head (checked on every head x every top, shirt, tie and jacket). Women's square necks are up to 12 px wider just under the jaw corners, above the collars. Only the cheeks, jaw and chin change. So every v1 top, shirt, tie, jacket and mustache fits every shape unchanged, and every men's v1 hairstyle fits every shape unchanged (they sit above the ears). Hair that falls beside the face and beards were checked on each shape and redrawn where they did not fit.
- **The shade ladder**, lightest first: fair, light, olive, medium, brown, dark. Five heads sit within 3 L* of their neighbor shade (olive is also yellower, so they still differ in hue): men square adult olive/medium 1.4, men narrow older light/olive 1.2, men long older olive/medium 2.8, women long adult light/olive 0.9, women square adult light/olive 2.6; a repaint of one head each would space them. v1's light, medium and dark stay as they were; every new head is painted to a swatch measured from v1's heads (median skin within about 5 of the target in Lab). Fair is paler and pinker than v1's light; olive sits between light and medium; brown sits in the wide gap between medium and dark.
- **Faces:** every head is a different ordinary adult (age, eyes, brows, nose, lips by shape and shade); older heads have age lines and graying brows.

## Folders

- `pieces/men/front/`, `pieces/women/front/`: the new piece files (86 men, 114 women). A standard-shape piece keeps v1's naming (`head-fair-adult.png`, `hair-buzz-black.png`); a shape's own piece puts the shape after the style (`head-round-olive-adult.png`, `hair-bob-heart-gray.png`, `face-beard-square-black.png`).
- `manifest-additions.json`: the shapes, shades, a head table per shape, `hairByShape` and `faceByShape` (which painted version of a style each shape wears; "standard" means the v1 or standard piece), every file with where it lives (`pieces` or `v1`), and the code change it needs (bust.ts reads one head set per sex today).
- `sheets/`: proof sheets (below). `proof-desk-*.png` (+ `.json`): two new people behind the Oval Office desk.
- `scripts/`: the tools (prompts, jobs, cuts, checks, sheets); `work/`: every Codex painting, hair-only picture, screen and check result.

## Sheets to look at first

1. `sheets/women-overview-adult.png`, `sheets/men-overview-adult.png`: every shape (columns) at every shade (rows), half size. Then the `-older` ones.
2. `sheets/look/` (every new hair and beard file in every color on a light head of its shape), then `sheets/<sex>-<shape>-<adult|older>.jpg`: full size (1:1 crops of the canvas). One row per shade; the first column is the standard (v1) head of that shade in a suit for comparison, then three hairstyles x two outfits on the new shape.
3. `proof-desk-man-square.png` (square jaw, olive, beard, buzz cut, navy suit) and `proof-desk-woman-heart.png` (heart face, olive, braids, charcoal blazer), placed with `place_bust.py` in the Oval Office exactly as `proof-oval-arms.png` was (desk 689,500, the same scan, arms).

## Two fixes to place_bust.py (people-desk)

- `head_measure` took a square jaw's straight sides for the chin (men's square brown read row 544 for 590) and sized the whole person 10% too big. The chin's window must now also be near the neck's width. Every v1 head measures exactly as before, and the Nov 16 Oval command reruns to a picture identical to `proof-oval-arms.png`, pixel for pixel. On the 108 final new heads a chin is found on every one, and the rows agree within each shape (men: standard 570-575, round 592-598, long 579-586, square 589-595, narrow 559-565; women: standard 627-636, round 641-646, long 640-652, square 646-651, heart 610-618).
- The arms layer can round to one pixel more than the bust when scaled; it is now pasted by its own size (it crashed on the square man).

## How it was made (so the next round can repeat it)

- **Shapes:** each new shape is a Codex edit of the set's dark bald master (head C, the head every v1 hair was painted on), told to change only the cheeks, jaw and chin. Three candidates per shape, screened for (0, 0), scalp kept within 1-3 px, neck identical at every collar's edge, and a fit table against every v1 piece; the picks are `work/masters/<sex>-<shape>.png`.
- **Heads:** each a Codex edit of its shape's master ("a different person, keep every outline"), with a two-tone skin swatch as Image 2 (`work/swatches/`); heads painted from words alone came out 10 to 30 levels too dark for olive, medium, brown and dark. Cut in code (flat-backdrop flood plus edge unmix, v1's head region); this matches v1's Adobe/Codex-cut heads within 1-2 px. Picked by `scripts/choose_heads.py`: offset (0, 0), outline within 3 px of the master (4 px allowed for a few older faces, whose age lines loosen the jaw; the hair checks then judge them), skin nearest the swatch.
- **Hair and beards:** painted on the shape's master (a refit passes v1's piece alone on flat gray as the style guide), other colors repainted from the darkbrown painting, alpha from Codex's hair-only picture, cut by round 3's rules (`scripts/cut17.py`). Rules added to round 3's cut, each after a defect seen at full size: (1) light halo pixels over the backdrop are dropped, and on beards light pixels anywhere on the outer edge (a beard's edge lay on the master's jaw line and showed as a 1 px light line on a slightly narrower jaw); (2) the master's own scalp left unchanged inside the hair becomes see-through only where it is a tall thin part strip or an earlobe by the ear and opens onto bare skin, so a braid part shows the wearer's own scalp (a soft blond hairline band stays hair, as in v1); (3) the master's ear skin left at the hair's edge over the ear is dropped (blocky brown patches on the black collar hair); (4) the master's brick-red tee is dropped below the chin only where a pixel is strongly red (Lab a* above 25 and redder than yellow), so warm blond shadows stay hair and slightly shifted tee pixels still go; (5) a hair-only picture more than 1 px off its painting is refused (one came back 65 x 103 px off and had cut the blond square bob in half).
- **Checks:** `scripts/check17.py` (every head x every clothes stack; every hair and beard on every head of every shape it is mapped to), `integrity17.py` (each color has its darkbrown's shape, IoU >= 0.9, and no transparent pockets inside a piece), `skin_in_hair17.py`, `fringe.py` (light rims on black), `summarize17.py` (the table below).

## Checks (every combination, at full size)

| Set / shape    | Heads | Head x clothes stacks | Hair and beard on heads | Outline worst (px) | Holes | Skin beside a collar | Fail at this round's line | Fail at v1's line |
| -------------- | ----- | --------------------- | ----------------------- | ------------------ | ----- | -------------------- | ------------------------- | ----------------- |
| men/long       | 12    | 204                   | 552                     | 4                  | 0     | 0                    | 0                         | 104               |
| men/narrow     | 12    | 204                   | 552                     | 3                  | 0     | 0                    | 0                         | 221               |
| men/round      | 12    | 204                   | 552                     | 4                  | 0     | 0                    | 2                         | 116               |
| men/square     | 12    | 204                   | 552                     | 4                  | 0     | 0                    | 12                        | 188               |
| men/standard   | 12    | 204                   | 552                     | 4                  | 0     | 0                    | 1                         | 132               |
| women/heart    | 12    | 156                   | 480                     | 4                  | 0     | 0                    | 4                         | 70                |
| women/long     | 12    | 156                   | 480                     | 4                  | 0     | 0                    | 0                         | 194               |
| women/round    | 12    | 156                   | 480                     | 4                  | 0     | 0                    | 0                         | 104               |
| women/square   | 12    | 156                   | 480                     | 4                  | 0     | 0                    | 0                         | 111               |
| women/standard | 12    | 156                   | 480                     | 3                  | 0     | 0                    | 0                         | 37                |

Every piece: 0 changed pixels against its painting and offset (0, 0) (a few read 1 px on the full-size phase measure); every color of a style has its darkbrown's shape (IoU 0.93 or more).

### Combinations that still fail a check

- men/round: face-beard-round-black on head-round-dark-older: pokeOut 82
- men/round: face-beard-round-darkbrown on head-round-dark-older: pokeOut 81
- men/square: face-beard-square-black on head-square-brown-adult: seeThrough 212
- men/square: face-beard-square-black on head-square-brown-older: seeThrough 152
- men/square: face-beard-square-black on head-square-dark-older: pokeOut 167
- men/square: face-beard-square-black on head-square-medium-older: pokeOut 103
- men/square: face-beard-square-darkbrown on head-square-brown-adult: seeThrough 208
- men/square: face-beard-square-darkbrown on head-square-brown-older: seeThrough 150
- men/square: face-beard-square-darkbrown on head-square-dark-older: pokeOut 156
- men/square: face-beard-square-darkbrown on head-square-medium-older: pokeOut 92
- men/square: face-beard-square-gray on head-square-brown-adult: seeThrough 198
- men/square: face-beard-square-gray on head-square-brown-older: seeThrough 146
- men/square: face-beard-square-gray on head-square-dark-older: pokeOut 159
- men/square: face-beard-square-gray on head-square-medium-older: pokeOut 100
- men/standard: hair-buzz-gray on head-olive-older: pokeOut 70
- women/heart: hair-bangs-heart-blond on head-heart-brown-older: pokeOut 65
- women/heart: hair-bangs-heart-blond on head-heart-fair-older: pokeOut 66
- women/heart: hair-bangs-heart-blond on head-heart-light-older: pokeOut 66
- women/heart: hair-bangs-heart-blond on head-heart-olive-older: pokeOut 66

This round's line: a gap of 60+ px between a piece and the face, 60+ px see-through or 60+ px of skin poking out beside a piece, on any head; v1's line is the worst v1 itself showed (gap 3, see-through 5, poke-out about 12). The new heads are held to their shape's master within 4 px (v1: 2 px), so many more combinations pass this round's line than v1's: the 'v1's line' column counts how many 1-60 px slivers there are. Every flagged combination is in `manifest-additions.json` under `doNotCombine`.

What each remaining flag is, looked at 4x and at 1:1 (none is visible at the game's sizes; at full size they are 1-2 px):

- **Square beard on four square heads (brown adult and older, dark older, medium older), round beard on the round dark older head:** the beard's edge and these heads' jaw lines differ by 1-3 px along the jaw, so a 1-2 px sliver of backdrop (seeThrough) or of the head's own jaw line (pokeOut) runs beside the beard. The light 1 px line that used to show there is mostly gone (light edge pixels dropped from beards); a faint trace remains on the black square beard over the dark older square head at 3x zoom. Repainting those five heads to the square and round masters' outlines within 1 px would clear it.
- **Gray buzz cut on the standard olive older head:** specks of the head's own outline between stubble tips at the temple.
- **Blond heart-shape bangs on four older heart heads:** the older jaw line touches the hair's inner edge for a few pixels.
- Not counted as failures, v1 shows the same on its own heads: light-rim counts on the darkest heads (the worst here is the v1-like range, 400 to 900, mostly highlights inside strands, no halo at game size); small pockets between braids and locs where the top shows through, as between real braids.

## Codex pictures

447 pictures made on Nov 17 (plus 7 that failed with a routing timeout and were rerun); the daily limit was not hit. Shape masters 24, heads 187 (including repaints for outline and skin color), hair and beard paintings and their color repaints 130, hair-only pictures 106.

## Not done, and small things left

- Three-quarter view: front only, like round 4.
- Braid parts keep a thin dark brown part line (the master's scalp), as v1's parted styles do.
- The five near-equal shade pairs listed under the shade ladder.
- `sheets/look/`: every new hair and beard file, in every color, on a light head of its own shape (12 pages); looked at page by page after the last cut.
