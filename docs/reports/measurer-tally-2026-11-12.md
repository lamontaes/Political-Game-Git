# Measurer Tally: measured causes for gap-sheet rows, November 12, 2026

Branch `claude/measurer-tally-gap-rows`, off `claude/skills-gap-trace` (33ed4ac82d). Scripts are in `scripts/measure/`. No game code changed. Every run names its place and seed.

## Row 2: how many adults carry "works outside the town"

**Measured.** `scripts/measure/row02-outside-jobs.ts`: build the town, fill in 600 counted adults (ages 18 to 64, spread evenly over the households) with `fillInPerson`, read each one's job title.

| Place | Seed | Counted adults 18-64 | Sampled | No job | "Works outside the town" | Share of sample | Share of those with a job |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Songsong, Rota, Northern Mariana Islands | r2a (f04e657b0bc6b403) | 970 | 600 | 93 | 441 | 73.5% | 87.0% |
| LaBelle, Florida | r2b (ee80728a75cdd79b) | 16,128 | 600 | 119 | 445 | 74.2% | 92.5% |
| Grandview, Washington | r2c (940b3e7c9ea31407) | 25,257 | 600 | 84 | 466 | 77.7% | 90.3% |

**Result.** About three in four filled-in adults, and nine in ten of those who work, carry the title. Every other title is a handful (the next is 8 of 600). So the title is not the fill-in's leftover for a few people; it is the job most adults in a drawn town are given.

## Rows 5, 12, 13 and 14: one harness, five worlds

