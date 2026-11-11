# The bust spec: what the art must be for the code to draw it

Agreed between the CTO, who paints the busts, and Fable B, who builds the bust part, on Nov 10, 2026, at the owner's word: "be sure you collaborate with fable to make sure everything is the right size or whatever is needed for the code."

The code is `src/bench/bust.ts` (which pieces a person is) and `src/bench/ui/bust.mjs` (how a screen stacks them). The art and its manifest are in `art/busts/v1/`.

## Canvas

Every piece is a 1254 by 1254 RGBA PNG on one shared canvas, drawn at (0, 0). Nothing is moved, scaled or tinted by the code. No smaller exports: the largest a bust shows is about 340 screen pixels wide, 680 on a sharp screen.

| Where                                 | Size the canvas is drawn at, in screen pixels       |
| ------------------------------------- | --------------------------------------------------- |
| You                                   | about 335                                           |
| The person card                       | about 315                                           |
| Government's leaders                  | about 210                                           |
| Round faces in lists and member cards | 65 to 100 (the head fills 56% of the circle)        |
| The talk box and rooms                | not built; how busts show there is the owner's call |

## Framing

The code reads one head box for each set (a sex at an angle), so every head in a set shares it.

- **Head.** The hair's top is at y 100. The head is centered on x 627, the canvas's middle. Ear to ear is about 430 wide. Round 2 measures: women's hair top 99, head 436 wide, middle 626; men's hair top 83 to 99, head 423 wide, middle 614.
- **Tops.** A top starts under the chin and runs to the bottom edge. Shoulders reach about x 130 and x 1120, with at least 60 clear pixels each side.
- **No fade in the paint.** The code fades the lower 38% and 12% at each side. The top is painted solid to the bottom edge, on a clear background, with no light rim.
- All heads of one set share one outline within a pixel, so every hair fits every head.

## Angles

Front first, for every piece: every menu draws the front view. Three-quarter left is second; it matters once the owner rules how busts show in talks. No three-quarter right. The code never mirrors a piece: hair parts and collars would flip.

## Variety for early access, for each sex

- **Heads: 6.** Three skin tones (light, medium, dark), each as an adult and as an older face. A person's tone is the tone of their painted figure. A teenager uses the adult head and wears no facial hair.
- **Tops: 6.** Two for each way the game dresses someone: everyday, work and official.
- **Hair: 6 styles in 4 colors:** black, dark brown, blond and gray. Gray goes with the older heads.
- **Men's facial hair:** a beard and a mustache in black, dark brown and gray.

## Files

- Folder: `art/busts/v1/<women|men>/<front|three-quarter-left>/`.
- Names: `head-<tone>-<age>.png` (tone `light`, `medium` or `dark`; age `adult` or `older`), `top-<name>.png`, `hair-<style>-<color>.png`, `face-<beard|mustache>-<color>.png`.
- Format: PNG.
- Each folder keeps its `checks.json` and `pieces-check.json`: 0 holes, 0 changed pixels and 0 light rims for every pair.
- `art/busts/v1/manifest.json` lists the pieces the game draws, with their tags: a head's tone and age; a top's dress (everyday, work or official); a hair or facial hair piece's style and color. A new piece is a new file and a new row. No code changes.

## Layer order

Head, top, facial hair, hair. Glasses, if painted, go between facial hair and hair. No anchor points: the shared canvas is the anchor.

## What the code does with the pieces

- The head is the person's skin tone.
- The top is how the person is dressed where the viewer is. An officeholder is always shown as they serve.
- Hair and facial hair are set once from the person's own appearance seed, so one person is one bust everywhere. This decides who someone looks like, never what anyone does.
- A look made in the creator keeps its face: no facial hair is added.
- The screen stacks the pieces as separate pictures, so the browser fetches each piece once for everyone who wears it.
