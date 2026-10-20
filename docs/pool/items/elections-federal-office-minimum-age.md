---
id: elections-federal-office-minimum-age
title: "An 18-year-old can file for U.S. Senator and President: both are checked against the state's statewide-office age, not the Constitution's 30 and 35"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/federal-office-age
pr: #5047
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T08:16:53.787Z
---

**What.** The filing rules treat U.S. Senator and President as statewide executive offices, so each is checked against the state's age for its own statewide offices: 18 in California, Massachusetts, Ohio, Rhode Island, South Dakota, Vermont, Washington, Wisconsin and D.C. The player, who is 18 on day one of the path, can file for either and the filing office accepts it. The Constitution sets 30 for the Senate and 35 for the presidency, which no state can lower. A candidate for those offices now meets the larger of the state's age and the Constitution's, and the check cites the clause.

**Rules.** Wire to the world: the filing check, the clerk's counter and the candidates the world puts up all read the same rule. One rule, all 56 places: the floor is a data row keyed by office, never a named place. Estimate, never UNKNOWN: the floor is a sourced figure with its clause, not an estimate.

**Done when.** In the played world (`buildBenchWorld`, a place drawn from all 56 with the seed named, Enumclaw, Washington with seed g0 among them) every U.S. Senator and presidential contest shows a minimum-age check of at least 30 and 35 that the 17-year-old player does not meet, and `src/core2/federal-office-age.test.ts` states it and fails on main.

**Files.** src/core2/modules/elections.ts, src/core2/data/elections/federal-qualifications.json

**Notes.** Found Oct 18 (claude/federal-office-age) running `src/bench/path-check.ts` in Carolina, Rhode Island (seed pc5): the 18-year-old filed for U.S. Senator and was on the ballot. The governor's and other statewide offices keep the state's own ages (Rhode Island's is 18). The office family `statewideExecutive` still covers Senate and President for the state's filing office and deadlines; only the age floor is separate. The Constitution's other requirements (citizenship years) are not checked.
