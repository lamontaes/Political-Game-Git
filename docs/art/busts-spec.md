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
- **Clothes, as layers in colors** (round 4, in the game since Nov 11, 2026; owner, Nov 10: "I would like to be able to change ties and stuff ... I want to see colors and stuff changing as well"). A bust wears one whole top (everyday: a sweater, a chambray shirt, a henley, a cardigan), or a dress shirt with or without a tie and a jacket. Each color is its own painting, never a tint. The manifest's `clothes` lists the styles of each layer with their colors, and its `dress` says what everyday, work and official each wear.
- **Hair: 6 styles in 4 colors:** black, dark brown, blond and gray. Gray goes with the older heads.
- **Men's facial hair:** a beard and a mustache in black, dark brown and gray.

## Files

- Folder: `art/busts/v1/<women|men>/<front|three-quarter-left>/`.
- Names: `head-<tone>-<age>.png` (tone `light`, `medium` or `dark`; age `adult` or `older`), `top-<name>-<color>.png`, `shirt-<name>-<color>.png`, `tie-<name>-<color>.png`, `jacket-<name>-<color>.png`, `hair-<style>-<color>.png`, `face-<beard|mustache>-<color>.png`.
- Format: PNG.
- Each folder keeps its `checks.json` and `pieces-check.json`: 0 holes, 0 changed pixels and 0 light rims for every pair.
- `art/busts/v1/manifest.json` lists the pieces the game draws, with their tags: a head's tone and age; a top's dress (everyday, work or official); a hair or facial hair piece's style and color. A new piece is a new file and a new row. No code changes.

## Layer order

Head, the whole top or the shirt, the tie, the jacket, facial hair, hair. Glasses, if painted, go between facial hair and hair. No anchor points: the shared canvas is the anchor.

## What the code does with the pieces

- The head is the person's skin tone.
- The clothes are how the person is dressed where the viewer is: an everyday top, or at work a shirt, with a tie for some. An officeholder is always shown as they serve, in a shirt and a jacket, with a tie where ties are painted for them.
- A look made in the creator chooses its shirt, tie and jacket by color. It wears them at work and in office, and an everyday top elsewhere.
- Hair and facial hair are set once from the person's own appearance seed, so one person is one bust everywhere. This decides who someone looks like, never what anyone does.
- A look made in the creator keeps its face: no facial hair is added.
- The screen stacks the pieces as separate pictures, so the browser fetches each piece once for everyone who wears it.

## Spec 2: clothing as layers, in colors (owner, Nov 10, 2026)

The owner accepted round 3 and asked for more: "what about changing colors of stuff?" and "yes, I would like to be able to change ties and stuff. But conceptually, it looks good, but I want to see colors and stuff changing as well." His creator mock (`docs/mocks/2026-11-08-front`, fr-creator) has rows for Shirt, Jacket and Tie. This section is what the next round of painting must be for the code to draw that. Everything above still holds: the canvas, the framing, the angles, PNG, nothing moved, scaled or tinted.

### Layer order

Head, shirt, tie, jacket, facial hair, hair. Glasses, if painted, still go between facial hair and hair.

### Which tops become layers and which stay whole

Every person wears exactly one piece in the shirt layer. It is one of two kinds:

- **A collared shirt** (`shirt-…`). A tie and a jacket can go over it. Round 3's `top-oxford` and `top-shirt` (men) and `top-oxford` (women) become these.
- **A whole top** (`top-…`). Nothing goes over it. Round 3's `top-sweater` and `top-chambray` (men) and `top-henley`, `top-denim` and `top-cardigan` (women) stay whole.

The suits become layers: round 3's `top-suit` and `top-charcoal` (men) and `top-blazer` and `top-pantsuit` (women) are repainted as a jacket over a collared shirt, with the tie as its own piece for men.

- **Tie** (`tie-…`): men, over a collared shirt only.
- **Jacket** (`jacket-…`): over a collared shirt, and over the tie where there is one.

### What each layer must be so any combination stacks

- A collared shirt is painted whole, shoulders and chest, as if nothing were over it. No hole is left where a tie or a jacket will sit.
- A tie hangs from the collar's knot point and stays inside the shirt's own outline. It is drawn to show between a jacket's lapels and to stand alone on the shirt.
- A jacket covers the shirt's shoulders and sides completely and leaves the collar, the tie and the strip of shirt between its lapels showing. Its outline is the widest piece, so no shirt edge shows beside it.
- The neck join is the one round 3 uses. Every shirt and whole top meets every head at the same line.
- The checks grow with the layers: every shirt with every tie and every jacket, and every whole top, on every head: 0 holes, 0 light rims, no shirt showing outside a jacket.

### Colors for early access

Each color is its own painted file from one master, like hair. Nothing is tinted in the game.

| Garment                   | Men                                                      | Women                                                    |
| ------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| Collared shirt, 1 style   | white, light blue, cream                                 | white, light blue, cream                                 |
| Tie, 1 style              | navy, burgundy, forest green, navy with a silver stripe  | none                                                     |
| Jacket, 1 style           | charcoal, navy, brown                                    | charcoal, navy, burgundy                                 |
| Whole tops, 2 styles each | sweater: gray, green, maroon; chambray: blue, tan, olive | henley: gray, green, maroon; cardigan: cream, navy, rust |

That is 16 new pieces for men and 12 for women, 28 in all. Round 3's denim top stays as it is, in its one color.

### Files and tags

- Names: `shirt-<name>-<color>.png`, `tie-<name>-<color>.png`, `jacket-<name>-<color>.png`, and for a whole top `top-<name>-<color>.png`. A color is one lowercase word or two joined (`lightblue`, `navystripe`).
- `tags.json` gains, for each new row: `kind` (`shirt`, `tie`, `jacket` or `top`), `name`, `color`, and for a whole top its `use` (everyday or work), as round 3 has.
- The manifest's `order` becomes head, shirt, tie, jacket, face, hair. A whole top is listed in the shirt layer.

### What the game does with the layers

The same garments, more or fewer of them by where the person is seen:

- **Everyday:** the shirt layer alone (a whole top, or a collared shirt with no tie and no jacket).
- **Work:** a collared shirt, with a tie for a man who wears one, and no jacket; or a whole top tagged for work.
- **Official:** a collared shirt, a jacket, and a tie for a man.

For everyone but the player, which shirt, tie and jacket they have is set once from their appearance seed, as hair is.

### How the creator offers them

One row for each garment, as his mock shows, each stepping with arrows through the painted choices by their color and name:

- **Shirt:** every collared shirt and every whole top ("White shirt", "Gray sweater").
- **Tie:** None, then each tie ("Navy tie"). The row is not shown for a whole top or where the set paints no tie.
- **Jacket:** None, then each jacket ("Charcoal jacket"). Not shown for a whole top.

The player wears what they picked, shown by the same rule as everyone: the shirt alone at home, the tie at work, the jacket in office. A player who picks a sweater wears the sweater everywhere. The creator's bust shows all the chosen layers at once, so he sees the tie and the jacket change as he steps.

Hair color and the older face get their own rows from round 3's pieces (Hair, Hair color, Facial hair) when round 3 is swapped in; they need no new painting.
