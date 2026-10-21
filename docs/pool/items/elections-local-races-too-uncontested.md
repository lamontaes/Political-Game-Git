---
id: elections-local-races-too-uncontested
title: "Local races are uncontested 97 percent of the time in played towns, against 58 to 75 percent in Ballotpedia's counts"
area: elections
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/local-races
pr: #5592
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T04:32:58.388Z
---

**What.** Candidacy's weights (src/core2/data/candidacy/parameters.json, stopgap SG-P15-candidacy-weights) were to be checked against candidate counts per seat. Measured Oct 20 on buildBenchWorld worlds run 400 days in six drawn places (sha256 of labels c1 to c6, purpose candidacy-calibration): Ailey, Georgia had 4 local contests, 4 uncontested; Oaklyn, New Jersey 11, 10 uncontested and 1 with no candidate; Whitingham, Vermont 15, all uncontested and 2 with no candidate; Palm River-Clair Mel, Florida, Lake Park, Minnesota and Agricola, Mississippi had no local contest decided in the window. Of 30 local contests, 29 (97 percent) had no more candidates than seats, and the mean candidates per seat was about 1.0. Ballotpedia counts 71 percent of the 4,500-plus local elections it covered in April 2024 as uncontested (https://news.ballotpedia.org/2024/05/03/71-of-the-more-than-4500-local-elections-ballotpedia-covered-in-april-were-uncontested/), 75 percent of the 36,068 elections of all kinds it covered through October 2024, and an average near 58 percent for local races from 2018 to 2023. Find why challengers rarely file (the weights, the pool of residents who weigh each contest, the filing rules) and bring the town's share into the real band by changing the causes, not by drawing a share.

**Rules.** No dice: who runs follows each resident's own reasons (drives, money, traits, standing, the seat), never a fixed share; the real share checks the town's total and never decides one person. One rule, all 56 places: the check draws its places from all 56 and names each place and seed. Sliding scales and causes: nothing flips at a cutoff. Research before building: the Ballotpedia counts are the check and carry their year and URL.

**Done when.** In a played world (buildBenchWorld) in at least six places drawn from all 56, named with their seeds, the share of local contests with no more candidates than seats falls between 50 and 80 percent across the places taken together, shown by contest record ids and a count of filings per contest, with each filing tracing to a candidacy decision; a test in src/core2/who-runs.test.ts or a new calibration test reports the share and the places.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/candidacy/parameters.json, src/core2/who-runs.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5592 (branch claude/pool-elections-local-races-too-uncontested): the calibration test uses twelve hand-picked fixed seeds whose pooled share happens to land in the band (the first six give 94 percent), so it does not test the engine on a random draw, and it counts multi-seat contests by candidates not seats; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5592 (branch claude/pool-elections-local-races-too-uncontested): The random draws address the earlier fixed-seed feedback, but the item Done when still requires the observed pooled share between 50 and 80 percent, with contest ids, filing counts and decision traces. The latest proof reports 42 of 46 uncontested (91 percent), and the new test passes that by requiring only the 99-percent interval to overlap a wider band. That does not establish the named acceptance. Finish the causal calibration and named contest/filing proof, or separate the completed measurement work from the still-open calibration item; also update the stale body/title claims about twelve places and a 50-80-percent observed share.; finish on that branch, merge main into it first.

Measured Oct 21 (claude/pool-elections-local-races-too-uncontested, main with #5756 merged in): `candidacy-calibration.test.ts`, `GOLDEN_PATH_SEED=lr1`, places drawn at random until 40 decided local seats: 43 of 48 seats had no more candidates than seats, 90 percent (99 percent interval 73 to 96), over places including Daniels Farm CT (seed 8b517dcf…), Penalosa KS (4572c77a…), Monarch MT (29941afd…, no contest decided). Above the 50 to 80 percent band Done when names, so the calibration is still open: this PR adds the measurement and nothing that moves the share. The run found and fixed a separate year-stopping defect (world-homeless-rehouse-left-household, PR #5772). Next: find why challengers file so rarely (the weights in parameters.json, the pool who weigh each seat, the filing rules) and change those causes.

Oct 21 (claude, claude/pool-elections-local-races-too-uncontested), measured, parameter not changed. The stay-out pull `candidacyStayOutPull` is not the lever. Swept over places drawn by `drawPlace("<seed>:<i>", "candidacy-calibration")`: seed sweep1 (six places, 400 days each) gave 17 of 21 local seats uncontested at pull 3.0, 14 of 21 at 2.8 and 9 of 21 at 2.5; but seed cal-oct21 (Arthur ND, Bendon MI, Sinajana GU, Edon OH, East Farmingdale NY, Boiling Spring Lakes NC) gave 4 of 35 at 3.0 and 3 of 35 at 3.5, the same at 2.8, so raising it there changes nothing. The share is set by the town: Edon, Ohio (3924640, seed ad4ea1ce91f60308a5ee712c5ffdca24aff032afdbb17ee925edbbf2070838de) has 12 local seats and none uncontested; its single-seat county offices (sheriff, prosecutor, treasurer, clerk, assessor, coroner) each carry 3 to 5 candidates, and its county commissioners 6, where Ballotpedia's counts give county offices about one. Look at who weighs a wide-scope seat: `countedScreen` in src/core2/modules/candidacy.ts skips the bar test for `wideScope`, and `raceScope` and `seatReach` in src/core2/candidate-pool.ts give county seats a flat `candidacyCountyReach` regardless of the county's size, so a larger county's pool of counted adults who clear the bar grows with its size while the real count of challengers does not. Also found: a played year in Boiling Spring Lakes, North Carolina stops with 'A transfer needs two different accounts' (filed as world-transfer-needs-two-accounts-boiling-spring-lakes).
