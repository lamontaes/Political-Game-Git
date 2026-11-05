# State sessions: the speed base, Nov 5, 2026

**Result.** This is the base every state-sessions step is measured against. One Colorado town finishes four years but its election year is over the two-minute bar. Montpelier, Vermont runs out of memory in year 4, as it did before the place map.

Main at a40f3b1c, one process at a time, seed 5a1c0de7a11ce5e1, `npm run speed:year -- --years 4 --exclusive`. The machine is a four-core cloud container, slower than the one in the place-map report, so compare steps to this table, not to that report.

| Year | Upper Witter Gulch, Colorado (key 0879800) | Montpelier, Vermont (key 5046000) |
| ---- | ------------------------------------------ | --------------------------------- |
| 1    | 59.5 s                                     | 253.1 s                           |
| 2    | 172.8 s                                    | 826.2 s                           |
| 3    | 76.2 s                                     | 1032 s                            |
| 4    | 212.4 s (election year)                    | out of memory at the 8 GB limit   |

**Memory, Montpelier.** Process size after each collection: 3.9 GB, 5.6 GB, 6.3 GB, then the crash in year 4. Records kept: 392 thousand, 965 thousand, 1.64 million. In year 3 the three biggest tables were `core2-campaigns-v1.foldedCauses` (258,373), `core.durableLog` (207,411) and `core.relationships` (137,513); each roughly doubled from year 2. Colorado's year 4 holds 650 thousand records, with `foldedCauses` again the largest at 80,075. That is the lead for step 6.

**Bars for later steps.** No year more than 5 percent over this table unless the PR says why. The Colorado election year must come under 120 s.
