# Confirmer run: Lane 5, Path 3 (inside the bar)

Run Nov 4, 2026 on main 8b24caf99e by a session that built none of it, one process at a time, Node heap 8,192 MB: `npm run speed:year -- --years 4` on a drawn place, then the fixed towns at their replay numbers (`run.sh`, `speed-years.log.txt`). The bar is a year in under 120 seconds, election years included (2026 and 2028 are years 2 and 4).

| Place                                         | Year 1 | Year 2 | Year 3  | Year 4  |
| --------------------------------------------- | ------ | ------ | ------- | ------- |
| Melvina, Wisconsin (drawn, confirmer-speed-1) | 27.3   | 56.7   | 43.9    | 73.1    |
| Haleyville, Alabama                           | 74.3   | 172.0  | 138.3   | 305.1   |
| Murray, Nebraska                              | 43.4   | 112.5  | 64.3    | 124.1   |
| Meadow Lakes, Alaska                          | 130.2  | 250.2  | 249.2   | 579.6   |
| Brookside, Delaware                           | 116.3  | 213.8  | 203.6   | 755.5   |
| Storrs, Connecticut                           | 92.4   | 124.8  | 109.2   | 142.7   |
| Washington, D.C.                              | 130.6  | 165.8  | stopped | stopped |

**Result: fail.** The drawn place is inside the bar; six of the seven fixed towns run are not, worst Brookside's 2028 at 755.5 s. Cabo Rojo and Santa Rita were not run, and D.C. was stopped after year 2 once the result was clear. Every finished run exited 0. Open work: Lane 5's unit 7 (`core-speed-world-races-election-month`, `core-m7-01-speed-and-memory`).
