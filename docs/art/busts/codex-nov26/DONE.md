# Nov 26 front busts

Candidate batch for owner review on `busts/codex-nov26`, based on
`busts/round4-source` at `677a6796`. Front only. No pull request, merge,
game integration, or owner approval.

The image-tool test and the source-head edit test both succeeded. All 12
heads were edited from their matching Round 4 PNGs. The head and neck remain
one painting. The registered layers retain the source scalp, ears, and collar
placement while changing the face and upper neck.

## Files

Under `art/busts/codex-nov26/women/front/`:

- `head-fair-adult.png`
- `head-light-older.png`
- `head-olive-adult.png`
- `head-medium-older.png`
- `head-brown-adult.png`
- `head-dark-older.png`
- `head-heart-fair-adult.png`
- `head-round-brown-adult.png`
- `head-long-dark-older.png`
- `head-oval-light-adult.png`
- `head-diamond-medium-older.png`
- `head-pear-olive-adult.png`

Each style below has four files named `hair-<style>-<color>.png` in its
sex's `art/busts/codex-nov26/<sex>/front/` folder. The suffixes are
`black`, `darkbrown`, `blond`, and `gray`. Each color uses its own
image-tool painting fitted to shared layer geometry. No color was produced
by tinting the black painting.

| Folder | Style name | File style |
| --- | --- | --- |
| `women/front` | Butterfly layers | `butterfly-layers` |
| `women/front` | Headband blowout | `headband-blowout` |
| `women/front` | Bantu knots | `bantu-knots` |
| `men/front` | Classic mullet | `classic-mullet` |
| `men/front` | Pompadour | `pompadour` |
| `men/front` | Faux hawk | `faux-hawk` |

## Sheets

All cells use a gray backing and show their 1254 × 1254 sprites at 1:1,
with a separate label strip.

- [compare.png](compare.png) — every Round 4 head beside its edit.
- [with-hair.png](with-hair.png) — every edit with two distinct new
  hairstyles, a Round 4 top, and its matching bare arms.
- [new-hair.png](new-hair.png) — every new style in all four colors, on two
  heads per color. The sheet as a whole covers all six skin shades.

## Fit checks

Run `python scripts/busts/check_pieces.py --json /tmp/bust-check.json`
with Pillow, NumPy, and SciPy. The audit checks the 12 edited heads under
15 tops each, every new hair colorway against all 96 women's or 36 men's
Round 4 head files as applicable, and each edited head against the 12
existing Round 4 women's hair files. The edited women's heads replace
their original filenames in the new-hair fit matrix. Existing hair gaps
are reported against their unedited baselines.

| Check | Tests | Failures |
| --- | ---: | ---: |
| Missing pieces | 36 | 0 |
| RGBA canvas | 36 | 0 |
| Registration and offset | 84 | 0 |
| Collar holes | 180 | 0 |
| Collar skin leakage | 180 | 0 |
| Chin overlap | 12 | 0 |
| Red tee pixels | 12 | 0 |
| Hair gaps introduced by this batch | 1,752 | 0 |
| Hair interior see-through | 24 | 0 |
| Scalp poke-out in crown footprint | 1,728 | 0 |
| Hair over eye and central face windows | 1,584 | 0 |
| Stray pixels | 36 | 0 |
| Pale fringe on black and magenta | 36 | 0 |

Early drafts had registration specks, red pixels at some collar edges,
narrow gaps where a collar or hair met a head, pale fringe pixels, and
visible strand banding from the first color registration.
Those were corrected and rechecked. The untouched Round 4 hair pairings
still have 1,426 pre-existing gap pixels summed across the 144 tested
pairings. The edited heads add none. The proof sheets use the new hair
layers only. No image limit was reached.
