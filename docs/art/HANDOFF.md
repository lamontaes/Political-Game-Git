# People art: handoff

What a cloud session needs to finish the people art if the CTO's Mac session stops. Written Oct 28, 2026 overnight; the newest delivery is at the bottom of `art/people-rooms/README.md`.

## The owner's model (Oct 28, his words)

People are built the way Reddit builds avatars: "it uses the same model, and all it does is change the clothes on there because all the clothes are pre-rendered on there." He means:

- **One body per pose and angle.** There are six bodies: three builds (slim, medium, heavy) × two sexes, all with the same universal bald head.
- **Every part is its own picture on that body:** hair (12 styles), shirt, jacket or suit, tie, pants and shoes. Changing a part means "taking the shirt from one generation and literally replacing it, not putting it on top of it."
- **Each part takes its own color,** and so does skin: "hair, shirt, pants, shoes, skin color, and the colors of all of those."
- **Hand poses come with the body poses,** and every angle the game needs gets its own set.
- **Poses look natural:** "99% of people aren't going to sit at parade attention... Make people look alive." The lectern poses were good. Stiff, upright, hands-on-knees sitting is out.
- **Firefly does the work; ours is only "making it transparent."** No cutting into heads, no smoothing, measuring, scaling or swapping heads.

## Where things are

