# People as busts: the proof pieces (Nov 7 to 9, 2026)

**In the game since Nov 10, 2026.** This folder is the game's bust bank, `art/busts/v1/` (it was first copied to `docs/art/busts-2026-11-07/`). `manifest.json` lists the pieces the game draws: the front views of the women and the men. `src/bench/bust.ts` is the only code that reads it, and `src/bench/ui/bust.mjs` is the only part that draws a bust. A new piece is a new file here and a new row in the manifest; no code changes.

The owner's call, Nov 7, 2026: "at least for early access, i am thinking about adjust my people goals. still having generation, but maybe just busts for most things and full body for certain scenes." Then: "modular busts shouldnt be that hard right?"

On Nov 10, about 7:30 p.m., he started the move: "Make sure it has the bust too. It can start removing the people, and we need to start transitioning to the bust system." See OWNER-DECISIONS, Nov 10.

These are the CTO's proof pieces from the CTO's Mac, painted with Codex. They are the bust bank as it stands, not finished art.

## How a bust is put together

- Every piece is a 1254 × 1254 RGBA picture on one shared canvas. A bust is the pieces stacked at offset (0, 0), with nothing moved or scaled.
- Pieces stack in this order:
  1. the head and its neck (`head-*.png`, painted in its own skin tone, never tinted)
  2. the top, drawn over the neck (`top-*.png`; the owner picked "top drawn over the neck" on Nov 7)
  3. facial hair, for men (`face-beard.png`, `face-mustache.png`)
  4. the hair, on top (`hair-*.png`), which may fall over the collar
- All heads of one sex share one outline within 1 px, so every hair fits every head with no gaps.
- Every pair is clean at full size. `checks.json` and `pieces-check.json` in each folder record 0 holes, 0 changed pixels and 0 light rims, by combination.
- The sheets in `sheets/` show all 27 combinations.

## What the owner has ruled on these pieces

- **Women, Nov 7, about 7:10 p.m.:** "acceptable, though i'd prefer more detailed shirts, nontheless do men now". Front and three-quarter-left (`women/three-quarter-left/`) are both built.
- **Men, Nov 9, about 11:15 a.m.,** after seeing the front sheets: "some of the men's hair is wrong and the tie is off on some. do more detailed shirts and hair styles/colors for the women and finish the men". Problems found at full size:
  - The receding hair is a ragged strip.
  - The crop's hairline is dead straight.
  - The side part has a spike.
  - The older man has no gray.
  - The burgundy tie drifts left on the white shirt.
  - The men have a front view only. `men/front-fixes/` holds the one finished fix, a dark-brown mustache.
- **Round 3, with more detailed shirts and more hair styles and colors, waits on Codex.** The CTO paints it on the Mac when the owner refills Codex. The plan limit reset is Nov 12, about 1:28 p.m. New pieces keep this canvas and stacking order, so code built on these pieces takes them without changes.

## Where busts go, and what is still his call

- **Menus:** the approved mocks (`docs/mocks/2026-11-07-approved/`) already show busts. The You screen and the person card show one that ends in a soft fade. Government shows its leaders as fading busts. Portraits are lit evenly, never a large face fading into darkness.
- **Big scenes stay whole paintings with full bodies:** the opening address, election night and the swearing-in (Nov 7).
- **How busts show in rooms and scenes is the owner's design call** (Nov 10, 8:40 a.m.: "I haven't decided how they're going to display yet"). Bring him the options with screenshots before building it.
- **When a bust replaces a full-body figure on a screen,** the old figure and every reference to it go in the same change (owner, Nov 5, "replaced means deleted").

# Busts, round 3, front view (accepted Nov 10, 2026)

The owner accepted these on the decisions page (call 10, "Accept, but fix what I name"). His note was "what about changing colors of stuff?", and in his voice note: "yes, I would like to be able to change ties and stuff. But conceptually, it looks good, but I want to see colors and stuff changing as well."

- Per sex: 6 heads (light, medium and dark, each adult and older), 6 tops (two each for everyday, work and official), and 6 hairstyles in black, dark brown, blond and gray. Men also have beards and mustaches in black, dark brown and gray.
- Every piece is 1254 × 1254 RGBA, stacked at (0, 0), and named to `docs/art/busts-spec.md`. `tags.json` has one row per file. The `front-checks.json` files hold the all-combination checks: 0 holes, 0 light rims and 0 see-through hair.
- Known: five new heads miss the shared outline by up to 2 px under the hair, because they were cut with Codex's alpha and heads A to C with Adobe's.
- They're kept in this folder so the lead can swap them in for round 2 in one change (manifest rows plus deleting the round 2 pieces they replace).
- Next, from his note: ties, shirts and jackets as separate pieces, and clothing in more than one color. Both wait on a spec update from the lead.

# Busts, round 4: clothes as layers, in colors (front view; accepted Nov 11, 2026)

Painted by the CTO with Codex on Nov 11, 2026, to Fable B's bust spec 2 (`docs/art/busts-spec.md`, #8559). The owner asked for it on Nov 10: "yes, I would like to be able to change ties and stuff ... I want to see colors and stuff changing as well."

**In the game since Nov 11, 2026.** The owner, that morning: "put these in the morning build." The pieces sit with the rest in `men/front/` and `women/front/`; the manifest's `clothes` lists them and its `dress` says what each way of dressing wears. They replaced round 3's tops, all but the women's denim, which round 4 does not paint.

## Pieces

Every piece is 1254 × 1254 RGBA on round 3's canvas, at offset (0, 0), on round 3's neck join. The layer order is head, shirt, tie, jacket, facial hair, hair.

- **Men, 16 pieces:**
  - `shirt-dress` in white, lightblue and cream
  - `tie-silk` in navy, burgundy, forestgreen and navystripe
  - `jacket-suit` in charcoal, navy and brown
  - `top-sweater` in gray, green and maroon
  - `top-chambray` in blue, tan and olive
- **Women, 12 pieces:**
  - `shirt-dress` in white, lightblue and cream
  - `jacket-blazer` in charcoal, navy and burgundy
  - `top-henley` in gray, green and maroon
  - `top-cardigan` in cream, navy and rust

Each color is its own Codex painting from one master, never tinted. `tags.json` gives each piece's `kind`, `name`, `color` and `layer`, plus `use` for the whole tops.

## Checks

Every shirt × (no tie or each tie) × (no jacket or each jacket), plus every whole top, was checked on all six heads: 396 combinations for men and 108 for women. The results are in `men/front/clothes-checks.json` and `women/front/clothes-checks.json`.

- 0 holes.
- No shirt showing outside a jacket.
- No uncovered neck joins.
- No tie pixels outside a shirt.
- Ties drift at most 2.4 px from knot to bottom edge.

The sheets are `sheets/men-clothes-front-colors.jpg` and `sheets/women-clothes-front-colors.jpg`.
