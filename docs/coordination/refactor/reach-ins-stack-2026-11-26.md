# Reach-ins stack, Nov 26: every head in order

For the CTO to train in one pass. Base: main at `ea60e9eb47` (where the stack was cut). Main has since moved to `231ab84861`; merge main into the top head before training it.

**One head holds everything:** `claude/lucid-lovelace-wjgvtx-reach-16-leaf-constants` at the commit that adds this note (code is `f17c248b7a`). From `reach-7-screens` upward each head is an ancestor of the next. The six heads below it (`reach-1` to `reach-6`) were rebuilt after load-order fixes, so they are not ancestors of `reach-7`; their changes are in the top head's tree and the heads stay for review in the order listed. Train the top head, or fold the list from the bottom if you prefer small steps.

Branch names drop the prefix `claude/lucid-lovelace-wjgvtx-`. "Reach-ins" is the families baseline total after that head (main: 575).

| Order | Branch                  | Head         | Reach-ins after | What it holds                                                                                  |
| ----- | ----------------------- | ------------ | --------------- | ---------------------------------------------------------------------------------------------- |
| 1     | reach-1-laws            | `6f98205072` | 563             | laws engine through front doors (#10653)                                                       |
| 2     | reach-2-budgets         | `10154219a4` | 553             | budgets                                                                                        |
| 3     | reach-3-clock-places    | `7d610a3f11` | 546             | clock and places                                                                               |
| 4     | reach-4-news            | `bab423f5f0` | 525             | news                                                                                           |
| 5     | reach-5-executive       | `f37719d301` | 512             | executive                                                                                      |
| 6     | reach-6-elections       | `23a1b18158` | 481             | elections                                                                                      |
| 7     | reach-7-screens         | `e373127e5e` | 454             | screens (#10663); first head that is an ancestor of the rest                                   |
| 8     | reach-8-people          | `ca761fd03a` | 403             | people                                                                                         |
| 9     | reach-9-jobs-businesses | `a3f9aba91e` | 397             | jobs and businesses                                                                            |
| 10    | reach-10-bodies         | `f25fd20a39` | 377             | bodies                                                                                         |
| 11    | reach-11-director       | `4be8b45014` | 365             | director                                                                                       |
| 12    | reach-12-english        | `8e7743829d` | 364             | English engine                                                                                 |
| 13    | reach-13-screens-more   | `e36e5684f5` | 353             | more screens                                                                                   |
| 14    | row12-effect-learned    | `fbbbc2822d` | 353             | map row 12: one emitter for "learned of a law's effect"                                        |
| 15    | row9-one-register       | `e6f896afe6` | 353             | map row 9: one stopgap register                                                                |
| 16    | row11-ui-tokens         | `182fa7007f` | 353             | map row 11: colors, corners and sizes named once                                               |
| 17    | reach-ins-left          | `781929752e` | 353             | the list of what is left and why: `reach-ins-left-2026-11-26.md`                               |
| 18    | cycles                  | `796ba12e05` | 353             | import-cycle guard (red on a planted cycle) and the `health.ts` cause fix                      |
| 19    | reach-14-jobs-refused   | `f75ddbc12d` | 298             | the 55 jobs moves that had been refused, made after the cause fix                              |
| 20    | reach-15-doors          | `89800de314` | 298             | 101 entry exports nothing imports, dropped in 60 files                                         |
| 21    | reach-16-leaf-constants | `f17c248b7a` | 298             | literal constants of eight modules in leaf files; cycle baseline set to 1317 edges / 249 files |

Separate, not in the chain: `skill-note` (`5763bd0568`, #10659), a skills-only change that can merge to main on its own.

## Numbers

- Reach-ins: 575 → 298. Import cycles: main 1219 edges in 235 files; stack top 1317 / 249 (baseline file `tests/guards/import-cycles-baseline.json`, which may only shrink from here). The stack added about 100 edges because the front doors are heavy files that sit inside the big cycle; reading a front door instead of a leaf file puts one more edge in it. The leaf-constant cut took 8 back. Only 39 cyclic edges were pure literal constants; the rest need real code to move.
- Records digest at Umatac, Guam, seed `reach-ins-1`, 1 year: `b3d14e63f4474250`, equal to main's, at `reach-14` and at the top head (`reach-16`).
- `tests:load`: clean through `reach-13`; for `reach-14` and above it was still running when this note was written.