| Path (branch `claude/people-rooms-art`)                      | What                                                                                                                                                              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `art/people-engine/v2/wardrobe/<pose>/<figure>/`             | The parts for one pose, in that figure's box: `body.png`, `shirt-1..5.png`, `jacket-1..5.png`, `tie-1.png`, `pants-1..5.png`, `shoes-1..5.png`, `hair-1..12.png`. |
| `art/people-engine/v2/wardrobe/<pose>/parts.json`            | The frame size, each figure's box `[x0, y0, x1, y1]` in the frame, the layer order, and the parts each figure has.                                                |
| `art/people-engine/v2/wardrobe/outfits.json`                 | Named outfits (part numbers per layer) with their place and time tags.                                                                                            |
| `art/people-engine/v2/wardrobe/<pose>/base.png`              | The pose's base picture: bald, plain collared shirt, slacks, dress shoes.                                                                                         |
| `art/people-rooms/prompts/natural.js`                        | The Firefly job builders: `__natBases` (natural pose bases), `__marker`, `__keyParts` (18 parts in key green), `__hair12`.                                        |
| `art/people-rooms/prompts/runner-strict.js`                  | The one-at-a-time runner: one fresh reference per job, 30 s apart per tab.                                                                                        |
| `art/people-rooms/tools/`                                    | `wardrobe_parts.py` (makes a pose's parts transparent) and `stack.py` (stacks parts into dressed people for proof sheets).                                        |
| `art/people-rooms/README.md`, `manifest.json`, `MANIFEST.md` | Plates, spots, tags and earlier deliveries.                                                                                                                       |

## Stacking a person (what the game does)

1. **Pick the pose** for the spot (tags: pose, facing, seat) and the figure (sex, build).
2. **Draw the layers in order:** body, pants, shoes, dress, shirt, tie, jacket, hair. A dress replaces both the shirt and the pants. Each layer is drawn at the figure's box. Nothing is moved or scaled relative to the body, because every part was painted on that body.
   - `body.png` is only the head and bare skin. The base clothes are parts too (`shirt-1`, `pants-1`, `shoes-1`). If a style isn't painted for a pose yet, draw style 1 of that layer instead of nothing, or the person has no feet. Jacket, tie, dress and hair may simply be left off.
3. **Recolor each layer.** In a part painted in key green (hair: key blue), the garment is exactly the key pixels: they become the new color × (pixel brightness ÷ the 60th-percentile brightness of those pixels), which keeps the folds. Every other pixel in the part is bare skin or its outline (forearms in a tee, shins under a skirt, scalp between curls) and takes the person's skin color the same way. The base clothes (`shirt-1`, `pants-1`, `shoes-1`) are plain gray, not keyed: there, warm pixels are skin and the rest is garment. `stack.py dress()` is the reference.
4. **Size the whole stack to the spot:** scale so the body's head width matches the spot's `headWidth`. All layers scale together.
5. **Draw furniture in front** with the spot's `frontLine`.

## Wiring the character creator (for the builder)

Today's creator (`src/bench/appearance.ts`, `figure-hair.ts`, `figure-colors.ts`, `whole-figures.ts` on main) works like this:

- **The look:** sex, build and one of four outfit sheets (base, shirt, vest, blazer), plus a color per garment.
- **The drawing:** `drawnFigure(name, colors)` lays a face on the figure, recolors it, then scales hair painted on another figure onto it by head width. That scaling is the misfit the owner saw.

The wardrobe replaces the outfit sheets with parts:

1. **`LookRecipe`:**
   - Add `pose` (default `nat-s1`) and a style number for each part: `shirtStyle` (1–6), `jacketStyle` (none or 1–5), `tie` (none or 1), `pantsStyle` (1–6), `shoesStyle` (1–6), `dress` (none or 1).
   - Keep `outfit` as a preset: choosing it fills the style numbers from `outfits.json`.
   - Colors stay as they are (skin, jacket, shirt, pants, shoes, hairColor). Add `tieColor` and `dressColor`.
2. **`appearanceRows` and `moveAppearance`:**
   - One arrow row per part: Top, Jacket, Tie, Bottoms, Shoes, plus Dress for women.
   - Each row steps only through the numbers that figure has in `<pose>/parts.json`, and keeps its color row.
   - Hair steps 1–12 (and bald). Its piece is `hair-<n>.png` of the same figure, never scaled from another figure.
3. **Drawing:** a wardrobe path beside `drawnFigure`.
   - Read `<pose>/parts.json` and take the figure `v2-<pose>-<f|m>-<build>`.
   - Draw body, pants, shoes, dress, shirt, tie, jacket, hair at the figure's box. A dress hides shirt and pants.
   - Recolor each layer as `stack.py dress()` does (step 3 above): key pixels take the garment color, the rest of a keyed part takes the skin swatch, both through brightness. `figure-colors.ts` already has the swatches and the brightness recolor.
4. **Faces:** the wardrobe bodies have their own painted faces. More faces come the same way as hair: face edits per pose, not patches fitted from other figures.
5. **Rooms:** `figureOn` / `placeSeated` choose a wardrobe pose from the spot's tags using `index.json`, then draw with the same stack.
   - Facing per sex: flip when the figure and spot point opposite ways.
   - Seat and covered-by come from the spot.
   - **Size** (`tools/scene_people.py`): a person standing on open floor fills the mannequin from head to feet. A seated person, or one behind a stage, desk or counter, is sized by head width × 1.18 (the mannequin's head has no ears). A speaker whose feet show beside a lectern (box at least six head widths tall) is sized head to floor.
   - **What hides a person:** only a real object in front, named in the spot's `coveredBy` (desk, table, counter, chair back, railing, stage, dais, lectern). On open floor, on a couch or on a bed, the legs are in front of everything, so nothing is cut. Behind a stage, desk or counter, its top edge runs straight across the whole person. A lectern keeps its measured shape and runs a little past the mannequin's sides. Fill the gap between the mannequin's legs before using its line, or the person loses the inside of their legs.
   - **Head sizes:** two overlapping mannequins measured as one blob. `tools/fix_heads.py` brought those spots down to the size of their row (people behind a stage or in a chamber row at the same height in the picture are about the same distance away). The old value is kept in `headWidthMeasured`.
   - **Crowds** (`tools/autocast.py`): in a room with a `speaker` spot, the standing spots without a role are the audience. Most clap, cheer or hold a sign; a few just watch. Clapping never goes to a visitor in an ordinary room.

## Making a pose (Firefly, about 32 jobs, 5–6 minutes on four tabs)

1. **Base:** `__natBases(baseUrl)` edits the standing base into a natural pose, or use any existing base.
2. **Marker map** (`__marker`): the base's shirt yellow, pants blue and shoes green. This gives the base's own garment regions.
3. **Parts** (`__keyParts`, 19 edits, plus `__womenParts`, 4 more): each edit changes one garment and paints it in flat key green (#22C55E). Green makes the whole garment exact.
   - Never find a garment by "what changed": a gray jacket over a gray shirt barely changes, and on Oct 28 that cut lost most of the jacket.
   - Pants are painted with the shirt tucked in tightly, so each pair reaches the waist and an untucked tee always covers its top edge. Without that, a tee over jeans left a gap at the waist.
   - Women-only pieces (blouse, pencil skirt, sheath dress, low heels) change only the top row; the men's parts come out empty and are skipped.
4. **Hair** (`__hair12`): 12 edits of the base, the hair in flat key blue (#2563EB). Gray hair lost long styles where they fall over a gray shirt; the cutter prefers `hb-` (blue) files over `hk-` (gray).
5. **Download:**
   - Find them with `asset_search` (GenAIAsset, createDate desc). The key is in `[brackets]` at the start of the name.
   - Then `asset_get_presigned_urls`, then curl.
   - Edits come back 1264×843 on white; the cutter resizes them to the 1536×1024 frame.
6. **Cut:** `python3 wardrobe_parts.py BASE MARKER POSE EDITS_DIR OUTDIR BASE HAIR_PREFIX`.
7. **Check at full size:** `stack.py` with a few outfits, head by head, before pushing.

## Firefly limits

- **Model:** Gemini 3.1 (Nano Banana 2) edits at 1K. The account has unlimited generations.
- **Tabs:** four, 30 s apart per tab.
- **A "boxed" status usually still lands.** Confirm every job with `asset_search` and requeue what's missing.
- **Tab controls:** `window.__halt = true` stops a tab after its current job. Wait at least 30 s before starting it again, or the old loop resumes.
- **Rate limit:** after several hundred jobs, a tab can hit Firefly's limit screen ("Whoa there, speed racer! ... Please try again later"). Its jobs then fail with `refs {"refs":5}` because the leftover picture strip counts as references. Move that tab's jobs to the others and rest it.
- **Failures cluster by tab.** Jobs are dealt to tabs in turn, so one broken tab loses the same part on every pose. Check each tab's `__jobStatus` for errors, not only the asset list.

## What exists (Oct 28, 09:10 UTC)

- **Poses** (`wardrobe/index.json` has facing per sex, hands, seat, covered-by, age band):
  - **standing:** `nat-s1` relaxed, front (the creator pose); `s2` relaxed, three-quarter; `s3` talking; `s4` arms folded; `s5` on the phone; `s6` walking; `s7` talking to the viewer; `l1` at a lectern; `p1` profile;
  - **seated:** `c1` sitting back, legs crossed; `c2` leaning in at a table; `c3` talking; `c4` typing; `p2` profile;
  - **turned away:** `t1` three-quarter from behind; `b1` standing from behind; `b2` seated from behind;
  - **older adults (about 70):** `nat-s1-old`.
  - Sheet `31` is a stiff proof set, not for scenes.
- **Parts per pose:**
  - shirts 1–6 (6 = women's blouse);
  - jackets 1–5, plus 6 (wool winter coat) and 7 (rain jacket) still landing;
  - tie 1;
  - pants 1–6 (6 = women's pencil skirt);
  - shoes 1–6 (6 = women's low heels);
  - dress 1;
  - hair 1–12.
  - About 90 pieces that failed are being repainted; a part that came out too thin is left out of `parts.json` until it's redone.
- **Crowd poses:** clapping (`nat-r1`) is cut and cast at rallies. Cheering (`r2`), holding a blank sign (`r3`, the sign is a live surface for campaign text), clapping from behind (`r5`) and sitting forward on a bench (`c5`) are painting.
- **Proofs** in `art/people-rooms/wardrobe-proof/`:
  - creator sheets for a woman and a man;
  - everyday and women's outfits on all six bodies;
  - `every-pose-dressed.jpg`;
  - ten rooms cast automatically.

## Not done yet

- **Wiring is not done.** No code uses `wardrobe/` yet; the section above says where it plugs in.
- **Missing pieces:** hats, uniforms (police, nurse, judge's robe), more dresses and skirts, teens and children (the adult sheet reads young enough for 18), and older adults in poses other than the front one.
- **Out for scenes:** the four upright sitting sheets (37, 01, 70, 06) have marker and gray parts from before the green rule. They are stiff and shouldn't be used.
