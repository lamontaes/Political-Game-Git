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
3. **Recolor each layer.** For plain or green pixels: the new color × (pixel brightness ÷ that layer's typical brightness), which keeps the folds. Warm pixels are skin: bare forearms in a tee, legs in shorts, scalp between curls. They take the person's skin color the same way. `stack.py dress()` is the reference.
4. **Size the whole stack to the spot:** scale so the body's head width matches the spot's `headWidth`. All layers scale together.
5. **Draw furniture in front** with the spot's `frontLine`.

## Making a pose (Firefly, about 32 jobs, 5–6 minutes on four tabs)

1. **Base:** `__natBases(baseUrl)` edits the standing base into a natural pose, or use any existing base.
2. **Marker map** (`__marker`): the base's shirt yellow, pants blue and shoes green. This gives the base's own garment regions.
3. **Parts** (`__keyParts`, 19 edits, plus `__womenParts`, 4 more): each edit changes one garment and paints it in flat key green (#22C55E). Green makes the whole garment exact.
   - Never find a garment by "what changed": a gray jacket over a gray shirt barely changes, and on Oct 28 that cut lost most of the jacket.
   - Pants are painted with the shirt tucked in tightly, so each pair reaches the waist and an untucked tee always covers its top edge. Without that, a tee over jeans left a gap at the waist.
   - Women-only pieces (blouse, pencil skirt, sheath dress, low heels) change only the top row; the men's parts come out empty and are skipped.
4. **Hair** (`__hair12`): 12 edits of the base, the hair in plain gray.
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

## Queue order being followed tonight

1. **Sheet 31 (standing, front):** all parts in key green. This proves the stack works; its hands hover, so it isn't a scene pose.
2. **Natural pose bases:** the first round turned the women into men, so the prompt now spells out their builds. Nine passed from the second round and are pushed under `wardrobe/nat-*/base.png`:
   - standing: `s1` relaxed, front (the character creator pose); `s2` relaxed, three-quarter; `s3` talking; `s4` arms folded; `s5` on the phone;
   - seated: `c1` sitting back, legs crossed; `c2` leaning in at a table; `c3` talking;
   - from behind: `b1` standing.
     Walking (`s6`), front talking (`s7`) and seated from behind (`b2`) are being repainted.
3. **For each of the nine:** marker, 19 parts, 4 women's parts and 12 hair (about 36 jobs). Then cut, check at full size and push.
4. **Then:** profile and three-quarter-from-behind versions of the most used poses. Three-quarter right is the mirror of three-quarter left.

## Not done yet

- **Wiring is not done.** No code yet uses `wardrobe/` in the character creator or in rooms; that's the people-in-rooms builder's job.
- **Missing pieces:** coats for winter, hats, uniforms (police, nurse, judge's robe), and more dresses and skirts.
- **Out for scenes:** the four upright sitting sheets (37, 01, 70, 06) have marker and gray parts from before the green rule. They are stiff and shouldn't be used.