`scripts/measure/worklife.ts <seed> [fill]` builds the town, takes every full resident aged 18 to 64 (not the player), fills in up to 600 counted adults of that age spread over the households (`fillInPerson`; fill-in runs the whole past), opens each past and reads `lifeOf`. Three drawn towns (seeds w1, w2, w3, through `drawPlace`) and the two worlds the sheet names, replayed by place key and seed (Kaibito, Arizona, 0436640, seed 7c1e5a90b3d24f68, which gives the sheet's "McKenzie's Kitchen, McCarthy's, Santiago"; Kingston, Rhode Island, 4438980, seed e41b9d02a7c35f18).

| Place (seed) | Full adults | Filled in | Players' own events | Full adults, events each | Filled in, events each |
| --- | --- | --- | --- | --- | --- |
| St. George, Utah (w1, d7ade2c86c86c37a) | 629 | 600 | 4 | 4.63 | 4.64 |
| Voltaire, North Dakota (w2, f95408f7ad33b557) | 588 | 285 | 4 | 3.64 | 3.10 |
| Trappe, Maryland (w3, a4e8434ee9da4630) | 691 | 600 | 4 | 4.35 | 4.39 |

### Row 5: a filled-in person against the player

**Measured.** Events by kind on the player (aged 17, so not a fair match on work), on full adults and on filled-in counted adults: the kinds are the same few for all three (born, school started three times, partnered, child born, job started and ended, took office). A filled-in adult has no more and no fewer kinds than a full one (4.64 against 4.63 events in St. George; 4.39 against 4.35 in Trappe). Voltaire reads thin for both, 3.64 and 3.10, because few have any work.

**What the card lacks is work.** The share of adults with no work spell at all is 78 to 99 percent: St. George 85 percent of full adults and 79 percent of filled-in; Voltaire 95 and 99; Trappe 88 and 81. Of those, in St. George 94 of 629 full adults and 129 of 600 filled-in have any spell. So the card of a person the player clicks reads thin because most adults have no working life to tell, not because a filled-in person is built differently from a full one. This settles row 5: the "player against filled-in" difference is not in the reader or the fill-in; it is the work pass, which is rows 12 and 13.

### Row 12: seven employers in fifteen years

**Measured.** Among adults who have any spell, spells per person (the window's past work, counted per person):

| Place | Group | Have any spell | Median spells (of those) | Mean | 7 or more | Most |
| --- | --- | --- | --- | --- | --- | --- |
| St. George | full | 94 of 629 | 7 | 7.87 | 50 | 32 |
| St. George | filled in | 129 of 600 | 5 | 6.28 | 46 | 20 |
| Voltaire | full | 30 of 588 | 4 | 4.73 | 6 | 10 |
| Voltaire | filled in | 3 of 285 | 6 | 4.33 | 0 | 6 |
| Trappe | full | 84 of 691 | 6 | 6.46 | 34 | 19 |
| Trappe | filled in | 111 of 600 | 5 | 6.25 | 41 | 22 |
| Kaibito | full | 77 of 606 | 6 | 6.73 | 32 | 27 |
| Kaibito | filled in | 130 of 600 | 6 | 7.19 | 55 | 34 |
| Kingston, RI | full | 56 of 612 | 5 | 5.0 | 13 | 13 |
| Kingston, RI | filled in | 68 of 600 | 2 | 2.53 | 5 | 14 |

So the sheet's seven in fifteen years is the middle of the range, not an outlier: a worker who has any past work has a median of 5 to 7 spells.

Completed-spell median years against the BLS median tenure (Employee Tenure in 2026, `TOWN_MEDIAN_TENURE_BY_AGE`) by age band. The spells run shorter than the table for every band from 35 up. Examples, St. George full adults: ages 35 to 44, 2.18 years against 4.7; 45 to 54, 2.95 against 7.0; 55 to 64, 2.0 against 9.6. Kaibito filled-in adults, 55 to 64: 2.0 against 9.6. Trappe full adults, 55 to 64: 3.91 against 9.6 is the closest. (The table is a tenure of the job held, which is longer than a completed spell by design; the gap is what the sheet's "many short spells" cause names.)

Names: the same few employers carry the work. St. George full adults: James's, Alvarez's and Puckett's Markets hold 153, 133 and 114 of 743 spells (55 percent), with Carey's and Yarbrough's Kitchen another 129. Kaibito: McKenzie's Kitchen 113 and 202 (full, filled), Snow Building Services 76 and 140, McCarthy's Kitchen 55 and 91. A town of 17 to 25 employers is walked through by one person's seven spells. The rule is the sheet's cause (`hire` visits a firm not yet worked for before repeating).

**Result.** Cause confirmed by measurement: median 5 to 7 spells for those with a past, completed spells at 1.4 to 3 years against a tenure table of 3 to 9.6, and the top three or five firms hold most spells in every town.

### Row 13: a re-hire spell with no employer

**Measured.** Spells with no `organizationId`, across the same five worlds:

| Place | Spells with no employer | Of all spells | People | How they began |
| --- | --- | --- | --- | --- |
| St. George | 0 | 0 of 1,207 | 0 | none |
| Voltaire | 0 | 0 of 3 hundred-odd | 0 | none |
| Trappe | 0 | 0 | 0 | none |
| Kingston, RI (e41b9d02a7c35f18) | 2 | about 0.4 percent | 1 (aged 53) | one first job (1994), one "after-out-of-work" (1997), both ended "let-go" |
| Kaibito (7c1e5a90b3d24f68) | 3 | about 0.2 percent | 1 (aged 43) | first job (2004), "after-out-of-work" (2012), "after-out-of-work" (2018) |

In both worlds the spells' place is **not** the person's home place today (`placeIsHome` false): the person lived in a place with no recorded business when they worked. That is the header's own "someone whose town has no business on record" case. It confirms the cause in the sheet. **It is rare: one person in about 1,200 adults, 0.2 to 0.4 percent of spells, and none in three of five towns.** So it will be seen on the Journal of an adult who came from elsewhere, not of a town-born one. The "found work again in Kingston" line is this case.

### Row 14: a parent's card repeats the child's employers

**Measured.** Child and parent pairs where both have at least one spell, taken from the `family:parent` facts (counted parents are filled in): the share of the child's employers that the parent also names, against each adult paired with an unrelated adult of the same town.

| Place | Parent-child pairs found | Both with work | Child's employers also the parent's (mean) | Pairs over half | Unrelated adults (mean) |
| --- | --- | --- | --- | --- | --- |
| St. George | 38 | 8 | 59% | 4 | 52% |
| Voltaire | 12 | 2 | 73% | 2 | 64% |
| Trappe | 33 | 9 | 54% | 4 | 57% |
| Kingston, RI | 44 | 6 | 69% | 5 | 39% |
| Kaibito | 33 | 8 | 62% | 6 | 50% |

The overlap with a parent is high (54 to 73 percent), but so is the overlap with a stranger (39 to 64 percent), and in two towns the stranger's is higher or equal. So the repetition is the town's: all adults draw the same few employers. It is not a family effect (and the sheet's "mother repeats the player" is the same cause as row 12). The sample of pairs is small (2 to 9 a town, 33 in all), because most adults have no past work (row 5). Ordering: fixing row 12 (employer by size, fit and referral) fixes this one; it needs no separate change.
