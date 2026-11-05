# One Map: a game year before and after, Nov 5, 2026

**Result.** No year runs more than 5 percent slower with the place map. In the same small Colorado town, years 1 to 3 got faster and the election year, year 4, got about 2 percent slower.

| Year              | Before  | After   | Change           |
| ----------------- | ------- | ------- | ---------------- |
| 1                 | 36.5 s  | 35.7 s  | 2 percent faster |
| 2                 | 111.8 s | 102.8 s | 8 percent faster |
| 3                 | 57.8 s  | 53.7 s  | 7 percent faster |
| 4 (election year) | 128.3 s | 131.2 s | 2 percent slower |

The script's own bar (no year more than 20 percent slower) passed too. Years 2 and 4 are over two minutes on this machine both before and after, so the two-minute bar is a separate question from the map.

**Earlier try in a larger town.** In Montpelier, Vermont (about 8,000 people, same seed), years 1 to 3 compared: 163.8, 410.4 and 613.6 seconds before; 160.3, 423.1 and 556.7 after. Year 4 ran out of memory on this machine both before and after, so that town's year 4 could not be compared. The small town above is why year 4 is compared at all.

**Method.** Place: Upper Witter Gulch, Colorado (key 0879800), seed 5a1c0de7a11ce5e1, one process at a time on a quiet machine, four years each with `npm run speed:year -- --seed 5a1c0de7a11ce5e1 --place 0879800 --years 4 --exclusive`. Before: main at a394ca8fde, just before the place map merged. After: main at 93e913ee34, with the map and every family moved onto it.
