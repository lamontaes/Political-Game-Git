# One Map: a game year before and after, Nov 5, 2026

**Result.** No year runs more than 5 percent slower with the place map. In the same small Colorado town, years 1 to 3 got faster and the election year, year 4, got about 2 percent slower.

| Year              | Before  | After   | Change           |
| ----------------- | ------- | ------- | ---------------- |
| 1                 | 36.5 s  | 35.7 s  | 2 percent faster |
| 2                 | 111.8 s | 102.8 s | 8 percent faster |
| 3                 | 57.8 s  | 53.7 s  | 7 percent faster |
| 4 (election year) | 128.3 s | 131.2 s | 2 percent slower |

The script's own bar (no year more than 20 percent slower) passed too. Only year 4 (the election year) is over two minutes, at 128.3 s before and 131.2 s after; years 1 to 3 are under, so the two-minute bar for year 4 is a separate question from the map.

## Earlier try in a larger town

In Montpelier, Vermont (about 8,000 people, same seed), years 1 to 3 compared: 163.8, 410.4 and 613.6 seconds before; 160.3, 423.1 and 556.7 after. Year 4 ran out of memory on this machine both before and after, so that town's year 4 could not be compared. The small town above is why year 4 is compared at all.

## Method

Place: Upper Witter Gulch, Colorado (key 0879800), seed 5a1c0de7a11ce5e1, one process at a time on a quiet machine, four years each with `npm run speed:year -- --seed 5a1c0de7a11ce5e1 --place 0879800 --years 4 --exclusive`. Before: main at a394ca8fde, just before the place map merged. After: main at 93e913ee34, with the map and every family moved onto it.

## Later check the same day: where a slower year came from

Same town, seed and machine, year 1 only, one run each, nothing else running:

| Commit                                                | Year 1                     |
| ----------------------------------------------------- | -------------------------- |
| Before the place map (a394ca8fde)                     | 50.0 s                     |
| Place map and every family moved (93e913ee34)         | 46.7 s                     |
| After One Map's state reads (5d79411cdf)              | 44.6 s                     |
| After State Sessions' #7290 merge branch (780abf8e39) | 116.7 s                    |
| Main after #7290 (04ef12c915)                         | 118.2 s                    |
| Main after #7295 (f7c9caf747), four years             | 128.4, 211.6, 150, 299.2 s |

The place map and its moves made year 1 about 11 percent faster, not slower. The jump to about 117 s arrives with the State Sessions change that makes every state's legislature sit (#7290), which is not One Map's. The earlier year 2 spread (103 to 131 s) was machine noise on a commit that did not change; the 6 to 7 percent year-2 reading above is inside it. State Sessions owns the new cost.
